import { useEffect, useState } from "react";
import { TbBuildingSkyscraper, TbUserShare } from "react-icons/tb";

import { Spinner } from "@/components/ui";
import { getPartyOverview, type PartyOverview } from "@/services/partyService";

const money = (n: number) =>
  `${Number(n ?? 0).toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ₺`;

const TYPE_LABEL: Record<string, string> = {
  CUSTOMER: "Müşteri",
  SUPPLIER: "Tedarikçi",
  BOTH: "Müşteri+Tedarikçi",
};
const LEAD_STATUS: Record<string, string> = {
  NEW: "Yeni",
  CONTACTED: "İletişimde",
  TEST_DRIVE: "Deneme sürüşü",
  QUOTE_SENT: "Teklif verildi",
  WON: "Kazanıldı",
  CONVERTED: "Dönüştü",
  LOST: "Kaybedildi",
};

/**
 * Holding-geneli kimlik paneli: bu kişi/kurum grubun HANGİ firmalarında var,
 * hangi bakiye/lead ile. Cari kartında gösterilir (account.partyId varsa).
 */
export function PartyOverviewPanel({ partyId }: { partyId: string }) {
  const [data, setData] = useState<PartyOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    getPartyOverview(partyId)
      .then((d) => alive && setData(d))
      .catch(() => void 0)
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [partyId]);

  if (loading)
    return (
      <div className="flex justify-center py-4">
        <Spinner className="size-5" />
      </div>
    );
  if (!data) return null;

  const multiCompany = data.accounts.length + data.leads.length > 1;

  return (
    <div className="rounded-xl border border-primary-200 bg-primary-50/40 p-3 dark:border-primary-900/50 dark:bg-primary-950/20">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-primary-700 dark:text-primary-300">
        <TbBuildingSkyscraper className="size-4" />
        <span>Holding Geneli Kimlik</span>
        {!multiCompany && (
          <span className="font-normal text-gray-400">· yalnız bu firmada</span>
        )}
      </div>

      {data.accounts.length > 0 && (
        <div className="space-y-1">
          {data.accounts.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between gap-2 rounded-lg bg-white/70 px-2.5 py-1.5 text-xs dark:bg-dark-700/60"
            >
              <span className="flex items-center gap-1.5 text-gray-700 dark:text-dark-100">
                <TbBuildingSkyscraper className="size-3.5 text-gray-400" />
                {a.companyName}
                <span className="text-gray-400">· {TYPE_LABEL[a.type] ?? a.type}</span>
              </span>
              <span
                className={
                  Number(a.balance) > 0
                    ? "font-semibold text-error"
                    : Number(a.balance) < 0
                      ? "font-semibold text-success"
                      : "text-gray-500"
                }
              >
                {money(a.balance)}
              </span>
            </div>
          ))}
        </div>
      )}

      {data.leads.length > 0 && (
        <div className="mt-2 space-y-1">
          {data.leads.map((l) => (
            <div
              key={l.id}
              className="flex items-center justify-between gap-2 rounded-lg bg-white/70 px-2.5 py-1.5 text-xs dark:bg-dark-700/60"
            >
              <span className="flex items-center gap-1.5 text-gray-700 dark:text-dark-100">
                <TbUserShare className="size-3.5 text-secondary" />
                {l.companyName}
                <span className="text-gray-400">· CRM</span>
              </span>
              <span className="text-gray-500">{LEAD_STATUS[l.status] ?? l.status}</span>
            </div>
          ))}
        </div>
      )}

      {data.accounts.length === 0 && data.leads.length === 0 && (
        <p className="text-tiny text-gray-400">Başka firmada kaydı yok.</p>
      )}
    </div>
  );
}
