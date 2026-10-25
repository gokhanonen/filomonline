import type { CatalogAll, SimpleCatalog } from "@/@types/catalog";

/** AI'ın verdiği kasa kodu → katalogdaki kasa tipi adı */
const BODY_TYPE_NAMES: Record<string, string[]> = {
  SEDAN: ["sedan"],
  HATCHBACK: ["hatchback", "hb"],
  STATION_WAGON: ["station wagon", "sw", "avant", "variant", "touring"],
  SUV: ["suv", "arazi"],
  COUPE: ["coupe", "kupe"],
  CABRIO: ["cabrio", "cabriolet", "üstü açık"],
  MINIVAN: ["minivan", "mpv"],
  TICARI: ["ticari", "panelvan", "kamyonet", "pick-up", "pickup"],
};

const norm = (s: string) => s.toLocaleLowerCase("tr-TR").replace(/\s+/g, " ").trim();

/** Marka/model adından katalog kimlikleri (birebir ya da metin içinde geçen) */
export function matchBrandModel(catalog: CatalogAll | null | undefined, brand?: string | null, model?: string | null) {
  if (!catalog || !brand) return {};
  const b = norm(brand);
  const brandObj = catalog.brands.find((x) => norm(x.name) === b) ?? catalog.brands.find((x) => b.includes(norm(x.name)));
  if (!brandObj) return {};
  if (!model || !brandObj.models?.length) return { brandId: brandObj.id };
  const m = norm(model);
  // En uzun eşleşen model adını seç ("A6 Avant" > "A6")
  const modelObj =
    brandObj.models.find((x) => norm(x.name) === m) ??
    [...brandObj.models].sort((a, z) => z.name.length - a.name.length).find((x) => m.includes(norm(x.name)));
  return { brandId: brandObj.id, modelId: modelObj?.id };
}

export function matchBodyType(bodyTypes: SimpleCatalog[] | undefined, code?: string | null) {
  if (!bodyTypes?.length || !code) return undefined;
  const names = BODY_TYPE_NAMES[code] ?? [norm(code)];
  return bodyTypes.find((bt) => names.some((n) => norm(bt.name) === n || norm(bt.name).includes(n)))?.id;
}

export function matchColor(colors: SimpleCatalog[] | undefined, name?: string | null) {
  if (!colors?.length || !name) return undefined;
  const c = norm(name);
  return (colors.find((x) => norm(x.name) === c) ?? colors.find((x) => norm(x.name).includes(c) || c.includes(norm(x.name))))?.id;
}

/** "inferred" alan adlarının Türkçe karşılıkları (uyarı metinleri için) */
export const INFERRED_FIELD_LABEL: Record<string, string> = {
  transmission: "vites",
  bodyType: "kasa tipi",
  driveType: "çekiş",
  horsePower: "motor gücü (HP)",
  enginePower: "motor gücü (kW)",
  engineVolume: "motor hacmi",
  fuelType: "yakıt",
  color: "renk",
  modelYear: "model yılı",
};
