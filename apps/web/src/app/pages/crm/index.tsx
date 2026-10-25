import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router";
import {
  PlusIcon,
  MagnifyingGlassIcon,
  Squares2X2Icon,
  ViewColumnsIcon,
  ListBulletIcon,
  UserGroupIcon,
  CalendarDaysIcon,
  DocumentCheckIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
import clsx from "clsx";

import { Page } from "@/components/shared/Page";
import { Button, Card, Input, Select, Spinner } from "@/components/ui";
import {
  listLeads,
  type Lead,
} from "@/services/crmService";
import { LeadCardGrid } from "./LeadCardGrid";
import { KanbanView } from "./KanbanView";
import { TableView } from "./TableView";
import { NewLeadModal } from "./NewLeadModal";
import { LeadDetailModal } from "./LeadDetailModal";
import { LEAD_SOURCE_CONFIG, LEAD_STATUS_CONFIG } from "./constants";

export default function CrmPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  // Görünüm: "grid" (4'lü Kart Izgarası) | "kanban" | "table"
  const [viewMode, setViewMode] = useState<"grid" | "kanban" | "table">("grid");

  // Filtreler
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [sourceFilter, setSourceFilter] = useState<string>("ALL");

  // Modallar
  const [showNewLeadModal, setShowNewLeadModal] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await listLeads();
      setLeads(data);
    } catch {
      toast.error("Potansiyel alıcılar yüklenemedi.");
    } finally {
      setLoading(false);
    }
  };

  const [searchParams] = useSearchParams();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (searchParams.get("openNew") === "1") {
      setShowNewLeadModal(true);
    }
  }, [searchParams]);

  // İstemci tarafı arama & filtreleme
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      if (statusFilter !== "ALL" && lead.status !== statusFilter) return false;
      if (sourceFilter !== "ALL" && lead.source !== sourceFilter) return false;
      if (search.trim()) {
        const term = search.toLowerCase();
        const inName = lead.fullName.toLowerCase().includes(term);
        const inPhone = lead.phone?.toLowerCase().includes(term) ?? false;
        const inNotes = lead.notes?.toLowerCase().includes(term) ?? false;
        const inVehicles =
          lead.interestedVehicles?.some(
            (iv) =>
              iv.vehicle?.plate?.toLowerCase().includes(term) ||
              iv.vehicle?.brandName?.toLowerCase().includes(term) ||
              iv.vehicle?.modelName?.toLowerCase().includes(term),
          ) ?? false;
        if (!inName && !inPhone && !inNotes && !inVehicles) return false;
      }
      return true;
    });
  }, [leads, search, statusFilter, sourceFilter]);

  // KPI İstatistikleri
  const totalCount = leads.length;
  const activeCount = leads.filter(
    (l) => l.status !== "CONVERTED" && l.status !== "LOST",
  ).length;
  const testDriveCount = leads.filter((l) => l.status === "TEST_DRIVE").length;
  const quoteCount = leads.filter(
    (l) => l.status === "QUOTE_SENT" || l.status === "NEGOTIATION",
  ).length;
  const convertedCount = leads.filter((l) => l.status === "CONVERTED").length;

  return (
    <Page title="CRM">
      <div className="w-full px-(--margin-x) py-6 space-y-6">
        {/* Üst Başlık & Aksiyon */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-bold text-gray-900 dark:text-dark-50">
                CRM & Satış Yönetimi
              </h2>
              <span className="rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-bold text-primary-600 dark:bg-primary-950/40 dark:text-primary-300">
                {totalCount} Potansiyel
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-dark-300">
              Araç alıcı potansiyelleri, deneme sürüşü randevuları, teklif hazırlama ve müşteri kazanımı
            </p>
          </div>

          <Button
            color="primary"
            isIcon
            className="size-9.5 rounded-lg shrink-0 shadow-xs"
            onClick={() => setShowNewLeadModal(true)}
            title="Yeni Potansiyel Ekle"
            aria-label="Yeni Potansiyel Ekle"
          >
            <PlusIcon className="size-5" />
          </Button>
        </div>

        {/* KPI Sayaç Kartları */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card className="flex items-center gap-3.5 p-4 bg-white dark:bg-dark-750 border border-gray-200/80 dark:border-dark-600 shadow-2xs rounded-xl">
            <div className="flex size-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
              <UserGroupIcon className="size-6" />
            </div>
            <div>
              <div className="text-xs font-medium text-gray-500 dark:text-dark-300">
                Aktif Görüşme
              </div>
              <div className="text-lg font-bold text-gray-900 dark:text-dark-50">
                {activeCount}
              </div>
            </div>
          </Card>

          <Card className="flex items-center gap-3.5 p-4 bg-white dark:bg-dark-750 border border-gray-200/80 dark:border-dark-600 shadow-2xs rounded-xl">
            <div className="flex size-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300">
              <CalendarDaysIcon className="size-6" />
            </div>
            <div>
              <div className="text-xs font-medium text-gray-500 dark:text-dark-300">
                Deneme Sürüşü
              </div>
              <div className="text-lg font-bold text-gray-900 dark:text-dark-50">
                {testDriveCount}
              </div>
            </div>
          </Card>

          <Card className="flex items-center gap-3.5 p-4 bg-white dark:bg-dark-750 border border-gray-200/80 dark:border-dark-600 shadow-2xs rounded-xl">
            <div className="flex size-11 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-300">
              <DocumentCheckIcon className="size-6" />
            </div>
            <div>
              <div className="text-xs font-medium text-gray-500 dark:text-dark-300">
                Verilen Teklif
              </div>
              <div className="text-lg font-bold text-gray-900 dark:text-dark-50">
                {quoteCount}
              </div>
            </div>
          </Card>

          <Card className="flex items-center gap-3.5 p-4 bg-white dark:bg-dark-750 border border-gray-200/80 dark:border-dark-600 shadow-2xs rounded-xl">
            <div className="flex size-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300">
              <CheckCircleIcon className="size-6" />
            </div>
            <div>
              <div className="text-xs font-medium text-gray-500 dark:text-dark-300">
                Kazanılan Müşteri
              </div>
              <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                {convertedCount}
              </div>
            </div>
          </Card>
        </div>

        {/* Kontrol & Filtre Araç Çubuğu */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <div className="w-full sm:w-64">
              <Input
                placeholder="Potansiyel adı, telefon, plaka ara..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                prefix={<MagnifyingGlassIcon className="size-4 text-gray-400" />}
              />
            </div>

            <Select
              className="w-36 text-xs"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              data={[
                { value: "ALL", label: "Tüm Aşamalar" },
                ...Object.entries(LEAD_STATUS_CONFIG).map(([val, cfg]) => ({
                  value: val,
                  label: cfg.label,
                })),
              ]}
            />

            <Select
              className="w-36 text-xs"
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              data={[
                { value: "ALL", label: "Tüm Kaynaklar" },
                ...Object.entries(LEAD_SOURCE_CONFIG).map(([val, cfg]) => ({
                  value: val,
                  label: cfg.label,
                })),
              ]}
            />
          </div>

          {/* Görünüm Değiştirici: 4'lü Kart Izgarası vs Kanban vs Liste */}
          <div className="flex items-center gap-1 rounded-xl bg-gray-100 p-1 dark:bg-dark-800">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={clsx(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                viewMode === "grid"
                  ? "bg-white text-gray-900 shadow-xs dark:bg-dark-700 dark:text-white"
                  : "text-gray-500 hover:text-gray-900 dark:text-dark-300 dark:hover:text-white",
              )}
            >
              <Squares2X2Icon className="size-4" />
              <span>Kart Görünümü (4'lü)</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("kanban")}
              className={clsx(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                viewMode === "kanban"
                  ? "bg-white text-gray-900 shadow-xs dark:bg-dark-700 dark:text-white"
                  : "text-gray-500 hover:text-gray-900 dark:text-dark-300 dark:hover:text-white",
              )}
            >
              <ViewColumnsIcon className="size-4" />
              <span>Satış Hunisi (Kanban)</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={clsx(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                viewMode === "table"
                  ? "bg-white text-gray-900 shadow-xs dark:bg-dark-700 dark:text-white"
                  : "text-gray-500 hover:text-gray-900 dark:text-dark-300 dark:hover:text-white",
              )}
            >
              <ListBulletIcon className="size-4" />
              <span>Liste Görünümü</span>
            </button>
          </div>
        </div>

        {/* Ana İçerik */}
        {loading ? (
          <div className="flex justify-center py-24">
            <Spinner className="size-8" />
          </div>
        ) : viewMode === "grid" ? (
          <LeadCardGrid
            leads={filteredLeads}
            onSelectLead={(id) => setSelectedLeadId(id)}
            onRefresh={loadData}
          />
        ) : viewMode === "kanban" ? (
          <KanbanView
            leads={filteredLeads}
            onSelectLead={(id) => setSelectedLeadId(id)}
            onRefresh={loadData}
          />
        ) : (
          <TableView
            leads={filteredLeads}
            onSelectLead={(id) => setSelectedLeadId(id)}
          />
        )}

        {/* Modallar */}
        <NewLeadModal
          open={showNewLeadModal}
          onClose={() => setShowNewLeadModal(false)}
          onSuccess={loadData}
        />

        <LeadDetailModal
          leadId={selectedLeadId}
          open={Boolean(selectedLeadId)}
          onClose={() => setSelectedLeadId(null)}
          onRefresh={loadData}
        />
      </div>
    </Page>
  );
}
