import { useCallback, useEffect, useState } from "react";
import {
  MagnifyingGlassIcon,
  PencilSquareIcon,
  PlusIcon,
  PrinterIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { TbKey, TbReceipt, TbTemplate } from "react-icons/tb";
import { toast } from "sonner";

import { Page } from "@/components/shared/Page";
import {
  Button,
  Card,
  Input,
  Select,
  Spinner,
  Table,
  Tag,
  TBody,
  Td,
  Th,
  THead,
  Tr,
} from "@/components/ui";
import { InfiniteSentinel } from "@/components/shared/InfiniteSentinel";
import { useInfiniteList } from "@/hooks/useInfiniteList";
import { useAuthContext } from "@/app/contexts/auth/context";
import {
  cancelRentalContract,
  cancelSalesContract,
  deleteContractTemplate,
  listContractTemplates,
  listRentalContracts,
  listSalesContracts,
} from "@/services/contractService";
import {
  RENTAL_STATUS_COLOR,
  RENTAL_STATUS_LABELS,
  SALES_STATUS_COLOR,
  SALES_STATUS_LABELS,
  type ContractKind,
  type ContractTemplate,
  type RentalContract,
  type RentalContractStatus,
  type SalesContract,
  type SalesContractStatus,
} from "@/@types/contract";
import { SalesContractFormModal } from "./SalesContractFormModal";
import { RentalContractFormModal } from "./RentalContractFormModal";
import { ContractPrintModal } from "./ContractPrintModal";
import { ContractTemplateModal } from "./ContractTemplateModal";

const PAGE_SIZE = 30;

function money(v?: number | string | null): string {
  if (v === null || v === undefined) return "—";
  return Number(v).toLocaleString("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + " ₺";
}

function fmtDate(d?: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("tr-TR");
}

export default function ContractsPage() {
  const { can } = useAuthContext();
  const canWrite = can("rentals.write");

  const [activeTab, setActiveTab] = useState<"sales" | "rental" | "templates">("sales");
  const [search, setSearch] = useState("");
  const [salesStatus, setSalesStatus] = useState<SalesContractStatus | "">("");
  const [rentalStatus, setRentalStatus] = useState<RentalContractStatus | "">("");
  const [refreshKey, setRefreshKey] = useState(0);

  // Modallar
  const [salesModalOpen, setSalesModalOpen] = useState(false);
  const [editingSalesId, setEditingSalesId] = useState<string | undefined>(undefined);

  const [rentalModalOpen, setRentalModalOpen] = useState(false);
  const [editingRentalId, setEditingRentalId] = useState<string | undefined>(undefined);

  const [printModal, setPrintModal] = useState<{
    open: boolean;
    contractType: ContractKind;
    contractId: string;
    documentNo?: string;
  }>({
    open: false,
    contractType: "SALES",
    contractId: "",
  });

  const [templateModal, setTemplateModal] = useState<{
    open: boolean;
    template?: ContractTemplate | null;
  }>({
    open: false,
    template: null,
  });

  // Şablonlar Listesi
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  const loadTemplates = useCallback(() => {
    setLoadingTemplates(true);
    listContractTemplates()
      .then(setTemplates)
      .catch(() => toast.error("Şablonlar yüklenemedi"))
      .finally(() => setLoadingTemplates(false));
  }, []);

  useEffect(() => {
    if (activeTab === "templates") {
      loadTemplates();
    }
  }, [activeTab, loadTemplates, refreshKey]);

  // Satış Sözleşmeleri Infinite List
  const fetchSalesPage = useCallback(
    (page: number) => {
      void refreshKey;
      return listSalesContracts({
        page,
        pageSize: PAGE_SIZE,
        search: search.trim() || undefined,
        status: salesStatus || undefined,
      });
    },
    [search, salesStatus, refreshKey],
  );

  const {
    items: salesItems,
    total: salesTotal,
    loading: salesLoading,
    hasMore: salesHasMore,
    loadMore: salesLoadMore,
  } = useInfiniteList<SalesContract>(fetchSalesPage);

  // Kira Sözleşmeleri Infinite List
  const fetchRentalPage = useCallback(
    (page: number) => {
      void refreshKey;
      return listRentalContracts({
        page,
        pageSize: PAGE_SIZE,
        search: search.trim() || undefined,
        status: rentalStatus || undefined,
      });
    },
    [search, rentalStatus, refreshKey],
  );

  const {
    items: rentalItems,
    total: rentalTotal,
    loading: rentalLoading,
    hasMore: rentalHasMore,
    loadMore: rentalLoadMore,
  } = useInfiniteList<RentalContract>(fetchRentalPage);

  // İptal İşlemleri
  const handleCancelSales = async (c: SalesContract) => {
    if (!window.confirm(`${c.customerName} için düzenlenen ${c.documentNo} nolu satış sözleşmesi iptal edilsin mi?`)) return;
    try {
      await cancelSalesContract(c.id);
      toast.success("Satış sözleşmesi iptal edildi");
      setRefreshKey((k) => k + 1);
    } catch (err: any) {
      toast.error(err.message || "İptal işlemi başarısız");
    }
  };

  const handleCancelRental = async (r: RentalContract) => {
    if (!window.confirm(`${r.customerName} kira sözleşmesi iptal edilsin mi?`)) return;
    try {
      await cancelRentalContract(r.id);
      toast.success("Kira sözleşmesi iptal edildi");
      setRefreshKey((k) => k + 1);
    } catch (err: any) {
      toast.error(err.message || "İptal işlemi başarısız");
    }
  };

  const handleDeleteTemplate = async (t: ContractTemplate) => {
    if (!window.confirm(`"${t.name}" şablonu silinsin mi?`)) return;
    try {
      await deleteContractTemplate(t.id);
      toast.success("Şablon silindi");
      loadTemplates();
    } catch (err: any) {
      toast.error(err.message || "Şablon silinemedi");
    }
  };

  return (
    <Page title="Sözleşmeler">
      <div className="w-full px-(--margin-x) py-6">
        {/* Üst Başlık & Aksiyonlar */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-dark-50">Sözleşmeler</h2>
            <p className="text-sm text-gray-400 dark:text-dark-300">
              Araç Satış & Kapora Sözleşmeleri, Kiralama Sözleşmeleri ve Baskı Şablonları
            </p>
          </div>

          {canWrite && (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                color="primary"
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                onClick={() => {
                  setEditingSalesId(undefined);
                  setSalesModalOpen(true);
                }}
              >
                <PlusIcon className="size-4" /> Yeni Satış Sözleşmesi
              </Button>
              <Button
                color="primary"
                variant="soft"
                className="gap-2"
                onClick={() => {
                  setEditingRentalId(undefined);
                  setRentalModalOpen(true);
                }}
              >
                <PlusIcon className="size-4" /> Yeni Kira Sözleşmesi
              </Button>
            </div>
          )}
        </div>

        {/* TABLAR */}
        <div className="mt-6 flex border-b border-gray-200 dark:border-dark-700">
          <button
            type="button"
            onClick={() => setActiveTab("sales")}
            className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition ${
              activeTab === "sales"
                ? "border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-dark-400 dark:hover:text-dark-200"
            }`}
          >
            <TbReceipt className="size-4" />
            Satış Sözleşmeleri
            <span className="ml-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              {salesTotal}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("rental")}
            className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition ${
              activeTab === "rental"
                ? "border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-dark-400 dark:hover:text-dark-200"
            }`}
          >
            <TbKey className="size-4" />
            Kira Sözleşmeleri
            <span className="ml-1 rounded-full bg-primary-100 px-2 py-0.5 text-xs font-bold text-primary-700 dark:bg-primary-950/40 dark:text-primary-300">
              {rentalTotal}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("templates")}
            className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition ${
              activeTab === "templates"
                ? "border-amber-600 text-amber-600 dark:border-amber-400 dark:text-amber-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-dark-400 dark:hover:text-dark-200"
            }`}
          >
            <TbTemplate className="size-4" />
            Baskı Şablonları
          </button>
        </div>

        {/* 1. SEKME: SATIŞ SÖZLEŞMELERİ */}
        {activeTab === "sales" && (
          <div className="mt-5 space-y-4">
            <Card className="p-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative min-w-[240px] flex-1">
                  <MagnifyingGlassIcon className="absolute left-3 top-2.5 size-4 text-gray-400" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Müşteri adı, evrak no, TCKN veya plaka ile ara..."
                    className="pl-9 text-xs"
                  />
                </div>

                <div className="w-48">
                  <Select
                    value={salesStatus}
                    onChange={(e) => setSalesStatus(e.target.value as SalesContractStatus)}
                    className="text-xs"
                  >
                    <option value="">Tüm Durumlar</option>
                    {Object.entries(SALES_STATUS_LABELS).map(([k, lbl]) => (
                      <option key={k} value={k}>
                        {lbl}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            </Card>

            <Card className="overflow-hidden p-0">
              {salesLoading && salesItems.length === 0 ? (
                <div className="flex justify-center py-20">
                  <Spinner className="size-8 text-emerald-600" />
                </div>
              ) : salesItems.length === 0 ? (
                <div className="py-16 text-center text-sm text-gray-400">
                  Kayıtlı satış sözleşmesi bulunamadı.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <THead>
                      <Tr>
                        <Th>Evrak No & Tarih</Th>
                        <Th>Alıcı (Müşteri)</Th>
                        <Th>Araç</Th>
                        <Th className="text-right">Satış Bedeli</Th>
                        <Th className="text-right">Peşinat / Taksit</Th>
                        <Th>Durum</Th>
                        <Th className="text-right">İşlemler</Th>
                      </Tr>
                    </THead>
                    <TBody>
                      {salesItems.map((c) => {
                        const totalInst = (c.installments || []).reduce(
                          (acc, i) => acc + (Number(i.amount) || 0),
                          0,
                        );
                        const downPayment = Math.max(0, Number(c.grandTotal || c.price) - totalInst);

                        return (
                          <Tr key={c.id}>
                            <Td>
                              <div className="font-mono text-xs font-bold text-gray-900 dark:text-dark-50">
                                {c.documentNo}
                              </div>
                              <div className="text-[11px] text-gray-400">
                                {fmtDate(c.contractDate)}
                              </div>
                            </Td>

                            <Td>
                              <div className="font-semibold text-gray-800 dark:text-dark-100">
                                {c.customerName}
                              </div>
                              <div className="text-[11px] text-gray-400">
                                {c.customerIdentityNumber || c.customerTaxNumber || c.customerPhone || "—"}
                              </div>
                            </Td>

                            <Td>
                              {c.vehicle ? (
                                <div>
                                  <span className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-400">
                                    {c.vehicle.plate}
                                  </span>
                                  <div className="text-[11px] text-gray-500">
                                    {[c.vehicle.brandName, c.vehicle.modelName, c.vehicle.year].filter(Boolean).join(" ")}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-xs text-gray-400">—</span>
                              )}
                            </Td>

                            <Td className="text-right font-mono font-bold text-gray-900 dark:text-dark-50">
                              {money(c.grandTotal || c.price)}
                            </Td>

                            <Td className="text-right text-xs">
                              <div className="font-semibold text-emerald-600">
                                Peşin: {money(downPayment)}
                              </div>
                              <div className="text-[11px] text-blue-600">
                                {c.installments?.length || 0} Taksit ({money(totalInst)})
                              </div>
                            </Td>

                            <Td>
                              <Tag color={SALES_STATUS_COLOR[c.status] || "neutral"}>
                                {SALES_STATUS_LABELS[c.status] || c.status}
                              </Tag>
                            </Td>

                            <Td className="text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  variant="outlined"
                                  className="gap-1.5 py-1 px-2.5 text-xs text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300"
                                  onClick={() =>
                                    setPrintModal({
                                      open: true,
                                      contractType: "SALES",
                                      contractId: c.id,
                                      documentNo: c.documentNo,
                                    })
                                  }
                                >
                                  <PrinterIcon className="size-4" /> Yazdır
                                </Button>

                                {canWrite && (
                                  <Button
                                    variant="flat"
                                    isIcon
                                    className="size-7"
                                    title="Düzenle"
                                    onClick={() => {
                                      setEditingSalesId(c.id);
                                      setSalesModalOpen(true);
                                    }}
                                  >
                                    <PencilSquareIcon className="size-4" />
                                  </Button>
                                )}

                                {canWrite && c.status !== "CANCELLED" && (
                                  <Button
                                    variant="flat"
                                    isIcon
                                    className="size-7 text-rose-500 hover:text-rose-700"
                                    title="İptal Et"
                                    onClick={() => handleCancelSales(c)}
                                  >
                                    <TrashIcon className="size-4" />
                                  </Button>
                                )}
                              </div>
                            </Td>
                          </Tr>
                        );
                      })}
                    </TBody>
                  </Table>
                </div>
              )}
              <InfiniteSentinel onReach={salesLoadMore} hasMore={salesHasMore} loading={salesLoading} />
            </Card>
          </div>
        )}

        {/* 2. SEKME: KİRA SÖZLEŞMELERİ */}
        {activeTab === "rental" && (
          <div className="mt-5 space-y-4">
            <Card className="p-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative min-w-[240px] flex-1">
                  <MagnifyingGlassIcon className="absolute left-3 top-2.5 size-4 text-gray-400" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Müşteri adı, sözleşme no veya plaka ile ara..."
                    className="pl-9 text-xs"
                  />
                </div>

                <div className="w-48">
                  <Select
                    value={rentalStatus}
                    onChange={(e) => setRentalStatus(e.target.value as RentalContractStatus)}
                    className="text-xs"
                  >
                    <option value="">Tüm Durumlar</option>
                    {Object.entries(RENTAL_STATUS_LABELS).map(([k, lbl]) => (
                      <option key={k} value={k}>
                        {lbl}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            </Card>

            <Card className="overflow-hidden p-0">
              {rentalLoading && rentalItems.length === 0 ? (
                <div className="flex justify-center py-20">
                  <Spinner className="size-8 text-primary-600" />
                </div>
              ) : rentalItems.length === 0 ? (
                <div className="py-16 text-center text-sm text-gray-400">
                  Kayıtlı kira sözleşmesi bulunamadı.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <THead>
                      <Tr>
                        <Th>Evrak No & Tarih</Th>
                        <Th>Kiracı (Müşteri)</Th>
                        <Th>Araç</Th>
                        <Th>Süre / KM</Th>
                        <Th className="text-right">Aylık Kira Bedeli</Th>
                        <Th>Durum</Th>
                        <Th className="text-right">İşlemler</Th>
                      </Tr>
                    </THead>
                    <TBody>
                      {rentalItems.map((r) => (
                        <Tr key={r.id}>
                          <Td>
                            <div className="font-mono text-xs font-bold text-gray-900 dark:text-dark-50">
                              {r.documentNo || "—"}
                            </div>
                            <div className="text-[11px] text-gray-400">
                              {fmtDate(r.contractDate)}
                            </div>
                          </Td>

                          <Td>
                            <div className="font-semibold text-gray-800 dark:text-dark-100">
                              {r.customerName}
                            </div>
                            <div className="text-[11px] text-gray-400">
                              {r.customerTcTaxNo || r.customerPhone || "—"}
                            </div>
                          </Td>

                          <Td>
                            {r.vehicle ? (
                              <div>
                                <span className="font-mono text-xs font-bold text-primary-700 dark:text-primary-400">
                                  {r.vehicle.plate}
                                </span>
                                <div className="text-[11px] text-gray-500">
                                  {[r.vehicle.brandName, r.vehicle.modelName].filter(Boolean).join(" ")}
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </Td>

                          <Td className="text-xs text-gray-700 dark:text-dark-200">
                            <div>{r.durationMonths} Ay</div>
                            <div className="text-[11px] text-gray-400">
                              {Number(r.kmLimit || 0).toLocaleString("tr-TR")} KM Sınırı
                            </div>
                          </Td>

                          <Td className="text-right font-mono font-bold text-gray-900 dark:text-dark-50">
                            {money(r.monthlyPrice)}
                          </Td>

                          <Td>
                            <Tag color={RENTAL_STATUS_COLOR[r.status] || "neutral"}>
                              {RENTAL_STATUS_LABELS[r.status] || r.status}
                            </Tag>
                          </Td>

                          <Td className="text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="outlined"
                                className="gap-1.5 py-1 px-2.5 text-xs text-primary-700 bg-primary-50 hover:bg-primary-100 dark:bg-primary-950/40 dark:text-primary-300"
                                onClick={() =>
                                  setPrintModal({
                                    open: true,
                                    contractType: "RENTAL",
                                    contractId: r.id,
                                    documentNo: r.documentNo || undefined,
                                  })
                                }
                              >
                                <PrinterIcon className="size-4" /> Yazdır
                              </Button>

                              {canWrite && (
                                <Button
                                  variant="flat"
                                  isIcon
                                  className="size-7"
                                  title="Düzenle"
                                  onClick={() => {
                                    setEditingRentalId(r.id);
                                    setRentalModalOpen(true);
                                  }}
                                >
                                  <PencilSquareIcon className="size-4" />
                                </Button>
                              )}

                              {canWrite && r.status !== "CANCELLED" && (
                                <Button
                                  variant="flat"
                                  isIcon
                                  className="size-7 text-rose-500 hover:text-rose-700"
                                  title="İptal Et"
                                  onClick={() => handleCancelRental(r)}
                                >
                                  <TrashIcon className="size-4" />
                                </Button>
                              )}
                            </div>
                          </Td>
                        </Tr>
                      ))}
                    </TBody>
                  </Table>
                </div>
              )}
              <InfiniteSentinel onReach={rentalLoadMore} hasMore={rentalHasMore} loading={rentalLoading} />
            </Card>
          </div>
        )}

        {/* 3. SEKME: ŞABLONLAR */}
        {activeTab === "templates" && (
          <div className="mt-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-800 dark:text-dark-50">
                  Baskı ve Çıktı Şablonları
                </h3>
                <p className="text-xs text-gray-400">
                  Sözleşmeler yazdırılırken kullanılan kurumsal HTML tasarımlar
                </p>
              </div>

              {canWrite && (
                <Button
                  color="primary"
                  className="gap-2"
                  onClick={() => setTemplateModal({ open: true, template: null })}
                >
                  <PlusIcon className="size-4" /> Yeni Şablon Ekle
                </Button>
              )}
            </div>

            {loadingTemplates ? (
              <div className="flex justify-center py-20">
                <Spinner className="size-8 text-primary-600" />
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {templates.map((tmpl) => (
                  <Card key={tmpl.id} className="p-5 flex flex-col justify-between border-t-4 border-t-primary-500 shadow-sm">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-semibold text-gray-600 dark:bg-dark-700 dark:text-dark-300">
                          {tmpl.type === "SALES" ? "Satış Sözleşmesi" : "Kira Sözleşmesi"}
                        </span>
                        {tmpl.isDefault && (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                            Varsayılan
                          </span>
                        )}
                      </div>

                      <h4 className="mt-3 font-bold text-gray-900 dark:text-dark-50">{tmpl.name}</h4>
                      <p className="mt-1 text-xs text-gray-400 line-clamp-3">
                        Son Güncelleme: {fmtDate(tmpl.updatedAt)}
                      </p>
                    </div>

                    <div className="mt-5 flex items-center justify-end gap-2 border-t border-gray-100 pt-3 dark:border-dark-700">
                      <Button
                        variant="outlined"
                        className="text-xs"
                        onClick={() => setTemplateModal({ open: true, template: tmpl })}
                      >
                        Şablonu Düzenle
                      </Button>
                      {!tmpl.isDefault && (
                        <Button
                          variant="flat"
                          isIcon
                          className="size-8 text-rose-500 hover:text-rose-700"
                          onClick={() => handleDeleteTemplate(tmpl)}
                          title="Şablonu Sil"
                        >
                          <TrashIcon className="size-4" />
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODALLAR */}
      <SalesContractFormModal
        open={salesModalOpen}
        onClose={() => {
          setSalesModalOpen(false);
          setEditingSalesId(undefined);
        }}
        onSaved={() => {
          setSalesModalOpen(false);
          setEditingSalesId(undefined);
          setRefreshKey((k) => k + 1);
        }}
        editingContractId={editingSalesId}
      />

      <RentalContractFormModal
        open={rentalModalOpen}
        onClose={() => {
          setRentalModalOpen(false);
          setEditingRentalId(undefined);
        }}
        onSaved={() => {
          setRentalModalOpen(false);
          setEditingRentalId(undefined);
          setRefreshKey((k) => k + 1);
        }}
        editingContractId={editingRentalId}
      />

      <ContractPrintModal
        open={printModal.open}
        onClose={() =>
          setPrintModal((prev) => ({ ...prev, open: false }))
        }
        contractType={printModal.contractType}
        contractId={printModal.contractId}
        documentNo={printModal.documentNo}
      />

      <ContractTemplateModal
        open={templateModal.open}
        onClose={() => setTemplateModal({ open: false, template: null })}
        onSaved={() => {
          setTemplateModal({ open: false, template: null });
          loadTemplates();
        }}
        template={templateModal.template}
      />
    </Page>
  );
}
