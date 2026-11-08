import axios from "@/utils/axios";
import type { AdminRole } from "@/@types/userAdmin";

export interface ModuleDef {
  key: string;
  label: string;
  actions: ("read" | "create" | "write" | "delete")[];
}
export interface DataScopeDef {
  key: string;
  label: string;
  description: string;
}
export interface RolePreset {
  name: string;
  description: string;
  permissions: string[];
}
export interface PermissionCatalog {
  modules: ModuleDef[];
  dataScopes: DataScopeDef[];
  rolePresets: RolePreset[];
  defaultRole: string;
}

export const getPermissionCatalog = async (): Promise<PermissionCatalog> => {
  const { data } = await axios.get<PermissionCatalog>("/authz/catalog");
  return data;
};

export const createRole = async (dto: {
  name: string;
  description?: string;
  permissions: string[];
}): Promise<AdminRole> => {
  const { data } = await axios.post<AdminRole>("/roles", dto);
  return data;
};

export const updateRole = async (
  id: string,
  dto: { name?: string; description?: string; permissions?: string[] },
): Promise<AdminRole> => {
  const { data } = await axios.patch<AdminRole>(`/roles/${id}`, dto);
  return data;
};

export const deleteRole = async (id: string): Promise<void> => {
  await axios.delete(`/roles/${id}`);
};
