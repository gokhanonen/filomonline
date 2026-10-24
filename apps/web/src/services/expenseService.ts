import axios from "@/utils/axios";
import type { Paginated } from "@/@types/common";
import type {
  Expense,
  ExpenseFormValues,
  ExpenseInvoiceType,
} from "@/@types/expense";

export interface ListExpensesParams {
  page?: number;
  pageSize?: number;
  search?: string;
  invoiceType?: ExpenseInvoiceType;
  vehicleId?: string;
}

export async function listExpenses(
  params: ListExpensesParams = {},
): Promise<Paginated<Expense>> {
  const { data } = await axios.get<Paginated<Expense>>("/expenses", { params });
  return data;
}

export async function getExpense(id: string): Promise<Expense> {
  const { data } = await axios.get<Expense>(`/expenses/${id}`);
  return data;
}

export async function createExpense(values: ExpenseFormValues): Promise<Expense> {
  const { data } = await axios.post<Expense>("/expenses", clean(values));
  return data;
}

export async function updateExpense(
  id: string,
  values: ExpenseFormValues,
): Promise<Expense> {
  const { data } = await axios.patch<Expense>(`/expenses/${id}`, clean(values));
  return data;
}

export async function deleteExpense(id: string): Promise<void> {
  await axios.delete(`/expenses/${id}`);
}

function clean(values: ExpenseFormValues) {
  const out: Record<string, unknown> = { ...values };
  for (const k of ["vehicleId", "locationId", "supplierId", "documentNo", "category", "description"]) {
    if (!out[k]) delete out[k];
  }
  return out;
}
