import axios from "@/utils/axios";
import type {
  CreateTransferPayload,
  ReturnFromExternalPayload,
  VehicleLocationDisplay,
  VehicleTransferItem,
} from "@/@types/vehicleLocation";

export async function getVehicleLocation(
  vehicleId: string,
): Promise<VehicleLocationDisplay> {
  const { data } = await axios.get<VehicleLocationDisplay>(
    `/vehicles/${vehicleId}/location`,
  );
  return data;
}

export async function getVehicleTransfers(
  vehicleId: string,
): Promise<VehicleTransferItem[]> {
  const { data } = await axios.get<VehicleTransferItem[]>(
    `/vehicles/${vehicleId}/transfers`,
  );
  return data;
}

export async function createVehicleTransfer(
  vehicleId: string,
  payload: CreateTransferPayload,
): Promise<{ success: boolean; message: string; transferId?: string; status?: string }> {
  const { data } = await axios.post<{
    success: boolean;
    message: string;
    transferId?: string;
    status?: string;
  }>(`/vehicles/${vehicleId}/transfers`, payload);
  return data;
}

export async function confirmVehicleTransfer(
  vehicleId: string,
  transferId: string,
): Promise<{ success: boolean; message: string }> {
  const { data } = await axios.post<{ success: boolean; message: string }>(
    `/vehicles/${vehicleId}/transfers/${transferId}/confirm`,
  );
  return data;
}

export async function cancelVehicleTransfer(
  vehicleId: string,
  transferId: string,
): Promise<{ success: boolean; message: string }> {
  const { data } = await axios.post<{ success: boolean; message: string }>(
    `/vehicles/${vehicleId}/transfers/${transferId}/cancel`,
  );
  return data;
}

export async function returnVehicleFromExternal(
  vehicleId: string,
  payload: ReturnFromExternalPayload = {},
): Promise<{ success: boolean; message: string }> {
  const { data } = await axios.post<{ success: boolean; message: string }>(
    `/vehicles/${vehicleId}/transfers/return-external`,
    payload,
  );
  return data;
}

export async function getPendingTransfers(): Promise<VehicleTransferItem[]> {
  const { data } = await axios.get<VehicleTransferItem[]>(
    "/locations/pending-transfers",
  );
  return data;
}
