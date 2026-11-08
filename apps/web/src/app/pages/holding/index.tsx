import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  TbCar,
  TbKey,
  TbCircleCheck,
  TbUsers,
  TbBuildingWarehouse,
  TbReceipt2,
  TbReportMoney,
  TbReceipt,
  TbBuildingSkyscraper,
  TbInfoCircle,
} from "react-icons/tb";
import { toast } from "sonner";

import { Page } from "@/components/shared/Page";
import { Card, Spinner } from "@/components/ui";
import { useAuthContext } from "@/app/contexts/auth/context";
import { getHoldingSummary, type HoldingSummary } from "@/services/reportService";

const money = (n: number) =>
  `${Number(n ?? 0).toLocaleString("tr-TR", { maximumFractionDigits: 0 })} ₺`;
const num = (n: number) => Number(n ?? 0).toLocaleString("tr-TR");

function Stat({
  label,
  value,
  Icon,
  color,
}: {
  label: string;
  value: string;
  Icon: React.ElementType;
  color: string;
}) {
  return (
    <Card className="flex items-center gap-3 p-4">
      <div className={`flex size-11 shrink-0 items-center justify-center rounded-lg ${color}`}>
        <Icon className="size-6" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm text-gray-400 dark:text-dark-300">{label}</p>
        <p className="text-xl font-semibold text-gray-800 dark:text-dark-50">{value}</p>
      </div>
    </Card>
  );
}

export default function HoldingDashboard() {
  const { switchCompany } = useAuthContext();
  const navigate = useNavigate();
  const [data, setData] = useState<HoldingSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getHoldingSummary()
      .then(setData)
      .catch(() => toast.error("Konsolide veriler yüklenemedi."))
      .finally(() => setLoading(false));
  }, []);

  const openCompany = (companyId: string) => {
    switchCompany(companyId);
    navigate("/dashboard");
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center py-20">
        <Spinner className="size-7" />
      </div>
    );
  }
  if (!data) return null;

  const t = data.totals;

  return (
    <Page title="Holding — Konsolide">
      <div className="w-full space-y-6 px-(--margin-x) py-6">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary-100 text-primary-600 dark:bg-primary-500/20 dark:text-primary-400">
            <TbBuildingSkyscraper className="size-6" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-800 dark:text-dark-50">
              {data.holdingName} — Konsolide
            </h1>
            <p className="text-sm text-gray-400 dark:text-dark-300">
              {data.companyCount} firmanın birleşik özeti
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-info/30 bg-info/10 px-4 py-2.5 text-sm text-info">
          <TbInfoCircle className="size-5 shrink-0" />
          <span>
            Bu ekran <b>salt-okunur</b> konsolide görünümdür. İşlem yapmak (araç girişi, satış,
            tahsilat…) için aşağıdan ya da sağ üstteki seçiciden bir firma seçin.
          </span>
        </div>

        {/* Konsolide toplamlar */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat label="Stokta" value={num(t.vehicles.stokta)} Icon={TbCar} color="bg-primary-100 text-primary-600 dark:bg-primary-500/20" />
          <Stat label="Kiralamada" value={num(t.vehicles.kiralamada)} Icon={TbKey} color="bg-amber-100 text-amber-600 dark:bg-amber-500/20" />
          <Stat label="Satılan" value={num(t.vehicles.satildi)} Icon={TbCircleCheck} color="bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20" />
          <Stat label="Cari Sayısı" value={num(t.cariSayisi)} Icon={TbUsers} color="bg-sky-100 text-sky-600 dark:bg-sky-500/20" />
          <Stat label="Stok Maliyeti" value={money(t.stokMaliyeti)} Icon={TbBuildingWarehouse} color="bg-secondary/15 text-secondary" />
          <Stat label="Toplam Satış" value={money(t.toplamSatis)} Icon={TbReceipt2} color="bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20" />
          <Stat label="Brüt Kâr" value={money(t.brutKar)} Icon={TbReportMoney} color="bg-primary-100 text-primary-600 dark:bg-primary-500/20" />
          <Stat label="Toplam Masraf" value={money(t.toplamMasraf)} Icon={TbReceipt} color="bg-orange-100 text-orange-600 dark:bg-orange-500/20" />
        </div>

        {/* Firma bazında döküm */}
        <div>
          <h2 className="mb-3 text-sm font-semibold text-gray-700 dark:text-dark-100">
            Firma Bazında Döküm
          </h2>
          <Card className="overflow-x-auto p-0">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-gray-150 bg-gray-50 text-left text-tiny font-semibold uppercase tracking-wide text-gray-500 dark:border-dark-600 dark:bg-dark-800 dark:text-dark-300">
                  <th className="px-4 py-2.5">Firma</th>
                  <th className="px-3 py-2.5 text-right">Stokta</th>
                  <th className="px-3 py-2.5 text-right">Kiralamada</th>
                  <th className="px-3 py-2.5 text-right">Satılan</th>
                  <th className="px-3 py-2.5 text-right">Stok Maliyeti</th>
                  <th className="px-3 py-2.5 text-right">Toplam Satış</th>
                  <th className="px-3 py-2.5 text-right">Brüt Kâr</th>
                  <th className="px-3 py-2.5 text-right">Masraf</th>
                </tr>
              </thead>
              <tbody>
                {data.companies.map((c) => (
                  <tr
                    key={c.companyId}
                    className="cursor-pointer border-b border-gray-100 last:border-0 hover:bg-primary-50/40 dark:border-dark-700 dark:hover:bg-dark-700/40"
                    onClick={() => openCompany(c.companyId)}
                    title="Firmayı aç"
                  >
                    <td className="px-4 py-2.5 font-medium text-gray-800 dark:text-dark-50">
                      {c.companyName}
                    </td>
                    <td className="px-3 py-2.5 text-right">{num(c.stokta)}</td>
                    <td className="px-3 py-2.5 text-right">{num(c.kiralamada)}</td>
                    <td className="px-3 py-2.5 text-right">{num(c.satildi)}</td>
                    <td className="px-3 py-2.5 text-right">{money(c.stokMaliyeti)}</td>
                    <td className="px-3 py-2.5 text-right">{money(c.toplamSatis)}</td>
                    <td className="px-3 py-2.5 text-right font-medium text-emerald-600 dark:text-emerald-400">
                      {money(c.brutKar)}
                    </td>
                    <td className="px-3 py-2.5 text-right">{money(c.toplamMasraf)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-200 bg-gray-50 font-semibold text-gray-800 dark:border-dark-600 dark:bg-dark-800 dark:text-dark-50">
                  <td className="px-4 py-2.5">TOPLAM</td>
                  <td className="px-3 py-2.5 text-right">{num(t.vehicles.stokta)}</td>
                  <td className="px-3 py-2.5 text-right">{num(t.vehicles.kiralamada)}</td>
                  <td className="px-3 py-2.5 text-right">{num(t.vehicles.satildi)}</td>
                  <td className="px-3 py-2.5 text-right">{money(t.stokMaliyeti)}</td>
                  <td className="px-3 py-2.5 text-right">{money(t.toplamSatis)}</td>
                  <td className="px-3 py-2.5 text-right text-emerald-600 dark:text-emerald-400">{money(t.brutKar)}</td>
                  <td className="px-3 py-2.5 text-right">{money(t.toplamMasraf)}</td>
                </tr>
              </tfoot>
            </table>
          </Card>
          <p className="mt-2 text-tiny text-gray-400">
            Bir firma satırına tıklayınca o firmaya geçip işlem yapabilirsiniz.
          </p>
        </div>
      </div>
    </Page>
  );
}
