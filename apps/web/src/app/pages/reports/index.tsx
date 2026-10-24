import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Page } from "@/components/shared/Page";
import { Card, Spinner, Table, TBody, Td, Th, THead, Tr } from "@/components/ui";
import { getSummary, type ReportSummary } from "@/services/reportService";

function money(v: number): string {
  return v.toLocaleString("tr-TR", { minimumFractionDigits: 2 }) + " ₺";
}

export default function ReportsPage() {
  const [data, setData] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getSummary()
      .then(setData)
      .catch((err) => toast.error((err as { message?: string })?.message ?? "Rapor alınamadı"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Page title="Raporlar">
      <div className="w-full px-(--margin-x) py-6">
        <h2 className="text-xl font-medium text-gray-800 dark:text-dark-50">Raporlar</h2>
        <p className="text-sm text-gray-400 dark:text-dark-300">Konsolide kâr / zarar ve stok özeti</p>

        {loading || !data ? (
          <div className="flex justify-center py-16"><Spinner className="size-8" /></div>
        ) : (
          <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card className="p-5">
              <h3 className="mb-3 font-medium text-gray-800 dark:text-dark-50">Araç Durumu</h3>
              <Table className="w-full text-left">
                <THead>
                  <Tr><Th>Durum</Th><Th className="text-right">Adet</Th></Tr>
                </THead>
                <TBody>
                  <Tr><Td>Stokta</Td><Td className="text-right">{data.vehicles.stokta}</Td></Tr>
                  <Tr><Td>Kiralamada</Td><Td className="text-right">{data.vehicles.kiralamada}</Td></Tr>
                  <Tr><Td>Satılan</Td><Td className="text-right">{data.vehicles.satildi}</Td></Tr>
                  <Tr className="font-semibold"><Td>Toplam</Td><Td className="text-right">{data.vehicles.toplam}</Td></Tr>
                </TBody>
              </Table>
            </Card>

            <Card className="p-5">
              <h3 className="mb-3 font-medium text-gray-800 dark:text-dark-50">Finansal Özet</h3>
              <Table className="w-full text-left">
                <TBody>
                  <Tr><Td>Stok Maliyeti</Td><Td className="text-right">{money(data.stokMaliyeti)}</Td></Tr>
                  <Tr><Td>Stok Liste Değeri</Td><Td className="text-right">{money(data.stokListeDeğeri)}</Td></Tr>
                  <Tr><Td>Toplam Satış</Td><Td className="text-right">{money(data.toplamSatis)}</Td></Tr>
                  <Tr><Td>Toplam Masraf</Td><Td className="text-right">{money(data.toplamMasraf)}</Td></Tr>
                  <Tr className="font-semibold text-success">
                    <Td>Brüt Kâr (satılanlar)</Td>
                    <Td className="text-right">{money(data.brutKar)}</Td>
                  </Tr>
                </TBody>
              </Table>
            </Card>
          </div>
        )}
      </div>
    </Page>
  );
}
