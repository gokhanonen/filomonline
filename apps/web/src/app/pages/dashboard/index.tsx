import { useEffect, useState } from "react";
import {
  TbCar,
  TbKey,
  TbCheck,
  TbReportMoney,
  TbReceipt,
  TbUsers,
  TbBuildingWarehouse,
} from "react-icons/tb";
import { toast } from "sonner";

import { Page } from "@/components/shared/Page";
import { Card, Spinner } from "@/components/ui";
import { useAuthContext } from "@/app/contexts/auth/context";
import { getSummary, type ReportSummary } from "@/services/reportService";

function money(v: number): string {
  return v.toLocaleString("tr-TR", { maximumFractionDigits: 0 }) + " ₺";
}

interface StatProps {
  label: string;
  value: string;
  Icon: React.ElementType;
  color: string;
}

function Stat({ label, value, Icon, color }: StatProps) {
  return (
    <Card className="flex items-center gap-4 p-4">
      <div className={`flex size-12 shrink-0 items-center justify-center rounded-lg ${color}`}>
        <Icon className="size-6" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm text-gray-400 dark:text-dark-300">{label}</p>
        <p className="text-xl font-semibold text-gray-800 dark:text-dark-50">{value}</p>
      </div>
    </Card>
  );
}

export default function DashboardPage() {
  const { companies, activeCompanyId } = useAuthContext();
  const [data, setData] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const activeCompany = companies.find((c) => c.id === activeCompanyId);

  useEffect(() => {
    setLoading(true);
    getSummary()
      .then(setData)
      .catch((err) =>
        toast.error((err as { message?: string })?.message ?? "Özet alınamadı"),
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <Page title="Dashboard">
      <div className="w-full px-(--margin-x) py-6">
        <h2 className="text-xl font-medium text-gray-800 dark:text-dark-50">
          {activeCompany?.name ?? "Dashboard"}
        </h2>
        <p className="text-sm text-gray-400 dark:text-dark-300">Genel durum özeti</p>

        {loading || !data ? (
          <div className="flex justify-center py-16">
            <Spinner className="size-8" />
          </div>
        ) : (
          <>
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Stokta" value={String(data.vehicles.stokta)} Icon={TbCar} color="bg-primary-100 text-primary-600 dark:bg-primary-500/20" />
              <Stat label="Kiralamada" value={String(data.vehicles.kiralamada)} Icon={TbKey} color="bg-warning/15 text-warning" />
              <Stat label="Satılan" value={String(data.vehicles.satildi)} Icon={TbCheck} color="bg-success/15 text-success" />
              <Stat label="Cari Sayısı" value={String(data.cariSayisi)} Icon={TbUsers} color="bg-info/15 text-info" />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Stok Maliyeti" value={money(data.stokMaliyeti)} Icon={TbBuildingWarehouse} color="bg-secondary/15 text-secondary" />
              <Stat label="Toplam Satış" value={money(data.toplamSatis)} Icon={TbReportMoney} color="bg-success/15 text-success" />
              <Stat label="Brüt Kâr" value={money(data.brutKar)} Icon={TbReportMoney} color="bg-primary-100 text-primary-600 dark:bg-primary-500/20" />
              <Stat label="Toplam Masraf" value={money(data.toplamMasraf)} Icon={TbReceipt} color="bg-error/15 text-error" />
            </div>
          </>
        )}
      </div>
    </Page>
  );
}
