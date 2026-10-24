import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { MagnifyingGlassIcon, PlusIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";

import { Page } from "@/components/shared/Page";
import { Button, Input, Select } from "@/components/ui";
import { InfiniteSentinel } from "@/components/shared/InfiniteSentinel";
import { useInfiniteList } from "@/hooks/useInfiniteList";
import { useAuthContext } from "@/app/contexts/auth/context";
import {
  VEHICLE_STATUS_LABELS,
  type Vehicle,
  type VehicleStatus,
} from "@/@types/vehicle";
import type { ListingSource } from "@/@types/catalog";
import { deactivateVehicle, listVehicles } from "@/services/vehicleService";
import { listListingSources } from "@/services/catalogService";
import { VehicleCard } from "./VehicleCard";
import { VehicleForm } from "./VehicleForm";
import { ListingLinksModal } from "./ListingLinksModal";
import { VehicleOptionModal } from "./VehicleOptionModal";
import { WhatsAppModal } from "./WhatsAppModal";
import { ExpenseForm } from "@/app/pages/expenses/ExpenseForm";
import { InvoiceForm } from "@/app/pages/invoices/InvoiceForm";

const PAGE_SIZE = 24;

const statusFilterOptions = [
  { value: "", label: "Tüm durumlar" },
  ...(Object.keys(VEHICLE_STATUS_LABELS) as VehicleStatus[]).map((k) => ({
    value: k,
    label: VEHICLE_STATUS_LABELS[k],
  })),
];

export default function VehiclesPage() {
  const navigate = useNavigate();
  const { can } = useAuthContext();
  const canWrite = can("vehicles.write");
  const canDelete = can("vehicles.delete");

  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [statusFilter, setStatusFilter] = useState<VehicleStatus | "">("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [expenseVehicle, setExpenseVehicle] = useState<Vehicle | null>(null);
  const [saleVehicle, setSaleVehicle] = useState<Vehicle | null>(null);
  const [linksVehicle, setLinksVehicle] = useState<Vehicle | null>(null);
  const [optionVehicle, setOptionVehicle] = useState<Vehicle | null>(null);
  const [waVehicle, setWaVehicle] = useState<Vehicle | null>(null);
  const [sources, setSources] = useState<ListingSource[]>([]);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    listListingSources().then(setSources).catch(() => void 0);
  }, []);

  const fetchPage = useCallback(
    (page: number) => {
      void refreshKey; // kayıt sonrası yeniden yükleme tetikleyici
      return listVehicles({
        page,
        pageSize: PAGE_SIZE,
        search: debounced || undefined,
        status: statusFilter || undefined,
      });
    },
    [debounced, statusFilter, refreshKey],
  );

  const { items, total, loading, hasMore, loadMore, removeItem, updateItem } =
    useInfiniteList<Vehicle>(fetchPage);

  const handleDelete = async (v: Vehicle) => {
    if (!window.confirm(`${v.plate} pasifleştirilsin mi?`)) return;
    try {
      await deactivateVehicle(v.id);
      toast.success("Araç pasifleştirildi");
      removeItem((x) => x.id === v.id);
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? "İşlem başarısız");
    }
  };

  return (
    <Page title="Araç Operasyon">
      <div className="w-full px-(--margin-x) py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-medium text-gray-800 dark:text-dark-50">Araç Operasyon</h2>
            <p className="text-sm text-gray-400 dark:text-dark-300">{total} araç</p>
          </div>
          {canWrite && (
            <Button
              color="primary"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
              className="gap-2"
            >
              <PlusIcon className="size-5" /> Yeni Araç
            </Button>
          )}
        </div>

        {/* Filtreler */}
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Input
            placeholder="Plaka, marka, model, şase ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            prefix={<MagnifyingGlassIcon className="size-5" />}
            className="sm:max-w-xs"
          />
          <Select
            data={statusFilterOptions}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as VehicleStatus | "")}
            className="sm:max-w-48"
          />
        </div>

        {/* Kart ızgarası + infinite scroll */}
        {items.length === 0 && !loading ? (
          <div className="py-16 text-center text-gray-400 dark:text-dark-300">Araç bulunamadı.</div>
        ) : (
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {items.map((v) => (
              <VehicleCard
                key={v.id}
                vehicle={v}
                sources={sources}
                onView={() => navigate(`/vehicles/${v.id}`)}
                onEdit={() => {
                  setEditing(v);
                  setFormOpen(true);
                }}
                onAddExpense={() => setExpenseVehicle(v)}
                onSale={() => setSaleVehicle(v)}
                onLinks={() => setLinksVehicle(v)}
                onOption={canWrite ? () => setOptionVehicle(v) : undefined}
                onWhatsApp={() => setWaVehicle(v)}
                onDelete={canDelete && v.isActive ? () => handleDelete(v) : undefined}
              />
            ))}
            <InfiniteSentinel onReach={loadMore} hasMore={hasMore} loading={loading} />
          </div>
        )}
      </div>

      <VehicleForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={() => setRefreshKey((k) => k + 1)}
        vehicle={editing}
      />

      {/* Karttaki "Masraf Ekle" — araç ön-seçili */}
      <ExpenseForm
        open={!!expenseVehicle}
        onClose={() => setExpenseVehicle(null)}
        onSaved={() => setRefreshKey((k) => k + 1)}
        initialVehicleId={expenseVehicle?.id}
      />

      {/* Karttaki "Satış Yap" — satış faturası, araç ön-seçili */}
      <InvoiceForm
        open={!!saleVehicle}
        onClose={() => setSaleVehicle(null)}
        onSaved={() => setRefreshKey((k) => k + 1)}
        initialVehicleId={saleVehicle?.id}
        initialType="sales"
      />

      {/* İlan linkleri — kart yerinde güncellenir, liste yeniden yüklenmez */}
      <ListingLinksModal
        open={!!linksVehicle}
        onClose={() => setLinksVehicle(null)}
        vehicle={linksVehicle}
        sources={sources}
        onChanged={(urls) =>
          linksVehicle &&
          updateItem((x) => x.id === linksVehicle.id, (x) => ({ ...x, listingUrls: urls }))
        }
      />

      {/* Opsiyon (kapora / rezervasyon) */}
      <VehicleOptionModal
        open={!!optionVehicle}
        onClose={() => setOptionVehicle(null)}
        vehicle={optionVehicle}
        onChanged={(active) =>
          optionVehicle &&
          updateItem((x) => x.id === optionVehicle.id, (x) => ({ ...x, activeOption: active }))
        }
      />

      {/* WhatsApp ile araç bilgisi gönder */}
      <WhatsAppModal open={!!waVehicle} onClose={() => setWaVehicle(null)} vehicle={waVehicle} />
    </Page>
  );
}
