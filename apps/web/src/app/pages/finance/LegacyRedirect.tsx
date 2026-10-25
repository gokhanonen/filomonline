import { Navigate, useSearchParams } from "react-router";

/** Eski /invoices ve /expenses adresleri → birleşik Hareketler sayfasının ilgili sekmesi */
export function LegacyFinanceRedirect({ view }: { view: "SALES" | "EXPENSE" }) {
  const [params] = useSearchParams();
  const q = new URLSearchParams({ view: view === "SALES" && params.get("type") === "purchase" ? "PURCHASE" : view });
  const search = params.get("search");
  if (search) q.set("search", search);
  return <Navigate to={`/finance/movements?${q.toString()}`} replace />;
}
