/**
 * Ayar JSON'larındaki gizli alanlar (apiKey, password, secret, token) okunurken
 * maskelenir; istemci maskeli değeri geri gönderirse DB'deki gerçek değer korunur.
 */
export const MASK_PREFIX = "••••";
const SECRET_KEY = /(apikey|api_key|password|secret|token)/i;

export function isSecretKey(key: string): boolean {
  return SECRET_KEY.test(key);
}

export function maskValue(v: string): string {
  if (!v) return "";
  return MASK_PREFIX + v.slice(-4);
}

export function isMasked(v: unknown): boolean {
  return typeof v === "string" && v.startsWith(MASK_PREFIX);
}

/** Derin maskeleme (nesne/dizi içinde gizli anahtarları bulur) */
export function maskSecrets<T>(value: T): T {
  if (Array.isArray(value)) return value.map((x) => maskSecrets(x)) as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = isSecretKey(k) && typeof v === "string" ? maskValue(v) : maskSecrets(v);
    }
    return out as T;
  }
  return value;
}

/**
 * Gelen değerdeki maskeli gizli alanları mevcut (DB) değerle değiştirir.
 * Mevcut değer yoksa maskeli string olduğu gibi kalmaz; boş string yazılır.
 */
export function mergeSecrets<T>(incoming: T, existing: unknown): T {
  if (Array.isArray(incoming)) {
    const ex = Array.isArray(existing) ? existing : [];
    return incoming.map((x, i) => mergeSecrets(x, ex[i])) as T;
  }
  if (incoming && typeof incoming === "object") {
    const ex = (existing && typeof existing === "object" ? existing : {}) as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(incoming as Record<string, unknown>)) {
      if (isSecretKey(k) && isMasked(v)) {
        out[k] = typeof ex[k] === "string" ? ex[k] : "";
      } else {
        out[k] = mergeSecrets(v, ex[k]);
      }
    }
    return out as T;
  }
  return incoming;
}
