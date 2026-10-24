import axios from "@/utils/axios";
import type {
  Account,
  AccountFormValues,
  AccountType,
  Paginated,
} from "@/@types/account";

export interface ListAccountsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  type?: AccountType;
  onlyActive?: boolean;
}

export async function listAccounts(
  params: ListAccountsParams = {},
): Promise<Paginated<Account>> {
  const { data } = await axios.get<Paginated<Account>>("/accounts", { params });
  return data;
}

export async function getAccount(id: string): Promise<Account> {
  const { data } = await axios.get<Account>(`/accounts/${id}`);
  return data;
}

export async function createAccount(
  values: AccountFormValues,
): Promise<Account> {
  const { data } = await axios.post<Account>("/accounts", values);
  return data;
}

export async function updateAccount(
  id: string,
  values: Partial<AccountFormValues> & { isActive?: boolean },
): Promise<Account> {
  const { data } = await axios.patch<Account>(`/accounts/${id}`, values);
  return data;
}

/** Pasifleştirir (API soft-delete uygular). */
export async function deactivateAccount(id: string): Promise<void> {
  await axios.delete(`/accounts/${id}`);
}
