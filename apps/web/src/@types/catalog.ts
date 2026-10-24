export interface CatalogModel {
  id: string;
  name: string;
  brandId: string;
}

export interface CatalogBrand {
  id: string;
  name: string;
  categoryId?: string | null;
  category?: { id: string; name: string } | null;
  models: CatalogModel[];
}

export interface SimpleCatalog {
  id: string;
  name: string;
  hex?: string | null;
}

/** İlan kaynağı (Sahibinden, Arabam, DOD...) — tenant seviyesinde */
export interface ListingSource {
  id: string;
  label: string;
  domainLink?: string | null;
  iconUrl?: string | null;
  sortOrder: number;
}

export interface CatalogAll {
  brands: CatalogBrand[];
  colors: SimpleCatalog[];
  bodyTypes: SimpleCatalog[];
  vehicleTypes: SimpleCatalog[];
  vehicleCategories: SimpleCatalog[];
  listingSources: ListingSource[];
}

/** Link verilen URL'i kaynağa eşle (listingSourceId yoksa alan adından) */
export function matchListingSource(
  url: string,
  sources: ListingSource[],
  listingSourceId?: string | null,
): ListingSource | undefined {
  if (listingSourceId) {
    const byId = sources.find((s) => s.id === listingSourceId);
    if (byId) return byId;
  }
  let host = "";
  try {
    host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return undefined;
  }
  return sources.find((s) => s.domainLink && host.endsWith(s.domainLink.toLowerCase()));
}

/** Kaynak ikonu: tanımlı iconUrl yoksa alan adının favicon'u */
export function listingSourceIcon(s?: ListingSource | null): string | null {
  if (!s) return null;
  if (s.iconUrl) return s.iconUrl;
  if (s.domainLink) return `https://www.google.com/s2/favicons?domain=${s.domainLink}&sz=64`;
  return null;
}
