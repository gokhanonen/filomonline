import { useCallback, useState } from "react";
import {
  MagnifyingGlassIcon,
  PencilSquareIcon,
  PlusIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
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
  RENTAL_STATUS_COLOR,
  RENTAL_STATUS_LABELS,
  type RentalContract,
  type RentalContractStatus,
} from "@/@types/rental";
import { cancelRental, listRentals } from "@/services/rentalService";
import { RentalForm } from "./RentalForm";

const PAGE_SIZE = 30;

const statusFilter = [
  { value: "", label: "Tüm durumlar" },
  ...Object.keys(RENTAL_STATUS_LABELS).map((k) => ({
    value: k,
    label: RENTAL_STATUS_LABELS[k as RentalContractStatus],
  })),
];

function money(v: string): string {
  return Number(v).toLocaleString("tr-TR", { minimumFractionDigits: 0 }) + " ₺";
}
function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString("tr-TR");
}

export default function RentalsPage() {
  const { can } = useAuthContext();
  const canWrite = can("rentals.write");
  const canDelete = can("rentals.delete");

  const [status, setStatus] = useState<RentalContractStatus | "">("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RentalContract | null>(null);

  const fetchPage = useCallback(
    (page: number) => {
      void refreshKey;
      return listRentals({ page, pageSize: PAGE_SIZE, status: status || undefined });
    },
    [status, refreshKey],
  );

  const { items, total, loading, hasMore, loadMore } =
    useInfiniteList<RentalContract>(fetchPage);

  const handleCancel = async (r: RentalContract) => {
    if (!window.confirm(`${r.customerName} sözleşmesi iptal edilsin mi?`)) return;
    try {
      await cancelRental(r.id);
      toast.success("Sözleşme iptal edildi");
      setRefreshKey((k) => k + 1);
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? "İşlem başarısız");
    }
  };

  return (
    <Page title="Kiralama">
      <div className="w-full px-(--margin-x) py-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-medium text-gray-800 dark:text-dark-50">Kira Sözleşmeleri</h2>
            <p className="text-sm text-gray-400 dark:text-dark-300">{total} sözleşme</p>
          </div>
          {canWrite && (
            <Button
              color="primary"
              isIcon
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
              className="size-9.5 rounded-lg shrink-0 shadow-xs"
              title="Yeni Sözleşme"
              aria-label="Yeni Sözleşme"
            >
              <PlusIcon className="size-5" />
            </Button>
          )}
        </div>

        <Card className="mt-4 p-4">
          <Select
            data={statusFilter}
            value={status}
            onChange={(e) => setStatus(e.target.value as RentalContractStatus | "")}
            prefix={<MagnifyingGlassIcon className="size-5" />}
            className="sm:max-w-48"
          />

          <div className="mt-4 overflow-x-auto">
            {items.length === 0 && !loading ? (
              <div className="py-12 text-center text-gray-400 dark:text-dark-300">Kayıt bulunamadı.</div>
            ) : (
              <Table hoverable className="w-full text-left">
                <THead>
                  <Tr>
                    <Th>Müşteri</Th>
                    <Th>Süre</Th>
                    <Th className="text-right">Aylık</Th>
                    <Th>Başlangıç</Th>
                    <Th>Durum</Th>
                    <Th className="text-right">İşlem</Th>
                  </Tr>
                </THead>
                <TBody>
                  {items.map((r) => (
                    <Tr key={r.id}>
                      <Td className="font-medium text-gray-800 dark:text-dark-100">{r.customerName}</Td>
                      <Td>{r.durationMonths} ay</Td>
                      <Td className="text-right">{money(r.monthlyPrice)}</Td>
                      <Td>{fmtDate(r.startDate)}</Td>
                      <Td><Tag color={RENTAL_STATUS_COLOR[r.status]}>{RENTAL_STATUS_LABELS[r.status]}</Tag></Td>
                      <Td className="text-right">
                        <div className="flex justify-end gap-1">
                          {canWrite && (
                            <button type="button" onClick={() => { setEditing(r); setFormOpen(true); }} className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-primary-600 dark:text-dark-300 dark:hover:bg-dark-600" title="Düzenle">
                              <PencilSquareIcon className="size-4.5" />
                            </button>
                          )}
                          {canDelete && r.status !== "CANCELLED" && (
                            <button type="button" onClick={() => handleCancel(r)} className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-error dark:text-dark-300 dark:hover:bg-dark-600" title="İptal et">
                              <XCircleIcon className="size-4.5" />
                            </button>
                          )}
                        </div>
                      </Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            )}
            <InfiniteSentinel onReach={loadMore} hasMore={hasMore} loading={loading} />
          </div>
        </Card>
      </div>

      <RentalForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={() => setRefreshKey((k) => k + 1)}
        rental={editing}
      />
    </Page>
  );
}
