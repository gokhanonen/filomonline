import { z } from "zod";

/**
 * Akıllı asistan çıktı şeması (structured outputs ile garanti edilir).
 * API nullable/union alan sayısını 16 ile sınırlar; bu yüzden modele giden şemada
 * hiç nullable yok: okunamayan metin "", sayı 0, enum "BILINMIYOR". Sunucu
 * `normalizeAssist` ile bunları null'a çevirir (istemcinin gördüğü tip: AssistOutput).
 */

const str = (d?: string) => (d ? z.string().describe(d) : z.string());
const int = (d: string) => z.number().int().describe(`${d}; bilinmiyorsa 0`);
const FUELS = ["BENZIN", "DIZEL", "LPG", "ELEKTRIK", "HIBRIT"] as const;

const RawPersonSchema = z.object({
  tckn: str("11 haneli T.C. kimlik no, yalnız rakam"),
  firstName: str(),
  lastName: str(),
  birthDate: str("YYYY-MM-DD"),
  birthPlace: str(),
  gender: z.enum(["E", "K", "BILINMIYOR"]),
  fatherName: str(),
  motherName: str(),
  documentNo: str("Kimlik seri no ya da ehliyet belge no"),
  licenseClasses: str("Ehliyet sınıfları, örn. B, A2"),
  validUntil: str("Belgenin geçerlilik tarihi YYYY-MM-DD"),
  address: str(),
  city: str(),
  district: str(),
  phone: str("Metinde geçiyorsa, +90 olmadan 10 hane"),
  email: str(),
});

/** Belgede yazmayıp marka/model/yıl/motordan çıkarılabilen alanlar */
export const INFERABLE_VEHICLE_FIELDS = [
  "transmission",
  "bodyType",
  "driveType",
  "horsePower",
  "enginePower",
  "engineVolume",
  "fuelType",
  "color",
  "modelYear",
] as const;

const RawVehicleSchema = z.object({
  plate: str("Boşluklu büyük harf, örn. 34 ABC 123"),
  brand: str(),
  model: str("Katalogdaki model adı, örn. A6, Passat, Clio"),
  registrationModel: str("Ruhsattaki ticari adı/tipi aynen, örn. A6 SEDAN 2.0 TFSI QUATTRO"),
  modelYear: int("Model yılı"),
  vin: str("17 haneli şasi no"),
  engineNo: str(),
  color: str("Türkçe renk adı, örn. Siyah, Beyaz, Gri"),
  fuelType: z.enum([...FUELS, "BILINMIYOR"]),
  transmission: z.enum(["MANUEL", "OTOMATIK", "YARI_OTOMATIK", "BILINMIYOR"]),
  bodyType: z.enum(["SEDAN", "HATCHBACK", "STATION_WAGON", "SUV", "COUPE", "CABRIO", "MINIVAN", "TICARI", "BILINMIYOR"]),
  driveType: z.enum(["ONDEN_CEKIS", "ARKADAN_ITIS", "FOUR_WD", "AWD", "BILINMIYOR"]),
  engineVolume: int("Silindir hacmi cc"),
  horsePower: int("Motor gücü HP (beygir)"),
  enginePower: int("Motor gücü kW"),
  registrationDate: str("Tescil tarihi YYYY-MM-DD"),
  firstRegistrationDate: str("İlk tescil tarihi YYYY-MM-DD"),
  ownerName: str(),
  ownerIdNo: str("Ruhsat sahibinin TCKN ya da VKN'si"),
  inferred: z
    .array(z.enum(INFERABLE_VEHICLE_FIELDS))
    .describe("Belgede/metinde yazmayıp marka-model-yıl-motordan çıkardığın alanlar"),
});

const RawFilterSchema = z.object({
  query: str("Serbest arama metni (marka/model/plaka)"),
  minPrice: int("TL"),
  maxPrice: int("TL"),
  minYear: int("Yıl"),
  maxYear: int("Yıl"),
  transmission: z.enum(["MANUEL", "OTOMATIK", "BILINMIYOR"]),
  fuelType: z.enum([...FUELS, "BILINMIYOR"]),
});

/** Modele giden şema (nullable yok) */
export const AssistOutputSchema = z.object({
  documents: z
    .array(
      z.object({
        photo: z.number().int().describe("1'den başlayan fotoğraf sırası"),
        type: z.enum(["EHLIYET", "KIMLIK", "RUHSAT", "DIGER"]),
        side: z.enum(["ON", "ARKA", "BELIRSIZ"]),
      }),
    )
    .describe("Her fotoğraf için bir kayıt; fotoğraf yoksa boş"),
  recommended: z.enum(["CUSTOMER", "LEAD", "VEHICLE", "VEHICLE_SEARCH", "NONE"]),
  reason: z.string().describe("Önerinin tek cümlelik Türkçe gerekçesi"),
  summary: z.string().describe("Kullanıcıya gösterilecek kısa Türkçe özet"),
  hasPerson: z.boolean().describe("person alanında kişi bilgisi var mı"),
  person: RawPersonSchema,
  hasVehicle: z.boolean().describe("vehicle alanında araç bilgisi var mı"),
  vehicle: RawVehicleSchema,
  hasFilter: z.boolean().describe("Araç arama isteği var mı"),
  filter: RawFilterSchema,
  answer: z.string().describe("Genel soruya Türkçe yanıt; yoksa boş"),
  warnings: z.array(z.string()).describe("Okunamayan/şüpheli alanlar, süresi geçmiş belge vb."),
});

