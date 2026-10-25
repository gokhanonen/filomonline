import { useCallback, useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { MagnifyingGlassIcon, PlusIcon, SparklesIcon } from "@heroicons/react/24/outline";
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
import { VehicleDocumentsModal } from "./VehicleDocumentsModal";
import { VehiclePreviewModal } from "./VehiclePreviewModal";
import { ExpenseForm } from "@/app/pages/expenses/ExpenseForm";
import { InvoiceForm } from "@/app/pages/invoices/InvoiceForm";
import { RentalForm } from "@/app/pages/rentals/RentalForm";
import { VehicleTransferModal } from "./VehicleTransferModal";

const PAGE_SIZE = 24;

const statusFilterOptions = [
  { value: "", label: "Tüm durumlar" },
  ...(Object.keys(VEHICLE_STATUS_LABELS) as VehicleStatus[]).map((k) => ({
    value: k,
    label: VEHICLE_STATUS_LABELS[k],
  })),
];

export default function VehiclesPage() {
  const { can } = useAuthContext();
  const canWrite = can("vehicles.write");
  const canDelete = can("vehicles.delete");
  const canRental = can("rentals.write") || canWrite;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlSearch = searchParams.get("search") || "";
  const minPriceParam = searchParams.get("minPrice");
  const maxPriceParam = searchParams.get("maxPrice");
  const minYearParam = searchParams.get("minYear");
  const transmissionParam = searchParams.get("transmission");
  const statusParam = searchParams.get("status");

  const hasAiFilter = Boolean(minPriceParam || maxPriceParam || minYearParam || transmissionParam);

  const [search, setSearch] = useState(urlSearch);
  const [debounced, setDebounced] = useState(urlSearch);
  const [statusFilter, setStatusFilter] = useState<VehicleStatus | "">("");

  useEffect(() => {
    if (statusParam) {
      setStatusFilter(statusParam as VehicleStatus);
    }
  }, [statusParam]);

  useEffect(() => {
    if (searchParams.get("openNew") === "1") {
      const prefillStr = sessionStorage.getItem("filomonline_ai_vehicle_prefill");
      if (prefillStr) {
        try {
          const parsed = JSON.parse(prefillStr);
          setCloningVehicle(parsed as unknown as Vehicle);
          sessionStorage.removeItem("filomonline_ai_vehicle_prefill");
        } catch {}
      }
      setEditing(null);
      setFormOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    const s = searchParams.get("search");
    if (s !== null) {
      setSearch(s);
      setDebounced(s);
    }
  }, [searchParams]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [cloningVehicle, setCloningVehicle] = useState<Vehicle | null>(null);
  const [contractVehicle, setContractVehicle] = useState<Vehicle | null>(null);
  const [expenseVehicle, setExpenseVehicle] = useState<Vehicle | null>(null);
  const [saleVehicle, setSaleVehicle] = useState<Vehicle | null>(null);
  const [linksVehicle, setLinksVehicle] = useState<Vehicle | null>(null);
  const [optionVehicle, setOptionVehicle] = useState<Vehicle | null>(null);
  const [waVehicle, setWaVehicle] = useState<Vehicle | null>(null);
  const [docsVehicle, setDocsVehicle] = useState<Vehicle | null>(null);
  const [transferVehicle, setTransferVehicle] = useState<Vehicle | null>(null);
  const [previewVehicle, setPreviewVehicle] = useState<Vehicle | null>(null);
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

  const { items, loading, hasMore, loadMore, removeItem, updateItem } =
    useInfiniteList<Vehicle>(fetchPage);

  const displayedItems = items.filter((v) => {
    if (minYearParam && v.year && v.year < parseInt(minYearParam, 10)) return false;
    if (transmissionParam && v.transmission && v.transmission.toLowerCase() !== transmissionParam.toLowerCase()) return false;
    const price = Number(v.listPrice || v.purchasePrice || 0);
    if (minPriceParam && price < parseFloat(minPriceParam)) return false;
    if (maxPriceParam && price > parseFloat(maxPriceParam)) return false;
    return true;
  });

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
    <Page title="Operasyon">
      <div className="w-full px-(--margin-x) py-6">
        {/* Filtreler ve Eylemler */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center flex-1">
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
          {canWrite && (
            <Button
              color="primary"
              isIcon
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
              className="size-9.5 rounded-lg shrink-0 self-start sm:self-auto shadow-xs"
              title="Yeni Araç"
              aria-label="Yeni Araç"
            >
              <PlusIcon className="size-5" />
            </Button>
          )}
        </div>

        {/* AI Filtreleme Aktif Bildirim Bandı */}
        {hasAiFilter && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary-200 bg-primary-50/80 px-4 py-2.5 text-xs text-primary-900 shadow-2xs dark:border-primary-900/60 dark:bg-primary-950/40 dark:text-primary-200">
            <div className="flex items-center gap-2">
              <SparklesIcon className="size-4.5 text-primary-600 dark:text-primary-400 shrink-0" />
              <span>
                <strong>Yapay Zeka Filtresi:</strong>{" "}
                {[
                  minYearParam && `${minYearParam}+ Model`,
                  transmissionParam && (transmissionParam.toUpperCase() === "OTOMATIK" ? "Otomatik Vites" : "Manuel"),
                  minPriceParam && maxPriceParam && `${Number(minPriceParam).toLocaleString("tr-TR")} ₺ - ${Number(maxPriceParam).toLocaleString("tr-TR")} ₺`,
                  "Stoktaki Araçlar",
                ].filter(Boolean).join(" • ")}{" "}
                ({displayedItems.length} araç listelendi)
              </span>
            </div>
            <Button
              variant="flat"
              onClick={() => navigate("/vehicles")}
              className="h-6.5 rounded-md px-2.5 text-[11px] font-semibold text-primary-700 hover:bg-primary-100 dark:text-primary-300 dark:hover:bg-primary-900/50"
            >
              Filtreyi Temizle
            </Button>
          </div>
        )}

        {/* Kart ızgarası + infinite scroll */}
        {displayedItems.length === 0 && !loading ? (
          <div className="py-16 text-center text-gray-400 dark:text-dark-300">Araç bulunamadı.</div>
        ) : (
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {displayedItems.map((v) => (
              <VehicleCard
                key={v.id}
                vehicle={v}
                sources={sources}
                onView={() => setPreviewVehicle(v)}
                onEdit={() => {
                  setEditing(v);
                  setFormOpen(true);
                }}
                onAddExpense={() => setExpenseVehicle(v)}
                onSale={() => setSaleVehicle(v)}
                onContract={canRental ? () => setContractVehicle(v) : undefined}
                onLinks={() => setLinksVehicle(v)}
                onOption={canWrite ? () => setOptionVehicle(v) : undefined}
                onWhatsApp={() => setWaVehicle(v)}
                onDocuments={() => setDocsVehicle(v)}
                onCopy={canWrite ? () => setCloningVehicle(v) : undefined}
                onTransfer={canWrite ? () => setTransferVehicle(v) : undefined}
                onDelete={canDelete && v.isActive ? () => handleDelete(v) : undefined}
              />
            ))}
            <InfiniteSentinel onReach={loadMore} hasMore={hasMore} loading={loading} />
          </div>
        )}
      </div>

      <VehicleForm
        open={formOpen || !!cloningVehicle}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
          setCloningVehicle(null);
        }}
        onSaved={() => setRefreshKey((k) => k + 1)}
        vehicle={cloningVehicle || editing}
        isClone={!!cloningVehicle}
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

      {/* Karttaki "Sözleşme" — kira sözleşmesi, araç ön-seçili */}
      <RentalForm
        open={!!contractVehicle}
        onClose={() => setContractVehicle(null)}
        onSaved={() => setRefreshKey((k) => k + 1)}
        initialVehicleId={contractVehicle?.id}
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

      {/* Evraklar modalı — tekerlek menüden doğrudan evrak yükleme/yönetme */}
      <VehicleDocumentsModal
        open={!!docsVehicle}
        onClose={() => setDocsVehicle(null)}
        vehicle={docsVehicle}
      />

      {/* Araç Önizleme Modalı — tekerlek menüdeki göz (önizle) butonu */}
      <VehiclePreviewModal
        open={!!previewVehicle}
        onClose={() => setPreviewVehicle(null)}
        vehicle={previewVehicle}
        sources={sources}
        onEdit={(v) => {
          setEditing(v);
          setFormOpen(true);
        }}
        onCopy={canWrite ? (v) => setCloningVehicle(v) : undefined}
        onWhatsApp={(v) => setWaVehicle(v)}
        onDocuments={(v) => setDocsVehicle(v)}
        onExpense={(v) => setExpenseVehicle(v)}
        onOption={canWrite ? (v) => setOptionVehicle(v) : undefined}
        onContract={canRental ? (v) => setContractVehicle(v) : undefined}
        onTransfer={canWrite ? (v) => setTransferVehicle(v) : undefined}
      />

      {/* Lokasyon Transfer Modalı — tekerlek menüdeki lokasyon butonu */}
      <VehicleTransferModal
        open={!!transferVehicle}
        onClose={() => setTransferVehicle(null)}
        vehicle={transferVehicle}
        onSuccess={() => setRefreshKey((k) => k + 1)}
      />
    </Page>
  );
}
