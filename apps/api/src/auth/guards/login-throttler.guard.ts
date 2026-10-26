import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from "@nestjs/common";

/**
 * Login'e özel brute-force koruması — GİRİŞ E-POSTASINA göre sayar, IP'ye değil.
 * Böylece ters vekil (nginx/web-server) tüm istekleri aynı IP gibi gösterse de
 * tek bir hesaba yapılan deneme seli sınırlanır; aynı NAT arkasındaki masum
 * kullanıcılar birbirini kilitlemez. Genel IP bazlı sınır zaten global ThrottlerGuard'da.
 *
 * Tek sunucu (PM2 fork) için bellek içi sayaç yeterli; birden çok örneğe geçilirse
 * paylaşımlı depo (Redis) gerekir.
 */
@Injectable()
export class LoginThrottlerGuard implements CanActivate {
  private readonly limit = 8; // pencere başına deneme
  private readonly windowMs = 5 * 60_000; // 5 dakika
  private readonly hits = new Map<string, number[]>();

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const email = String(req?.body?.email ?? "").toLowerCase().trim();
    const key = email ? `email:${email}` : `ip:${req?.ip ?? "unknown"}`;
    const now = Date.now();

    const recent = (this.hits.get(key) ?? []).filter((t) => now - t < this.windowMs);
    if (recent.length >= this.limit) {
      throw new HttpException(
        "Çok fazla giriş denemesi. Lütfen birkaç dakika sonra tekrar deneyin.",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    recent.push(now);
    this.hits.set(key, recent);

    // Basit bellek temizliği: ara sıra süresi dolmuş anahtarları at
    if (this.hits.size > 5000) {
      for (const [k, v] of this.hits) {
        if (v.every((t) => now - t >= this.windowMs)) this.hits.delete(k);
      }
    }
    return true;
  }
}
