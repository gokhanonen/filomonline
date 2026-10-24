import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { PlusIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";

import { Page } from "@/components/shared/Page";
import {
  Button,
  Card,
  Select,
  Table,
  TBody,
  Td,
  Th,
  THead,
  Tr,
  Tag,
} from "@/components/ui";
import { InfiniteSentinel } from "@/components/shared/InfiniteSentinel";
import { useInfiniteList } from "@/hooks/useInfiniteList";
import { useAuthContext } from "@/app/contexts/auth/context";
import {
  INTEGRATION_COLOR,
  INTEGRATION_LABELS,
  INVOICE_TYPE_LABELS,
  type IntegrationStatus,
  type InvoiceRow,
  type InvoiceType,
} from "@/@types/invoice";
import type { Vehicle } from "@/@types/vehicle";
import { listInvoices, updateInvoiceStatus } from "@/services/invoiceService";
import { listVehicles } from "@/services/vehicleService";
import { InvoiceForm } from "./InvoiceForm";

const PAGE_SIZE = 30;
const NEXT_STATUS: Partial<Record<IntegrationStatus, IntegrationStatus>> = {
  BEKLIYOR: "KUYRUKTA",
  KUYRUKTA: "ENTEGRE_EDILDI",
};

const typeFilter = [
  { value: "", label: "Tüm faturalar" },
  ...(Object.keys(INVOICE_TYPE_LABELS) as InvoiceType[]).map((k) => ({ value: k, label: INVOICE_TYPE_LABELS[k] })),
];

function money(v: number): string {
  return v.toLocaleString("tr-TR", { minimumFractionDigits: 0 }) + " ₺";
}
function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString("tr-TR");
}

export default function InvoicesPage() {
  const { can } = useAuthContext();
  const canWrite = can("invoices.write");
  const [searchParams] = useSearchParams();

  const urlType = searchParams.get("type") as InvoiceType | null;
  const urlSearch = searchParams.get("search") || "";

  const [type, setType] = useState<InvoiceType | "">(urlType || "");
  const [search, setSearch] = useState(urlSearch);
  const [refreshKey, setRefreshKey] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [plateMap, setPlateMap] = useState<Record<string, string>>({});

  useEffect(() => {
    const qType = searchParams.get("type") as InvoiceType | null;
    const qSearch = searchParams.get("search") || "";
    if (qType) setType(qType);
    if (qSearch) setSearch(qSearch);
  }, [searchParams]);

  useEffect(() => {
    listVehicles({ pageSize: 300 })
      .then((r) => {
        const m: Record<string, string> = {};
        (r.items as Vehicle[]).forEach((v) => (m[v.id] = v.plate));
        setPlateMap(m);
      })
      .catch(() => void 0);
  }, []);

  const fetchPage = useCallback(
    (page: number) => {
      void refreshKey;
      return listInvoices({
        page,
        pageSize: PAGE_SIZE,
        type: type || undefined,
        search: search || undefined,
      } as any);
    },
    [type, search, refreshKey],
  );

  const { items, total, loading, hasMore, loadMore } = useInfiniteList<InvoiceRow>(fetchPage);

  const advance = async (row: InvoiceRow) => {
    const next = row.integrationStatus ? NEXT_STATUS[row.integrationStatus] : undefined;
    if (!next) return;
    try {
      await updateInvoiceStatus(row.type, row.id, next);
      toast.success(`Durum: ${INTEGRATION_LABELS[next]}`);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? "İşlem başarısız");
    }
  };

  return (
    <Page title="Faturalar">
      <div className="w-full px-(--margin-x) py-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-medium text-gray-800 dark:text-dark-50">Faturalar</h2>
            <p className="text-sm text-gray-400 dark:text-dark-300">{total} fatura · entegrasyon durumlu</p>
          </div>
          {canWrite && (
            <Button color="primary" onClick={() => setFormOpen(true)} className="gap-2">
              <PlusIcon className="size-5" /> Yeni Fatura
            </Button>
          )}
        </div>

        <Card className="mt-4 p-4">
          <Select
            data={typeFilter}
            value={type}
            onChange={(e) => setType(e.target.value as InvoiceType | "")}
            className="sm:max-w-52"
          />

          <div className="mt-4 overflow-x-auto">
            {items.length === 0 && !loading ? (
              <div className="py-12 text-center text-gray-400 dark:text-dark-300">Fatura yok.</div>
            ) : (
              <Table hoverable className="w-full text-left">
                <THead>
                  <Tr>
                    <Th>Tarih</Th>
                    <Th>Tip</Th>
                    <Th>Fatura No</Th>
                    <Th>Araç</Th>
                    <Th className="text-right">Tutar</Th>
                    <Th>Entegrasyon</Th>
                    <Th className="text-right">İşlem</Th>
                  </Tr>
                </THead>
                <TBody>
                  {items.map((r) => {
                    const next = r.integrationStatus ? NEXT_STATUS[r.integrationStatus] : undefined;
                    return (
                      <Tr key={`${r.type}-${r.id}`}>
                        <Td>{fmtDate(r.invoiceDate)}</Td>
                        <Td>
                          <Tag color={r.type === "purchase" ? "info" : r.type === "sales" ? "success" : "secondary"}>
                            {INVOICE_TYPE_LABELS[r.type]}
                          </Tag>
                        </Td>
                        <Td className="font-mono text-xs">{r.invoiceNo}</Td>
                        <Td>{plateMap[r.vehicleId] ?? "—"}</Td>
                        <Td className="text-right font-medium">{money(r.total)}</Td>
                        <Td>
                          {r.integrationStatus && (
                            <Tag color={INTEGRATION_COLOR[r.integrationStatus]}>
                              {INTEGRATION_LABELS[r.integrationStatus]}
                            </Tag>
                          )}
                        </Td>
                        <Td className="text-right">
                          {canWrite && next && (
                            <Button variant="outlined" className="py-1 text-xs" onClick={() => advance(r)}>
                              → {INTEGRATION_LABELS[next]}
                            </Button>
                          )}
                        </Td>
                      </Tr>
                    );
                  })}
                </TBody>
              </Table>
            )}
            <InfiniteSentinel onReach={loadMore} hasMore={hasMore} loading={loading} />
          </div>
        </Card>
      </div>

      <InvoiceForm open={formOpen} onClose={() => setFormOpen(false)} onSaved={() => setRefreshKey((k) => k + 1)} />
    </Page>
  );
}
