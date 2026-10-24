import axios from "@/utils/axios";
import type { Paginated } from "@/@types/common";
import type { Location, LocationFormValues } from "@/@types/location";

export interface ListLocationsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  onlyActive?: boolean;
}

export async function listLocations(
  params: ListLocationsParams = {},
): Promise<Paginated<Location>> {
  const { data } = await axios.get<Paginated<Location>>("/locations", { params });
  return data;
}

export async function createLocation(values: LocationFormValues): Promise<Location> {
  const { data } = await axios.post<Location>("/locations", values);
  return data;
}

export async function updateLocation(
  id: string,
  values: Partial<LocationFormValues> & { isActive?: boolean },
): Promise<Location> {
  const { data } = await axios.patch<Location>(`/locations/${id}`, values);
  return data;
}

export async function deactivateLocation(id: string): Promise<void> {
  await axios.delete(`/locations/${id}`);
}
