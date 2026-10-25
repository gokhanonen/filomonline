import axios from "@/utils/axios";
import type { Paginated } from "@/@types/common";
import type {
  AgingReport,
  Cheque,
  ChequeDirection,
  ChequeStatus,
  CollectionInput,
  FinanceAccount,
  FinanceAccountPayload,
  FinanceModule,
  FinanceMovement,
  FinanceMovementType,
  FinanceSummary,
  FxRates,
  InvoiceSide,
  OpenInvoice,
  OperationResult,
  PaymentInput,
  PosSettlementInput,
  Statement,
  TransferInput,
} from "@/@types/finance";

// ---- Özet / kur ----

export async function getFinanceSummary(): Promise<FinanceSummary> {
  const { data } = await axios.get<FinanceSummary>("/finance/summary");
  return data;
}

export async function getFxRates(): Promise<FxRates> {
  const { data } = await axios.get<FxRates>("/finance/fx-rates");
  return data;
}

// ---- Finans hesapları ----

export async function listFinanceAccounts(): Promise<FinanceAccount[]> {
  const { data } = await axios.get<FinanceAccount[]>("/finance/accounts");
  return data;
}

export async function getFinanceAccount(id: string): Promise<FinanceAccount> {
  const { data } = await axios.get<FinanceAccount>(`/finance/accounts/${id}`);
  return data;
}

export async function createFinanceAccount(payload: FinanceAccountPayload): Promise<FinanceAccount> {
  const { data } = await axios.post<FinanceAccount>("/finance/accounts", payload);
  return data;
}

export async function updateFinanceAccount(id: string, payload: FinanceAccountPayload): Promise<FinanceAccount> {
  const { data } = await axios.patch<FinanceAccount>(`/finance/accounts/${id}`, payload);
  return data;
}

export async function deleteFinanceAccount(id: string): Promise<void> {
  await axios.delete(`/finance/accounts/${id}`);
}

// ---- İşlemler ----

export async function createCollection(payload: CollectionInput): Promise<OperationResult> {
  const { data } = await axios.post<OperationResult>("/finance/collections", payload);
  return data;
}

export async function createPayment(payload: PaymentInput): Promise<OperationResult> {
  const { data } = await axios.post<OperationResult>("/finance/payments", payload);
  return data;
}

export async function createTransfer(payload: TransferInput): Promise<OperationResult> {
  const { data } = await axios.post<OperationResult>("/finance/transfers", payload);
  return data;
}

export async function settlePos(
  payload: PosSettlementInput,
): Promise<{ groupId: string; gross: number; commission: number; net: number }> {
  const { data } = await axios.post("/finance/pos-settlements", payload);
  return data;
}

// ---- Hareketler ----

export interface ListMovementsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  cashRegisterId?: string;
  chequeId?: string;
  accountId?: string;
  module?: FinanceModule;
  type?: FinanceMovementType;
  from?: string;
  to?: string;
  unsettled?: boolean;
}

export async function listMovements(params: ListMovementsParams = {}): Promise<Paginated<FinanceMovement>> {
  const { unsettled, ...rest } = params;
  const { data } = await axios.get<Paginated<FinanceMovement>>("/finance/movements", {
    params: { ...rest, ...(unsettled ? { unsettled: "true" } : {}) },
  });
  return data;
}

export async function deleteMovementGroup(groupId: string): Promise<void> {
  await axios.delete(`/finance/movements/group/${groupId}`);
}

// ---- Çek / senet ----

export interface ListChequesParams {
  page?: number;
  pageSize?: number;
  search?: string;
  direction?: ChequeDirection;
  status?: ChequeStatus;
  accountId?: string;
  dueFrom?: string;
  dueTo?: string;
}

export async function listCheques(params: ListChequesParams = {}): Promise<Paginated<Cheque>> {
  const { data } = await axios.get<Paginated<Cheque>>("/finance/cheques", { params });
  return data;
}

export async function getChequeHistory(id: string) {
  const { data } = await axios.get<
    { id: string; groupId: string; date: string; type: FinanceMovementType; direction: "IN" | "OUT"; amount: string; accountId: string | null; description: string | null }[]
  >(`/finance/cheques/${id}/history`);
  return data;
}

export async function depositCheque(id: string, bankRegisterId: string) {
  const { data } = await axios.post<Cheque>(`/finance/cheques/${id}/deposit`, { bankRegisterId });
  return data;
}

export async function withdrawCheque(id: string) {
  const { data } = await axios.post<Cheque>(`/finance/cheques/${id}/withdraw`);
  return data;
}

export async function collectCheque(id: string, payload: { date: string; cashRegisterId?: string; description?: string }) {
  const { data } = await axios.post<OperationResult>(`/finance/cheques/${id}/collect`, payload);
  return data;
}

export async function payCheque(id: string, payload: { date: string; cashRegisterId?: string; description?: string }) {
  const { data } = await axios.post<OperationResult>(`/finance/cheques/${id}/pay`, payload);
  return data;
}

export async function bounceCheque(id: string, payload: { date: string; status: "BOUNCED" | "RETURNED"; description?: string }) {
  const { data } = await axios.post<OperationResult>(`/finance/cheques/${id}/bounce`, payload);
  return data;
}

// ---- Cari: ekstre / açık faturalar / yaşlandırma ----

export async function getStatement(accountId: string, params: { from?: string; to?: string } = {}): Promise<Statement> {
  const { data } = await axios.get<Statement>(`/finance/statement/${accountId}`, { params });
  return data;
}

export async function listOpenInvoices(params: { accountId?: string; side?: InvoiceSide; overdue?: boolean } = {}): Promise<OpenInvoice[]> {
  const { overdue, ...rest } = params;
  const { data } = await axios.get<OpenInvoice[]>("/finance/open-invoices", {
    params: { ...rest, ...(overdue ? { overdue: "true" } : {}) },
  });
  return data;
}

export async function getAging(side: InvoiceSide): Promise<AgingReport> {
  const { data } = await axios.get<AgingReport>("/finance/aging", { params: { side } });
  return data;
}
