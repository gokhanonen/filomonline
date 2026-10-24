import axios from "@/utils/axios";
import type { Paginated } from "@/@types/common";
import type {
  RentalContract,
  RentalContractStatus,
  RentalFormValues,
} from "@/@types/rental";

export interface ListRentalsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: RentalContractStatus;
}

export async function listRentals(
  params: ListRentalsParams = {},
): Promise<Paginated<RentalContract>> {
  const { data } = await axios.get<Paginated<RentalContract>>("/rentals", { params });
  return data;
}

function clean(values: RentalFormValues) {
  const out: Record<string, unknown> = { ...values };
  for (const k of ["customerId", "customerPhone", "customerAddress", "customerTcTaxNo", "documentNo"]) {
    if (!out[k]) delete out[k];
  }
  return out;
}

export async function createRental(values: RentalFormValues): Promise<RentalContract> {
  const { data } = await axios.post<RentalContract>("/rentals", clean(values));
  return data;
}

export async function updateRental(
  id: string,
  values: RentalFormValues,
): Promise<RentalContract> {
  const { data } = await axios.patch<RentalContract>(`/rentals/${id}`, clean(values));
  return data;
}

export async function cancelRental(id: string): Promise<void> {
  await axios.delete(`/rentals/${id}`);
}
