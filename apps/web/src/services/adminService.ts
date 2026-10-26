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
export async function updateCompany(id: string, patch: { name?: string; isActive?: boolean; logoUrl?: string }) {
  const { data } = await axios.patch<AdminCompany>(`/companies/${id}`, patch);
  return data;
}

export interface CompanyDetails {
  id: string;
  tenantId: string;
  name: string;
  legalName?: string | null;
  taxOffice?: string | null;
  taxNumber?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  logoUrl?: string | null;
  website?: string | null;
  mersisNo?: string | null;
  tradeRegistryNo?: string | null;
  isActive: boolean;
  createdAt: string;
  tenant?: { id: string; name: string };
}

export async function getCurrentCompany(): Promise<CompanyDetails> {
  const { data } = await axios.get<CompanyDetails>("/companies/current");
  return data;
}

export async function updateCurrentCompany(
  patch: Partial<Omit<CompanyDetails, "id" | "tenantId" | "createdAt">>
): Promise<CompanyDetails> {
  const { data } = await axios.patch<CompanyDetails>("/companies/current", patch);
  return data;
}

// --- Platform e-posta (SMTP) — yalnız süper admin ---

export interface MailConfig {
  isConfigured: boolean;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  maskedPassword: string;
  fromEmail: string;
  fromName: string;
}

export interface MailConfigInput {
  host?: string;
  port?: number;
  secure?: boolean;
  username?: string;
  password?: string;
  fromEmail?: string;
  fromName?: string;
}

export async function getMailConfig(): Promise<MailConfig> {
  const { data } = await axios.get<MailConfig>("/admin/mail/config");
  return data;
}

export async function updateMailConfig(input: MailConfigInput): Promise<MailConfig> {
  const { data } = await axios.put<MailConfig>("/admin/mail/config", input);
  return data;
}

export async function testMail(to?: string): Promise<{ success: boolean; sentTo: string | null; latencyMs: number }> {
  const { data } = await axios.post("/admin/mail/test", { to: to || undefined });
  return data;
}
