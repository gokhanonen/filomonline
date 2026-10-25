import axios from "@/utils/axios";
import type { Paginated } from "@/@types/common";
import type {
  ContractKind,
  ContractTemplate,
  RentalContract,
  RentalContractStatus,
  SalesContract,
  SalesContractFormData,
  SalesContractStatus,
} from "@/@types/contract";

export interface ListSalesContractsParams {
  page?: number;
  pageSize?: number;
  status?: SalesContractStatus;
  vehicleId?: string;
  search?: string;
}

export interface ListRentalContractsParams {
  page?: number;
  pageSize?: number;
  status?: RentalContractStatus;
  vehicleId?: string;
  search?: string;
}

// ----------------------------------------------------------------------
// SATIŞ SÖZLEŞMELERİ
// ----------------------------------------------------------------------

export async function listSalesContracts(
  params?: ListSalesContractsParams,
): Promise<Paginated<SalesContract>> {
  const { data } = await axios.get<Paginated<SalesContract>>("/contracts/sales", {
    params,
  });
  return data;
}

export async function getSalesContract(id: string): Promise<SalesContract> {
  const { data } = await axios.get<SalesContract>(`/contracts/sales/${id}`);
  return data;
}

export async function getSalesContractsByVehicle(
  vehicleId: string,
): Promise<SalesContract[]> {
  const { data } = await axios.get<SalesContract[]>(
    `/contracts/sales/by-vehicle/${vehicleId}`,
  );
  return data;
}

export async function createSalesContract(
  dto: SalesContractFormData,
): Promise<SalesContract> {
  const { data } = await axios.post<SalesContract>("/contracts/sales", dto);
  return data;
}

export async function updateSalesContract(
  id: string,
  dto: Partial<SalesContractFormData>,
): Promise<SalesContract> {
  const { data } = await axios.patch<SalesContract>(`/contracts/sales/${id}`, dto);
  return data;
}

export async function cancelSalesContract(id: string): Promise<void> {
  await axios.delete(`/contracts/sales/${id}`);
}

// ----------------------------------------------------------------------
// KİRA SÖZLEŞMELERİ
// ----------------------------------------------------------------------

export async function listRentalContracts(
  params?: ListRentalContractsParams,
): Promise<Paginated<RentalContract>> {
  const { data } = await axios.get<Paginated<RentalContract>>("/rentals", {
    params,
  });
  return data;
}

export async function getRentalContract(id: string): Promise<RentalContract> {
  const { data } = await axios.get<RentalContract>(`/rentals/${id}`);
  return data;
}

export async function getRentalContractsByVehicle(
  vehicleId: string,
): Promise<RentalContract[]> {
  const { data } = await axios.get<RentalContract[]>(
    `/rentals/by-vehicle/${vehicleId}`,
  );
  return data;
}

export async function createRentalContract(dto: any): Promise<RentalContract> {
  const { data } = await axios.post<RentalContract>("/rentals", dto);
  return data;
}

export async function updateRentalContract(
  id: string,
  dto: any,
): Promise<RentalContract> {
  const { data } = await axios.patch<RentalContract>(`/rentals/${id}`, dto);
  return data;
}

export async function cancelRentalContract(id: string): Promise<void> {
  await axios.delete(`/rentals/${id}`);
}

// ----------------------------------------------------------------------
// ŞABLONLAR & BASKI MOTORU
// ----------------------------------------------------------------------

export async function listContractTemplates(
  type?: ContractKind,
): Promise<ContractTemplate[]> {
  const { data } = await axios.get<ContractTemplate[]>("/contracts/templates", {
    params: { type },
  });
  return data;
}

export async function getContractTemplate(id: string): Promise<ContractTemplate> {
  const { data } = await axios.get<ContractTemplate>(`/contracts/templates/${id}`);
  return data;
}

export async function createContractTemplate(
  dto: Partial<ContractTemplate>,
): Promise<ContractTemplate> {
  const { data } = await axios.post<ContractTemplate>("/contracts/templates", dto);
  return data;
}

export async function updateContractTemplate(
  id: string,
  dto: Partial<ContractTemplate>,
): Promise<ContractTemplate> {
  const { data } = await axios.patch<ContractTemplate>(
    `/contracts/templates/${id}`,
    dto,
  );
  return data;
}

export async function deleteContractTemplate(id: string): Promise<void> {
  await axios.delete(`/contracts/templates/${id}`);
}

export async function renderContract(dto: {
  contractType: ContractKind;
  contractId: string;
  templateId?: string;
}): Promise<{ html: string; title: string }> {
  const { data } = await axios.post<{ html: string; title: string }>(
    "/contracts/templates/render",
    dto,
  );
  return data;
}

// ---- Yapılandırılmış şablon (yeni düzen) ----

/** Sözleşme şablonu düzeni — API contracts/contract-layout.ts ile aynı yapı */
export interface ContractLayout {
  kind: "layout";
  version: 1;
  title: string;
  accentColor: string;
  showLogo: boolean;
  showCurrencyColumns: boolean;
  installmentRows: number;
  blankRowTypes: string[];
  showPaymentNotes: boolean;
  showWitness: boolean;
  usagePurpose: string;
  jurisdiction: string;
  summaryLines: string[];
  clauses: string[];
}

export function parseLayout(content?: string | null): ContractLayout | null {
  if (!content || !content.trimStart().startsWith("{")) return null;
  try {
    const l = JSON.parse(content) as ContractLayout;
    return l.kind === "layout" ? l : null;
  } catch {
    return null;
  }
}

export async function getDefaultContractLayout(type: ContractKind): Promise<ContractLayout> {
  const { data } = await axios.get<ContractLayout>(`/contracts/templates/default-layout/${type}`);
  return data;
}

export async function previewContractLayout(type: ContractKind, layout: ContractLayout): Promise<string> {
  const { data } = await axios.post<{ html: string }>("/contracts/templates/preview", { type, layout });
  return data.html;
}