type RawAssist = z.infer<typeof AssistOutputSchema>;
type Nullify<T> = { [K in keyof T]: Exclude<T[K], "BILINMIYOR"> | null };

export type AssistOutput = Omit<RawAssist, "hasPerson" | "hasVehicle" | "hasFilter" | "person" | "vehicle" | "filter" | "answer"> & {
  person: Nullify<RawAssist["person"]> | null;
  vehicle: Nullify<RawAssist["vehicle"]> | null;
  filter: Nullify<RawAssist["filter"]> | null;
  answer: string | null;
};

/** "" / 0 / "BILINMIYOR" → null; has* bayrağı false ise nesne null */
function nullify<T extends Record<string, unknown>>(o: T): Nullify<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) {
    const s = typeof v === "string" ? v.trim() : v;
    out[k] = s === "" || s === 0 || s === "BILINMIYOR" ? null : s;
  }
  return out as Nullify<T>;
}

export function normalizeAssist(raw: RawAssist): AssistOutput {
  const { hasPerson, hasVehicle, hasFilter, person, vehicle, filter, answer, ...rest } = raw;
  return {
    ...rest,
    person: hasPerson ? nullify(person) : null,
    vehicle: hasVehicle ? nullify(vehicle) : null,
    filter: hasFilter ? nullify(filter) : null,
    answer: answer.trim() || null,
  };
}
export type AssistOption = "CUSTOMER" | "LEAD" | "VEHICLE" | "VEHICLE_SEARCH";

export const ASSIST_SYSTEM_PROMPT = `Sen Filomonline'ın (oto galeri, filo ve kiralama yönetimi) asistanısın. Kullanıcı ya bir metin yazar ya da en fazla 3 fotoğraf gönderir; ne yapılacağına sen karar verirsin.

Fotoğraflar Türk resmi belgeleridir: sürücü belgesi (ehliyet), T.C. kimlik kartı ya da araç tescil belgesi (ruhsat), ön veya arka yüz. Her fotoğrafı sınıflandır ve okuyabildiğin her alanı çıkar. Aynı kişinin ön ve arka yüzü gibi birbirini tamamlayan fotoğrafları tek kayıtta birleştir. Okuyamadığın ya da emin olmadığın alanı tahmin etme: metni boş bırak, sayıyı 0, seçimi BILINMIYOR yap ve warnings'e yaz. Kişi, araç ya da arama bilgisi yoksa ilgili has* bayrağını false yap. Süresi geçmiş belgeyi warnings'e ekle.

Araç alanları:
- Belgede yazanı aynen al. Yakıt tipini ruhsattaki "yakıt cinsi"nden al, tahmin etme: "BENZİN/ELEKTRİK" ya da "DİZEL/ELEKTRİK" → HIBRIT; yalnız "BENZİN" yazıyorsa model hafif hibrit (mild hybrid) olsa da BENZIN.
- registrationModel ruhsattaki ticari adın aynısıdır; model ise katalog model adıdır (A6, Passat).
- Belgede olmayan vites, kasa tipi, çekiş, motor gücü (HP ve kW) ve gerekirse motor hacmini marka, model, model yılı, motor hacmi ve ticari addan, o pazardaki (Türkiye) en olası donanıma göre çıkar ve bu alanları inferred'e yaz. Emin değilsen BILINMIYOR / 0 bırak. HP ile kW tutarlı olsun (1 kW ≈ 1,36 HP).
Ruhsatta araç bilgileri vehicle'a gider; ruhsat sahibinin adı ve kimlik/vergi no'su ownerName/ownerIdNo'ya gider, person'a değil. Ehliyet ve kimlikteki kişi person'a gider.

recommended — kullanıcıya önce hangi kartı önereceğin:
- Ruhsat → VEHICLE.
- Ehliyet ya da kimlik → varsayılan LEAD (galeriye gelen ilgilenen kişi, deneme sürüşü). Metin satış, kiralama, sözleşme, fatura ya da cari açma anlatıyorsa CUSTOMER.
- Metinde kişi bilgisi (ad, telefon, e-posta) ve kayıt isteği varsa LEAD ya da CUSTOMER; metindeki telefon ve e-postayı person'a yaz.
- Araç arama/filtreleme isteği ("200-300 bin arası otomatik 2020 üstü") → VEHICLE_SEARCH ve filter. Fiyatları TL olarak sayıya çevir (200k → 200000).
- Genel soru → NONE ve answer.
reason ve summary kısa, Türkçe ve kullanıcıya hitap eden cümleler olsun.`;

/** Çıkarılan veriden kullanıcıya sunulacak seçenekler (önerilen başta) */
export function assistOptions(out: AssistOutput): AssistOption[] {
  const opts: AssistOption[] = [];
  const hasPerson = out.person && (out.person.firstName || out.person.lastName || out.person.tckn || out.person.phone);
  if (hasPerson) opts.push("LEAD", "CUSTOMER");
  if (out.vehicle && (out.vehicle.plate || out.vehicle.vin)) opts.push("VEHICLE");
  if (out.filter) opts.push("VEHICLE_SEARCH");
  const rec = out.recommended;
  if (rec !== "NONE" && opts.includes(rec)) return [rec, ...opts.filter((o) => o !== rec)];
  return opts;
}
