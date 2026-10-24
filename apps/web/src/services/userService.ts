import axios from "@/utils/axios";
import type {
  AdminRole,
  AdminUser,
  MembershipInput,
  UserFormValues,
} from "@/@types/userAdmin";

export async function listUsers(): Promise<AdminUser[]> {
  const { data } = await axios.get<AdminUser[]>("/users");
  return data;
}

export async function createUser(
  values: UserFormValues & { memberships?: MembershipInput[] },
): Promise<AdminUser> {
  const { data } = await axios.post<AdminUser>("/users", values);
  return data;
}

export async function updateUser(
  id: string,
  values: Partial<UserFormValues>,
): Promise<AdminUser> {
  const { data } = await axios.patch<AdminUser>(`/users/${id}`, values);
  return data;
}

export async function setUserMemberships(
  id: string,
  memberships: MembershipInput[],
): Promise<AdminUser> {
  const { data } = await axios.put<AdminUser>(`/users/${id}/memberships`, {
    memberships,
  });
  return data;
}

export async function listRoles(): Promise<AdminRole[]> {
  const { data } = await axios.get<AdminRole[]>("/roles");
  return data;
}

export interface UpdateProfileInput {
  name?: string;
  phone?: string;
  extension?: string;
  avatarUrl?: string;
  password?: string;
}

export async function updateProfile(values: UpdateProfileInput) {
  const { data } = await axios.patch("/auth/profile", values);
  return data;
}
