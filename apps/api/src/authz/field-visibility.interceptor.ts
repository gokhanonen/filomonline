import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Observable, map } from "rxjs";
import { AuthUser } from "../auth/auth.types";
import { SCOPE_FIELDS, VISIBILITY_SKIP_PREFIXES } from "./permission-catalog";

/**
 * Hassas-veri scope'una sahip OLMAYAN kullanıcılar için ilgili alanları API
 * yanıtından çıkarır (gerçek sunucu-tarafı gizleme; UI gizlemesinden bağımsız).
 * Admin / süper admin tüm scope'lara sahiptir → hiçbir şey çıkarılmaz.
 */
@Injectable()
export class FieldVisibilityInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const user = req?.user as AuthUser | undefined;

    // Kimliksiz (public) ya da tam yetkili → dokunma.
    if (!user || user.isSuperAdmin || user.isCompanyAdmin) {
      return next.handle();
    }
    const owned = new Set(user.permissions ?? []);
    if (owned.has("*")) return next.handle();

    // Belirli yol önekleri (auth, users, credits, …) gizlemeden muaf.
    const seg = firstPathSegment(req?.originalUrl ?? req?.url ?? "");
    if (VISIBILITY_SKIP_PREFIXES.includes(seg)) return next.handle();

    // Sahip OLUNMAYAN scope'ların alanlarını topla.
    const strip = new Set<string>();
    for (const [scope, fields] of Object.entries(SCOPE_FIELDS)) {
      if (!owned.has(scope)) fields.forEach((f) => strip.add(f));
    }
    if (strip.size === 0) return next.handle();

    return next.handle().pipe(map((data) => stripFields(data, strip)));
  }
}

/** /api/v1/vehicles?x=1 → "vehicles" */
function firstPathSegment(url: string): string {
  const path = url.split("?")[0];
  const parts = path.split("/").filter(Boolean);
  // global prefix "api/v1" atlanır
  const idx = parts[0] === "api" ? (parts[1] === "v1" ? 2 : 1) : 0;
  return parts[idx] ?? "";
}

export function stripFields(data: unknown, strip: Set<string>, depth = 0): unknown {
  if (data == null || depth > 8) return data;
  if (Array.isArray(data)) return data.map((d) => stripFields(d, strip, depth + 1));
  if (typeof data === "object") {
    // Decimal/Date gibi özel nesnelere girme (sadece düz nesneleri gez).
    const proto = Object.getPrototypeOf(data);
    if (proto !== Object.prototype && proto !== null) return data;
    for (const key of Object.keys(data as Record<string, unknown>)) {
      if (strip.has(key)) {
        delete (data as Record<string, unknown>)[key];
      } else {
        (data as Record<string, unknown>)[key] = stripFields(
          (data as Record<string, unknown>)[key],
          strip,
          depth + 1,
        );
      }
    }
  }
  return data;
}
