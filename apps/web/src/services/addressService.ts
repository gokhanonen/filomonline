import axios from "@/utils/axios";

export interface City {
  id: number;
  name: string;
}

export interface District {
  id: number;
  name: string;
}

export interface Neighborhood {
  id: number;
  name: string;
  postalCode: string;
}

/** Tüm illeri getirir. */
export async function getCities(): Promise<City[]> {
  const { data } = await axios.get<City[]>("/address/cities");
  return data;
}

/** Bir ile ait ilçeleri getirir. */
export async function getDistricts(cityId: number): Promise<District[]> {
  const { data } = await axios.get<District[]>("/address/districts", {
    params: { cityId },
  });
  return data;
}

/** Bir ilçeye ait mahalleleri getirir (opsiyonel arama ile). */
export async function getNeighborhoods(
  districtId: number,
  q?: string,
): Promise<Neighborhood[]> {
  const { data } = await axios.get<Neighborhood[]>("/address/neighborhoods", {
    params: { districtId, ...(q ? { q } : {}) },
  });
  return data;
}
