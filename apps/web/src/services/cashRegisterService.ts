import axios from "@/utils/axios";
import type {
  CashRegister,
  CashSummary,
  CashTransaction,
  CashTransactionType,
} from "@/@types/cashRegister";
import type { Paginated } from "@/@types/common";

export async function listCashRegisters(): Promise<CashRegister[]> {
  const { data } = await axios.get<CashRegister[]>("/cash-registers");
  return data;
}

export async function getCashSummary(): Promise<CashSummary> {
  const { data } = await axios.get<CashSummary>("/cash-registers/summary");
  return data;
}

export async function createCashRegister(payload: Partial<CashRegister>): Promise<CashRegister> {
  const { data } = await axios.post<CashRegister>("/cash-registers", payload);
  return data;
}

export async function updateCashRegister(
  id: string,
  payload: Partial<CashRegister>,
): Promise<CashRegister> {
  const { data } = await axios.patch<CashRegister>(`/cash-registers/${id}`, payload);
  return data;
}

export async function deleteCashRegister(id: string): Promise<{ success: boolean }> {
  const { data } = await axios.delete<{ success: boolean }>(`/cash-registers/${id}`);
  return data;
}

export interface ListTransactionsParams {
  cashRegisterId?: string;
  type?: CashTransactionType;
  accountId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

export async function listCashTransactions(
  params?: ListTransactionsParams,
): Promise<Paginated<CashTransaction>> {
  const { data } = await axios.get<Paginated<CashTransaction>>(
    "/cash-registers/transactions",
    { params },
  );
  return data;
}

export interface CreateCashTransactionPayload {
  cashRegisterId: string;
  type: CashTransactionType;
  amount: number;
  date?: string;
  description?: string;
  documentNo?: string;
  accountId?: string;
  invoiceType?: string;
  invoiceId?: string;
  vehicleId?: string;
  targetRegisterId?: string;
}

export async function createCashTransaction(
  payload: CreateCashTransactionPayload,
): Promise<CashTransaction> {
  const { data } = await axios.post<CashTransaction>(
    "/cash-registers/transactions",
    payload,
  );
  return data;
}

export async function deleteCashTransaction(id: string): Promise<{ success: boolean }> {
  const { data } = await axios.delete<{ success: boolean }>(
    `/cash-registers/transactions/${id}`,
  );
  return data;
}
