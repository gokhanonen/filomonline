import { createHmac, timingSafeEqual } from "crypto";

/**
 * Public demo-evrak uçları (`/documents/thumb/:id`, `/view/:id`) kimlik doğrulaması
 * gerektirmez (arayüzde <img>/<iframe> ile yüklenir). Enumerasyonu (başka firmaların
 * id'lerini deneyerek veri sızdırma) önlemek için URL'ler bir imza (HMAC) taşır;
 * sunucu imzayı doğrulamadan içeriği üretmez. Tahmin edilemez, kısa ve URL-güvenli.
 */
const SECRET =
  process.env.DOC_SIGN_SECRET || process.env.JWT_ACCESS_SECRET || "filom-doc-sign-dev-secret";

export function signDocId(id: string): string {
  return createHmac("sha256", SECRET).update(id).digest("base64url").slice(0, 24);
}

export function verifyDocSig(id: string, sig?: string): boolean {
  if (!sig || typeof sig !== "string") return false;
  const expected = signDocId(id);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
