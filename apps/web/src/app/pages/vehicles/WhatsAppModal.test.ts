import { describe, expect, it } from "vitest";
import { buildWhatsAppMessage, normalizePhone } from "./WhatsAppModal";
import type { Vehicle } from "@/@types/vehicle";

describe("normalizePhone", () => {
  it("0 ile başlayan 11 haneli numarayı 90'lı hale getirir", () => {
    expect(normalizePhone("0532 123 45 67")).toBe("905321234567");
  });
  it("5 ile başlayan 10 haneliyi 90 ile öne ekler", () => {
    expect(normalizePhone("532-123-45-67")).toBe("905321234567");
  });
  it("+90 ile geleni olduğu gibi bırakır", () => {
    expect(normalizePhone("+90 532 123 45 67")).toBe("905321234567");
  });
  it("00 ile uluslararası öneki kırpar", () => {
    expect(normalizePhone("0090 532 123 45 67")).toBe("905321234567");
  });
});

describe("buildWhatsAppMessage", () => {
  const base: Vehicle = {
    id: "v1",
    companyId: "c1",
    status: "STOKTA",
    isActive: true,
    plate: "34 ABC 123",
    brandName: "Volkswagen",
    modelName: "Golf",
    year: 2024,
    km: 12500,
    fuelType: "BENZIN",
    transmission: "OTOMATIK",
    horsePower: 150,
    engineVolume: 1500,
    warranty: true,
    heavyDamage: false,
    spareKey: true,
    listPrice: "2210000",
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
    listingUrls: [{ id: "u", vehicleId: "v1", url: "https://x.com/ilan", createdAt: "" }],
    tramerSet: [{ id: "t", date: "", amount: "15000", description: "" }],
  };

  it("fiyat, km, teknik bilgi, garanti ve ilan linkini içerir", () => {
    const m = buildWhatsAppMessage(base);
    expect(m).toContain("Volkswagen Golf (34 ABC 123)");
    expect(m).toContain("Fiyat: 2.210.000 TL");
    expect(m).toContain("KM: 12.500");
    expect(m).toContain("Tramer: 15.000 TL");
    expect(m).toContain("Yakıt: Benzin");
    expect(m).toContain("Vites: Otomatik");
    expect(m).toContain("Yedek Anahtar: Var");
    expect(m).toContain("Garanti: Garanti Dahilinde");
    expect(m).toContain("İlan Linki: https://x.com/ilan");
  });

  it("tramer ve link yoksa 'Tramer: Yok' yazar, link satırı eklemez", () => {
    const m = buildWhatsAppMessage({ ...base, tramerSet: [], listingUrls: [], warranty: false });
    expect(m).toContain("Tramer: Yok");
    expect(m).not.toContain("İlan Linki");
    expect(m).not.toContain("Garanti:");
  });
});
