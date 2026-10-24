import axios from "@/utils/axios";

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  plan?: string | null;
  createdAt: string;
  _count?: { companies: number; users: number };
}

export interface AdminCompany {
  id: string;
  tenantId: string;
  name: string;
  legalName?: string | null;
  taxNumber?: string | null;
  isActive: boolean;
  createdAt: string;
  tenant?: { id: string; name: string };
  _count?: { memberships: number };
}

interface Paginated<T> {
  items: T[];
  total: number;
}

export async function listTenants(search?: string): Promise<Tenant[]> {
  const { data } = await axios.get<Paginated<Tenant>>("/tenants", {
    params: { pageSize: 100, search: search || undefined },
  });
  return data.items;
}
export async function createTenant(name: string): Promise<Tenant> {
  const { data } = await axios.post<Tenant>("/tenants", { name });
  return data;
}
export async function updateTenant(id: string, patch: { name?: string; isActive?: boolean }) {
  const { data } = await axios.patch<Tenant>(`/tenants/${id}`, patch);
  return data;
}

export async function listCompanies(tenantId: string): Promise<AdminCompany[]> {
  const { data } = await axios.get<Paginated<AdminCompany>>("/companies", {
    params: { tenantId, pageSize: 100 },
  });
  return data.items;
}
export async function createCompany(tenantId: string, name: string): Promise<AdminCompany> {
  const { data } = await axios.post<AdminCompany>("/companies", { tenantId, name });
  return data;
}
export async function updateCompany(id: string, patch: { name?: string; isActive?: boolean }) {
  const { data } = await axios.patch<AdminCompany>(`/companies/${id}`, patch);
  return data;
}
