import axios from "@/utils/axios";
import type { Paginated } from "@/@types/common";
import type { ActivityLog } from "@/@types/activity";

export interface ListActivityParams {
  page?: number;
  pageSize?: number;
  unreadOnly?: boolean;
  entityType?: string;
  entityId?: string;
}

export async function listActivity(params: ListActivityParams = {}): Promise<Paginated<ActivityLog>> {
  const { data } = await axios.get<Paginated<ActivityLog>>("/activity", { params });
  return data;
}
export async function unreadActivityCount(): Promise<number> {
  const { data } = await axios.get<{ count: number }>("/activity/unread-count");
  return data.count;
}
export async function markActivityRead(id: string) {
  await axios.patch(`/activity/${id}/read`);
}
export async function markAllActivityRead() {
  await axios.patch("/activity/read-all");
}
