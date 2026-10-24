import axios from "@/utils/axios";

export interface GlobalSearchResult {
  id: string;
  category:
    | "vehicles"
    | "invoices"
    | "expenses"
    | "accounts"
    | "rentals"
    | "contracts"
    | "options"
    | "products";
  moduleName: string;
  badgeColor: "primary" | "success" | "warning" | "danger" | "info" | "purple";
  title: string;
  subtitle: string;
  targetUrl: string;
  date?: string;
}

export async function searchGlobal(q: string): Promise<GlobalSearchResult[]> {
  if (!q || q.trim().length < 2) return [];
  const { data } = await axios.get<GlobalSearchResult[]>("/search", {
    params: { q: q.trim() },
  });
  return data;
}
