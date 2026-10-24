import axios from "@/utils/axios";
import type { Paginated } from "@/@types/common";
import type {
  Vehicle,
  VehicleFormValues,
  VehicleListingUrl,
  VehicleOption,
  VehicleStatus,
} from "@/@types/vehicle";

// --- İlan linkleri ---
export async function listListingUrls(vehicleId: string): Promise<VehicleListingUrl[]> {
  const { data } = await axios.get<VehicleListingUrl[]>(`/vehicles/${vehicleId}/listing-urls`);
  return data;
}
export async function addListingUrl(
  vehicleId: string,
  url: string,
  listingSourceId?: string,
): Promise<VehicleListingUrl[]> {
  const { data } = await axios.post<VehicleListingUrl[]>(
    `/vehicles/${vehicleId}/listing-urls`,
    { url, ...(listingSourceId ? { listingSourceId } : {}) },
  );
  return data;
}
export async function removeListingUrl(vehicleId: string, urlId: string): Promise<void> {
  await axios.delete(`/vehicles/${vehicleId}/listing-urls/${urlId}`);
}

// --- Opsiyon (kapora / rezervasyon) ---
export interface VehicleOptionInput {
  customerId: string;
  validUntil: string; // YYYY-MM-DD
  amount: number;
  note?: string;
}
export async function getActiveOption(vehicleId: string): Promise<VehicleOption | null> {
  const { data } = await axios.get<VehicleOption | null>(`/vehicles/${vehicleId}/options/active`);
  return data ?? null;
}
export async function listOptions(vehicleId: string): Promise<VehicleOption[]> {
  const { data } = await axios.get<VehicleOption[]>(`/vehicles/${vehicleId}/options`);
  return data;
}
export async function createOption(
  vehicleId: string,
  values: VehicleOptionInput,
): Promise<VehicleOption> {
  const { data } = await axios.post<VehicleOption>(`/vehicles/${vehicleId}/options`, values);
  return data;
}
export async function updateOption(
  vehicleId: string,
  optionId: string,
  values: VehicleOptionInput,
): Promise<VehicleOption> {
  const { data } = await axios.patch<VehicleOption>(
    `/vehicles/${vehicleId}/options/${optionId}`,
    values,
  );
  return data;
}
export async function cancelOption(vehicleId: string, optionId: string): Promise<void> {
  await axios.delete(`/vehicles/${vehicleId}/options/${optionId}`);
}

export interface ListVehiclesParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: VehicleStatus;
  onlyActive?: boolean;
}

/** Boş string / NaN alanları temizler (opsiyonel alanlar API'ye gitmesin). */
function clean(values: object): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(values)) {
    if (v === "" || v === undefined || v === null) continue;
    if (typeof v === "number" && Number.isNaN(v)) continue;
    out[k] = v;
  }
  return out;
}

export async function listVehicles(
  params: ListVehiclesParams = {},
): Promise<Paginated<Vehicle>> {
  const { data } = await axios.get<Paginated<Vehicle>>("/vehicles", { params });
  return data;
}

export async function getVehicle(id: string): Promise<Vehicle> {
  const { data } = await axios.get<Vehicle>(`/vehicles/${id}`);
  return data;
}

export async function createVehicle(values: VehicleFormValues): Promise<Vehicle> {
  const { data } = await axios.post<Vehicle>("/vehicles", clean(values));
  return data;
}

export async function updateVehicle(
  id: string,
  values: Partial<VehicleFormValues> & { isActive?: boolean },
): Promise<Vehicle> {
  const { data } = await axios.patch<Vehicle>(`/vehicles/${id}`, clean(values));
  return data;
}

export async function deactivateVehicle(id: string): Promise<void> {
  await axios.delete(`/vehicles/${id}`);
}

export interface PhotoInput {
  category: "COVER" | "INTERIOR" | "EXTERIOR";
  fileKey: string;
  thumbKey?: string;
}

export async function addVehiclePhotos(
  vehicleId: string,
  photos: PhotoInput[],
): Promise<Vehicle> {
  const { data } = await axios.post<Vehicle>(`/vehicles/${vehicleId}/photos`, {
    photos,
  });
  return data;
}

export async function deleteVehiclePhoto(
  vehicleId: string,
  photoId: string,
): Promise<void> {
  await axios.delete(`/vehicles/${vehicleId}/photos/${photoId}`);
}

export interface TramerInput {
  date: string;
  amount: number;
  description: string;
  photoUrl?: string;
}

export async function addVehicleTramer(
  vehicleId: string,
  data: TramerInput,
): Promise<void> {
  await axios.post(`/vehicles/${vehicleId}/tramer`, data);
}

export async function deleteVehicleTramer(
  vehicleId: string,
  tramerId: string,
): Promise<void> {
  await axios.delete(`/vehicles/${vehicleId}/tramer/${tramerId}`);
}

