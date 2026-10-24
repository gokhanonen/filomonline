import axios from "@/utils/axios";
import type {
  CatalogAll,
  CatalogBrand,
  CatalogModel,
  ListingSource,
  SimpleCatalog,
} from "@/@types/catalog";

// --- İlan kaynakları ---
export async function listListingSources(): Promise<ListingSource[]> {
  const { data } = await axios.get<ListingSource[]>("/catalog/listing-sources");
  return data;
}
export async function createListingSource(values: {
  label: string;
  domainLink?: string;
  iconUrl?: string;
}): Promise<ListingSource> {
  const { data } = await axios.post<ListingSource>("/catalog/listing-sources", values);
  return data;
}
export async function updateListingSource(
  id: string,
  values: { label?: string; domainLink?: string; iconUrl?: string },
): Promise<ListingSource> {
  const { data } = await axios.patch<ListingSource>(`/catalog/listing-sources/${id}`, values);
  return data;
}
export async function removeListingSource(id: string) {
  await axios.delete(`/catalog/listing-sources/${id}`);
}

export async function getCatalog(): Promise<CatalogAll> {
  const { data } = await axios.get<CatalogAll>("/catalog");
  return data;
}

// --- Yönetim (admin) ---
export type SimpleEntitySlug =
  | "colors"
  | "body-types"
  | "vehicle-types"
  | "vehicle-categories";

export async function listSimple(slug: SimpleEntitySlug): Promise<SimpleCatalog[]> {
  const { data } = await axios.get<SimpleCatalog[]>(`/catalog/${slug}`);
  return data;
}
export async function createSimple(slug: SimpleEntitySlug, name: string, hex?: string) {
  const { data } = await axios.post<SimpleCatalog>(`/catalog/${slug}`, { name, hex });
  return data;
}
export async function updateSimple(slug: SimpleEntitySlug, id: string, name: string, hex?: string) {
  const { data } = await axios.patch<SimpleCatalog>(`/catalog/${slug}/${id}`, { name, hex });
  return data;
}
export async function removeSimple(slug: SimpleEntitySlug, id: string) {
  await axios.delete(`/catalog/${slug}/${id}`);
}

export async function listBrands(categoryId?: string): Promise<CatalogBrand[]> {
  const { data } = await axios.get<CatalogBrand[]>("/catalog/brands", {
    params: categoryId ? { categoryId } : undefined,
  });
  return data;
}
export async function createBrand(name: string, categoryId?: string) {
  const { data } = await axios.post<CatalogBrand>("/catalog/brands", { name, categoryId });
  return data;
}
export async function updateBrand(
  id: string,
  values: { name?: string; categoryId?: string | null },
): Promise<CatalogBrand> {
  const { data } = await axios.patch<CatalogBrand>(`/catalog/brands/${id}`, values);
  return data;
}

export async function removeBrand(id: string) {
  await axios.delete(`/catalog/brands/${id}`);
}
export async function createModel(brandId: string, name: string) {
  const { data } = await axios.post<CatalogModel>("/catalog/models", { brandId, name });
  return data;
}
export async function removeModel(id: string) {
  await axios.delete(`/catalog/models/${id}`);
}
