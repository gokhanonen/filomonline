import type { Location } from "./location";

export type VehicleLocationStatus =
  | "NO_LOCATION"
  | "AT_LOCATION"
  | "IN_TRANSFER"
  | "AT_EXTERNAL";

export type VehicleTransferStatus = "PENDING" | "CONFIRMED" | "CANCELLED";

export interface VehicleLocationDisplay {
  status: VehicleLocationStatus;
  currentLocation?: Location | null;
  targetLocation?: Location | null;
  supplier?: { id: string; name: string; phone?: string | null } | null;
  returnLocation?: Location | null;
  pendingTransfer?: VehicleTransferItem | null;
}

export interface VehicleTransferItem {
  id: string;
  companyId: string;
  vehicleId: string;
  fromLocationId: string;
  toLocationId: string;
  status: VehicleTransferStatus;
  initiatedById: string;
  initiatedAt: string;
  confirmedById?: string | null;
  confirmedAt?: string | null;
  cancelledById?: string | null;
  cancelledAt?: string | null;
  notes?: string | null;
  isExternalTransfer: boolean;
  supplierId?: string | null;
  returnLocationId?: string | null;
  fromLocation?: Location | null;
  toLocation?: Location | null;
  returnLocation?: Location | null;
  supplier?: { id: string; name: string; phone?: string | null } | null;
  initiatedByUser?: { id: string; name: string; email: string } | null;
  confirmedByUser?: { id: string; name: string; email: string } | null;
  cancelledByUser?: { id: string; name: string; email: string } | null;
  vehicle?: {
    id: string;
    plate: string;
    brandName?: string | null;
    modelName?: string | null;
    status: string;
  } | null;
}

export interface CreateTransferPayload {
  toLocationId: string;
  notes?: string;
  isDirect?: boolean;
  supplierId?: string;
  returnLocationId?: string;
}

export interface ReturnFromExternalPayload {
  returnLocationId?: string;
  notes?: string;
}
