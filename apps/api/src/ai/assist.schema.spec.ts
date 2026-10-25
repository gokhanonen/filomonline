import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { AssistOutput, AssistOutputSchema, assistOptions, normalizeAssist } from "./assist.schema";

type Person = NonNullable<AssistOutput["person"]>;

const base: AssistOutput = {
  documents: [],
  recommended: "NONE",
  reason: "",
  summary: "",
  person: null,
  vehicle: null,
  filter: null,
  answer: null,
  warnings: [],
};

const person: Person = {
  tckn: "12345678901", firstName: "Ahmet", lastName: "Yılmaz", birthDate: null, birthPlace: null, gender: null,
  fatherName: null, motherName: null, documentNo: null, licenseClasses: "B", validUntil: null,
  address: null, city: null, district: null, phone: null, email: null,
};

const vehicle = {
  plate: "34 ABC 123", brand: "VW", model: "Passat", registrationModel: null, modelYear: 2021, vin: null, engineNo: null,
  color: null, fuelType: null, transmission: null, bodyType: null, driveType: null, engineVolume: null, horsePower: null,
  enginePower: null, registrationDate: null, firstRegistrationDate: null, ownerName: null, ownerIdNo: null, inferred: [],
};

describe("assistOptions", () => {
  it("kişi için potansiyel + müşteri, önerilen başta", () => {
    expect(assistOptions({ ...base, person, recommended: "CUSTOMER" })).toEqual(["CUSTOMER", "LEAD"]);
    expect(assistOptions({ ...base, person, recommended: "LEAD" })).toEqual(["LEAD", "CUSTOMER"]);
  });

  it("ruhsat + ehliyet birlikte: üç seçenek", () => {
    expect(assistOptions({ ...base, person, vehicle, recommended: "VEHICLE" })).toEqual(["VEHICLE", "LEAD", "CUSTOMER"]);
  });

  it("boş kişi kaydı seçenek üretmez; veride olmayan öneri yok sayılır", () => {
    const empty = Object.fromEntries(Object.keys(person).map((k) => [k, null])) as unknown as Person;
    expect(assistOptions({ ...base, person: empty, recommended: "LEAD" })).toEqual([]);
    expect(assistOptions({ ...base, vehicle, recommended: "CUSTOMER" })).toEqual(["VEHICLE"]);
  });
});

describe("AssistOutputSchema", () => {
  it("structured outputs şemasına dönüşür (tüm nesneler kapalı)", () => {
    const format = zodOutputFormat(AssistOutputSchema);
    const json = JSON.stringify(format);
    expect(json).toContain('"additionalProperties":false');
    expect(json).not.toMatch(/"(minLength|maxLength|minimum|maximum)"/);
  });

  it("API limiti: nullable/union alan sayısı 16'yı aşmaz", () => {
    const json = JSON.stringify(zodOutputFormat(AssistOutputSchema));
    const unions = (json.match(/"anyOf"/g) ?? []).length + (json.match(/"type":\[/g) ?? []).length;
    expect(unions).toBeLessThanOrEqual(16);
  });

  it("normalizeAssist boş değerleri null'a çevirir", () => {
    const out = normalizeAssist({
      documents: [], recommended: "LEAD", reason: "", summary: "", warnings: [], answer: " ",
      hasPerson: true,
      person: { tckn: "", firstName: "Ahmet", lastName: "Yılmaz", birthDate: "", birthPlace: "", gender: "BILINMIYOR",
        fatherName: "", motherName: "", documentNo: "", licenseClasses: "", validUntil: "", address: "", city: "", district: "",
        phone: "5321112233", email: "" },
      hasVehicle: false,
      vehicle: { plate: "x", brand: "", model: "", registrationModel: "", modelYear: 0, vin: "", engineNo: "", color: "",
        fuelType: "BILINMIYOR", transmission: "BILINMIYOR", bodyType: "BILINMIYOR", driveType: "BILINMIYOR", engineVolume: 0,
        horsePower: 0, enginePower: 0, registrationDate: "", firstRegistrationDate: "", ownerName: "", ownerIdNo: "", inferred: [] },
      hasFilter: false,
      filter: { query: "", minPrice: 0, maxPrice: 0, minYear: 0, maxYear: 0, transmission: "BILINMIYOR", fuelType: "BILINMIYOR" },
    });
    expect(out.person?.firstName).toBe("Ahmet");
    expect(out.person?.tckn).toBeNull();
    expect(out.person?.gender).toBeNull();
    expect(out.vehicle).toBeNull();
    expect(out.filter).toBeNull();
    expect(out.answer).toBeNull();
  });
});
