import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowDownTrayIcon,
  ArrowTrendingUpIcon,
  BanknotesIcon,
  BuildingOffice2Icon,
  ChartBarIcon,
  CheckBadgeIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  TruckIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";

import { Page } from "@/components/shared/Page";
import { Button, Card, Input, Spinner, Table, TBody, Td, Th, THead, Tr } from "@/components/ui";
import {
  getMonthlyTrends,
  getSalesRepPerformance,
  getSummary,
  getVehicleProfitability,
  type MonthlyTrend,
  type ReportSummary,
  type SalesRepPerformance,
  type VehicleProfitabilityItem,
  type VehicleProfitabilitySummary,
} from "@/services/reportService";

function money(v: number): string {
  return (v || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " ₺";
}

type TabType = "overview" | "profitability" | "salesReps";

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<TabType>("overview");

  // Veri durumları
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [trends, setTrends] = useState<MonthlyTrend[]>([]);
  const [profitabilityItems, setProfitabilityItems] = useState<VehicleProfitabilityItem[]>([]);
  const [profitabilitySummary, setProfitabilitySummary] = useState<VehicleProfitabilitySummary | null>(null);
  const [salesReps, setSalesReps] = useState<SalesRepPerformance[]>([]);

  // Yükleme durumları
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [loadingProfitability, setLoadingProfitability] = useState(false);
  const [loadingSalesReps, setLoadingSalesReps] = useState(false);

  // Filtre durumları
  const [profSearch, setProfSearch] = useState("");
  const [profStatus, setProfStatus] = useState<"ALL" | "SATILDI" | "STOKTA">("ALL");

  // Tab 1: Genel Bakış Verilerini Çek
  useEffect(() => {
    setLoadingOverview(true);
    Promise.all([getSummary(), getMonthlyTrends()])
      .then(([s, t]) => {
        setSummary(s);
        setTrends(t);
      })
      .catch((err) => toast.error(err?.message ?? "Özet raporu alınamadı"))
      .finally(() => setLoadingOverview(false));
  }, []);

  // Tab 2: Araç Kârlılık Verilerini Çek
  const fetchProfitability = () => {
    setLoadingProfitability(true);
    getVehicleProfitability({
      status: profStatus === "ALL" ? undefined : profStatus,
      search: profSearch || undefined,
    })
      .then((res) => {
        setProfitabilityItems(res.items);
        setProfitabilitySummary(res.summary);
      })
      .catch((err) => toast.error(err?.message ?? "Kârlılık raporu alınamadı"))
      .finally(() => setLoadingProfitability(false));
  };

  useEffect(() => {
    if (activeTab === "profitability") {
      fetchProfitability();
    }
  }, [activeTab, profStatus]);

  // Tab 3: Satış Temsilcileri Verilerini Çek
  useEffect(() => {
    if (activeTab === "salesReps") {
      setLoadingSalesReps(true);
      getSalesRepPerformance()
        .then(setSalesReps)
        .catch((err) => toast.error(err?.message ?? "Temsilci performansı alınamadı"))
        .finally(() => setLoadingSalesReps(false));
    }
  }, [activeTab]);

  // Arama debouncing
  useEffect(() => {
    if (activeTab !== "profitability") return;
    const timer = setTimeout(() => {
      fetchProfitability();
    }, 350);
    return () => clearTimeout(timer);
  }, [profSearch]);

  // CSV Dışa Aktarma
  const exportToCSV = () => {
    if (profitabilityItems.length === 0) {
      toast.info("Dışa aktarılacak kayıt bulunmuyor.");
      return;
    }
    const headers = [
      "Plaka",
      "Marka",
      "Model",
      "Model Yılı",
      "Durum",
      "Alış Fiyatı (TL)",
      "Masraflar (TL)",
      "Toplam Maliyet (TL)",
      "Satış Fiyatı (TL)",
      "Net Kâr (TL)",
      "Kâr Marjı (%)",
      "Stokta Kalma Süresi (Gün)",
      "Satış Temsilcisi",
    ];

    const rows = profitabilityItems.map((item) => [
      `"${item.plate}"`,
      `"${item.brandName}"`,
      `"${item.modelName}"`,
      item.year ?? "",
      `"${item.status}"`,
      item.purchasePrice,
      item.totalExpenses,
      item.totalCost,
      item.salePrice,
      item.netProfit,
      item.profitMargin,
      item.daysInStock,
      `"${item.salesRep?.name ?? "Atanmamış"}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(";"), ...rows.map((e) => e.join(";"))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `arac_karlilik_raporu_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV dosyası başarıyla indirildi.");
  };

  // Trend grafik maksimum değeri
  const maxTrendRevenue = useMemo(() => {
    return Math.max(...trends.map((t) => t.revenue), 1000);
  }, [trends]);

  return (
    <Page title="BI & Finansal Raporlar">
      <div className="w-full px-(--margin-x) py-6 space-y-6">
        {/* Başlık ve Sekmeler */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-gray-200 dark:border-dark-700 pb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-dark-50">
              BI & Finansal Raporlar
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-dark-300">
              Araç bazlı kârlılık, satış temsilcisi performansları ve kurumsal finans analizleri
            </p>
          </div>

          <div className="flex items-center gap-1 rounded-xl bg-gray-100 p-1 dark:bg-dark-800">
            <button
              type="button"
              onClick={() => setActiveTab("overview")}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-medium transition ${
                activeTab === "overview"
                  ? "bg-white text-gray-900 shadow-sm dark:bg-dark-600 dark:text-white"
                  : "text-gray-600 hover:text-gray-900 dark:text-dark-300 dark:hover:text-white"
              }`}
            >
              <ChartBarIcon className="size-4" />
              Genel Bakış
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("profitability")}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-medium transition ${
                activeTab === "profitability"
                  ? "bg-white text-gray-900 shadow-sm dark:bg-dark-600 dark:text-white"
                  : "text-gray-600 hover:text-gray-900 dark:text-dark-300 dark:hover:text-white"
              }`}
            >
              <BanknotesIcon className="size-4" />
              Araç Net Kârlılık (P&L)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("salesReps")}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-medium transition ${
                activeTab === "salesReps"
                  ? "bg-white text-gray-900 shadow-sm dark:bg-dark-600 dark:text-white"
                  : "text-gray-600 hover:text-gray-900 dark:text-dark-300 dark:hover:text-white"
              }`}
            >
              <UserGroupIcon className="size-4" />
              Satış Temsilcileri
            </button>
          </div>
        </div>

        {/* SEKME 1: GENEL BAKIŞ */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {loadingOverview || !summary ? (
              <div className="flex justify-center py-24">
                <Spinner className="size-8 text-primary" />
              </div>
            ) : (
              <>
                {/* 4 Ana KPI Kartı */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <Card className="p-5 border-l-4 border-l-primary relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-dark-300">
                        Toplam Satış Cirosu
                      </span>
                      <div className="rounded-lg bg-primary/10 p-2 text-primary">
                        <BanknotesIcon className="size-5" />
                      </div>
                    </div>
                    <div className="mt-3 text-2xl font-bold text-gray-900 dark:text-white">
                      {money(summary.toplamSatis)}
                    </div>
                    <div className="mt-1 text-xs text-gray-500 dark:text-dark-400">
                      Toplam {summary.vehicles.satildi} satılan araç
                    </div>
                  </Card>

                  <Card className="p-5 border-l-4 border-l-emerald-500 relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-dark-300">
                        Brüt Kâr
                      </span>
                      <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600">
                        <ArrowTrendingUpIcon className="size-5" />
                      </div>
                    </div>
                    <div className="mt-3 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                      {money(summary.brutKar)}
                    </div>
                    <div className="mt-1 text-xs text-gray-500 dark:text-dark-400">
                      {summary.toplamSatis > 0
                        ? `%${((summary.brutKar / summary.toplamSatis) * 100).toFixed(1)} ciro kâr marjı`
                        : "Henüz satış yok"}
                    </div>
                  </Card>

                  <Card className="p-5 border-l-4 border-l-blue-500 relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-dark-300">
                        Aktif Stok Maliyeti
                      </span>
                      <div className="rounded-lg bg-blue-500/10 p-2 text-blue-600">
                        <TruckIcon className="size-5" />
                      </div>
                    </div>
                    <div className="mt-3 text-2xl font-bold text-gray-900 dark:text-white">
                      {money(summary.stokMaliyeti)}
                    </div>
                    <div className="mt-1 text-xs text-gray-500 dark:text-dark-400">
                      Liste Değeri: {money(summary.stokListeDeğeri)}
                    </div>
                  </Card>

                  <Card className="p-5 border-l-4 border-l-amber-500 relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-dark-300">
                        Toplam Masraflar
                      </span>
                      <div className="rounded-lg bg-amber-500/10 p-2 text-amber-600">
                        <BuildingOffice2Icon className="size-5" />
                      </div>
                    </div>
                    <div className="mt-3 text-2xl font-bold text-gray-900 dark:text-white">
                      {money(summary.toplamMasraf)}
                    </div>
                    <div className="mt-1 text-xs text-gray-500 dark:text-dark-400">
                      {summary.cariSayisi} aktif cari hesap kaydı
                    </div>
                  </Card>
                </div>

                {/* Grafikler & Tablo Dağılımı */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                  {/* Son 6 Ay Satış Trendi Bar Grafiği */}
                  <Card className="p-6 lg:col-span-2">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          Son 6 Aylık Satış & Kâr Trendi
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-dark-400">
                          Aylık satış cirosu ve brüt kâr gerçekleşmeleri
                        </p>
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="size-3 rounded bg-primary" />
                          <span className="text-gray-600 dark:text-dark-300">Ciro</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="size-3 rounded bg-emerald-500" />
                          <span className="text-gray-600 dark:text-dark-300">Kâr</span>
                        </div>
                      </div>
                    </div>

                    {trends.length === 0 ? (
                      <div className="py-12 text-center text-sm text-gray-400">Veri bulunmuyor</div>
                    ) : (
                      <div className="mt-6 flex h-60 items-end gap-3 sm:gap-6 border-b border-gray-200 pb-2 dark:border-dark-700">
                        {trends.map((t, idx) => {
                          const revHeight = Math.max(8, Math.round((t.revenue / maxTrendRevenue) * 180));
                          const profitHeight = Math.max(4, Math.round((Math.max(0, t.profit) / maxTrendRevenue) * 180));

                          return (
                            <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 group">
                              <div className="flex items-end gap-1 w-full justify-center h-48">
                                {/* Ciro Çubuğu */}
                                <div
                                  style={{ height: `${revHeight}px` }}
                                  className="w-4 sm:w-6 rounded-t bg-primary/80 group-hover:bg-primary transition-all relative flex justify-center"
                                  title={`Ciro: ${money(t.revenue)} (${t.salesCount} araç)`}
                                >
                                  <span className="opacity-0 group-hover:opacity-100 transition absolute -top-7 text-[10px] font-semibold bg-gray-900 text-white px-1.5 py-0.5 rounded shadow pointer-events-none whitespace-nowrap z-10">
                                    {money(t.revenue)}
                                  </span>
                                </div>
                                {/* Kâr Çubuğu */}
                                <div
                                  style={{ height: `${profitHeight}px` }}
                                  className="w-4 sm:w-6 rounded-t bg-emerald-500/80 group-hover:bg-emerald-500 transition-all relative flex justify-center"
                                  title={`Kâr: ${money(t.profit)}`}
                                >
                                  <span className="opacity-0 group-hover:opacity-100 transition absolute -top-7 text-[10px] font-semibold bg-emerald-900 text-white px-1.5 py-0.5 rounded shadow pointer-events-none whitespace-nowrap z-10">
                                    {money(t.profit)}
                                  </span>
                                </div>
                              </div>
                              <span className="text-[11px] font-medium text-gray-600 dark:text-dark-300 text-center">
                                {t.month}
                              </span>
                              <span className="text-[10px] text-gray-400">
                                {t.salesCount} araç
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </Card>

                  {/* Filo Dağılımı ve Özet */}
                  <Card className="p-6 flex flex-col justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        Filo Araç Durumu
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-dark-400">
                        Şirket envanterindeki araçların dağılımı
                      </p>

                      <div className="mt-5 space-y-4">
                        <div>
                          <div className="flex justify-between text-sm mb-1.5">
                            <span className="text-gray-600 dark:text-dark-300">Stokta (Satışa Hazır)</span>
                            <span className="font-bold text-gray-900 dark:text-white">{summary.vehicles.stokta}</span>
                          </div>
                          <div className="h-2 rounded-full bg-gray-100 dark:bg-dark-700 overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full"
                              style={{
                                width: `${summary.vehicles.toplam > 0 ? (summary.vehicles.stokta / summary.vehicles.toplam) * 100 : 0}%`,
                              }}
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-sm mb-1.5">
                            <span className="text-gray-600 dark:text-dark-300">Kiralamada</span>
                            <span className="font-bold text-gray-900 dark:text-white">{summary.vehicles.kiralamada}</span>
                          </div>
                          <div className="h-2 rounded-full bg-gray-100 dark:bg-dark-700 overflow-hidden">
                            <div
                              className="h-full bg-amber-500 rounded-full"
                              style={{
                                width: `${summary.vehicles.toplam > 0 ? (summary.vehicles.kiralamada / summary.vehicles.toplam) * 100 : 0}%`,
                              }}
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-sm mb-1.5">
                            <span className="text-gray-600 dark:text-dark-300">Satıldı</span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">{summary.vehicles.satildi}</span>
                          </div>
                          <div className="h-2 rounded-full bg-gray-100 dark:bg-dark-700 overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full"
                              style={{
                                width: `${summary.vehicles.toplam > 0 ? (summary.vehicles.satildi / summary.vehicles.toplam) * 100 : 0}%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 rounded-xl bg-gray-50 p-4 dark:bg-dark-800">
                      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-dark-400">
                        <span>Toplam Araç Sayısı</span>
                        <span className="font-bold text-gray-900 dark:text-white text-sm">{summary.vehicles.toplam}</span>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-dark-400">
                        <span>Aktif Cari Hesaplar</span>
                        <span className="font-bold text-gray-900 dark:text-white text-sm">{summary.cariSayisi}</span>
                      </div>
                    </div>
                  </Card>
                </div>
              </>
            )}
          </div>
        )}

        {/* SEKME 2: ARAÇ BAZLI NET KÂRLILIK (P&L) */}
        {activeTab === "profitability" && (
          <div className="space-y-6">
            {/* Filtre ve Dışa Aktarma Şeridi */}
            <Card className="p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="relative flex-1 max-w-md">
                    <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
                    <Input
                      value={profSearch}
                      onChange={(e) => setProfSearch(e.target.value)}
                      placeholder="Plaka, marka veya model ara..."
                      className="pl-9 text-sm"
                    />
                  </div>

                  <div className="flex items-center gap-1 rounded-lg border border-gray-200 p-1 dark:border-dark-700">
                    <button
                      type="button"
                      onClick={() => setProfStatus("ALL")}
                      className={`px-3 py-1 text-xs font-medium rounded ${
                        profStatus === "ALL"
                          ? "bg-primary text-white"
                          : "text-gray-600 hover:text-gray-900 dark:text-dark-300"
                      }`}
                    >
                      Tümü
                    </button>
                    <button
                      type="button"
                      onClick={() => setProfStatus("SATILDI")}
                      className={`px-3 py-1 text-xs font-medium rounded ${
                        profStatus === "SATILDI"
                          ? "bg-primary text-white"
                          : "text-gray-600 hover:text-gray-900 dark:text-dark-300"
                      }`}
                    >
                      Yalnızca Satılanlar
                    </button>
                    <button
                      type="button"
                      onClick={() => setProfStatus("STOKTA")}
                      className={`px-3 py-1 text-xs font-medium rounded ${
                        profStatus === "STOKTA"
                          ? "bg-primary text-white"
                          : "text-gray-600 hover:text-gray-900 dark:text-dark-300"
                      }`}
                    >
                      Yalnızca Stoktakiler
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={exportToCSV}
                    variant="outlined"
                    className="flex items-center gap-2 text-xs"
                  >
                    <ArrowDownTrayIcon className="size-4" />
                    CSV İndir
                  </Button>
                </div>
              </div>
            </Card>

            {/* Kârlılık Özeti Şeridi */}
            {profitabilitySummary && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                <div className="rounded-xl bg-gray-50 p-3.5 dark:bg-dark-800 border border-gray-200 dark:border-dark-700">
                  <div className="text-[11px] font-medium text-gray-500 dark:text-dark-400">Araç Sayısı</div>
                  <div className="mt-1 text-lg font-bold text-gray-900 dark:text-white">
                    {profitabilitySummary.totalVehicles}{" "}
                    <span className="text-xs font-normal text-gray-400">({profitabilitySummary.soldCount} satılan)</span>
                  </div>
                </div>

                <div className="rounded-xl bg-gray-50 p-3.5 dark:bg-dark-800 border border-gray-200 dark:border-dark-700">
                  <div className="text-[11px] font-medium text-gray-500 dark:text-dark-400">Toplam Alış</div>
                  <div className="mt-1 text-base font-bold text-gray-900 dark:text-white">
                    {money(profitabilitySummary.totalPurchases)}
                  </div>
                </div>

                <div className="rounded-xl bg-amber-50/50 p-3.5 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40">
                  <div className="text-[11px] font-medium text-amber-700 dark:text-amber-400">Toplam Masraflar</div>
                  <div className="mt-1 text-base font-bold text-amber-900 dark:text-amber-300">
                    {money(profitabilitySummary.totalExpenses)}
                  </div>
                </div>

                <div className="rounded-xl bg-blue-50/50 p-3.5 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/40">
                  <div className="text-[11px] font-medium text-blue-700 dark:text-blue-400">Satış Cirosu</div>
                  <div className="mt-1 text-base font-bold text-blue-900 dark:text-blue-300">
                    {money(profitabilitySummary.totalSalesRevenue)}
                  </div>
                </div>

                <div className="rounded-xl bg-emerald-50/60 p-3.5 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40">
                  <div className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">Toplam Net Kâr</div>
                  <div className="mt-1 text-base font-bold text-emerald-800 dark:text-emerald-300">
                    {money(profitabilitySummary.totalNetProfit)}
                  </div>
                </div>

                <div className="rounded-xl bg-gray-50 p-3.5 dark:bg-dark-800 border border-gray-200 dark:border-dark-700">
                  <div className="text-[11px] font-medium text-gray-500 dark:text-dark-400">Ort. Stokta Kalma</div>
                  <div className="mt-1 text-lg font-bold text-gray-900 dark:text-white">
                    {profitabilitySummary.avgDaysInStock}{" "}
                    <span className="text-xs font-normal text-gray-400">gün</span>
                  </div>
                </div>
              </div>
            )}

            {/* Tablo */}
            <Card className="overflow-hidden">
              {loadingProfitability ? (
                <div className="flex justify-center py-20">
                  <Spinner className="size-8 text-primary" />
                </div>
              ) : profitabilityItems.length === 0 ? (
                <div className="py-16 text-center text-sm text-gray-500">
                  Kriterlere uygun araç kaydı bulunamadı.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="w-full text-left text-xs">
                    <THead>
                      <Tr>
                        <Th>Plaka & Araç</Th>
                        <Th>Durum</Th>
                        <Th className="text-right">Alış Fiyatı</Th>
                        <Th className="text-right">Masraflar</Th>
                        <Th className="text-right">Toplam Maliyet</Th>
                        <Th className="text-right">Satış Fiyatı</Th>
                        <Th className="text-right">Net Kâr / Zarar</Th>
                        <Th className="text-right">Kâr %</Th>
                        <Th className="text-center">Stok Yaşı</Th>
                        <Th>Satış Temsilcisi</Th>
                      </Tr>
                    </THead>
                    <TBody>
                      {profitabilityItems.map((item) => (
                        <Tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-dark-800/50">
                          <Td>
                            <div className="font-bold text-gray-900 dark:text-white">
                              {item.plate}
                            </div>
                            <div className="text-[11px] text-gray-500 dark:text-dark-300">
                              {item.brandName} {item.modelName} {item.year ? `(${item.year})` : ""}
                            </div>
                          </Td>
                          <Td>
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                                item.status === "SATILDI"
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                                  : item.status === "KIRALAMADA"
                                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                                  : "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300"
                              }`}
                            >
                              {item.status}
                            </span>
                          </Td>
                          <Td className="text-right font-medium text-gray-800 dark:text-dark-100">
                            {money(item.purchasePrice)}
                          </Td>
                          <Td className="text-right font-medium text-amber-600 dark:text-amber-400">
                            {money(item.totalExpenses)}
                          </Td>
                          <Td className="text-right font-semibold text-gray-900 dark:text-white">
                            {money(item.totalCost)}
                          </Td>
                          <Td className="text-right font-medium text-blue-600 dark:text-blue-400">
                            {item.salePrice > 0 ? money(item.salePrice) : "-"}
                          </Td>
                          <Td className="text-right">
                            {item.isSold ? (
                              <span
                                className={`font-bold ${
                                  item.netProfit >= 0
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : "text-rose-600 dark:text-rose-400"
                                }`}
                              >
                                {item.netProfit > 0 ? "+" : ""}
                                {money(item.netProfit)}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </Td>
                          <Td className="text-right">
                            {item.isSold ? (
                              <span
                                className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-bold ${
                                  item.profitMargin >= 0
                                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
                                    : "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300"
                                }`}
                              >
                                %{item.profitMargin}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </Td>
                          <Td className="text-center">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium ${
                                item.daysInStock > 90
                                  ? "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300"
                                  : item.daysInStock > 30
                                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                                  : "bg-gray-100 text-gray-700 dark:bg-dark-700 dark:text-dark-200"
                              }`}
                              title={item.isSold ? "Satılana kadar geçen süre" : "Stokta bekleme süresi"}
                            >
                              <ClockIcon className="size-3" />
                              {item.daysInStock} gün
                            </span>
                          </Td>
                          <Td>
                            <span className="text-gray-700 dark:text-dark-200">
                              {item.salesRep?.name ?? (
                                <span className="text-gray-400 italic">Atanmamış</span>
                              )}
                            </span>
                          </Td>
                        </Tr>
                      ))}
                    </TBody>
                  </Table>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* SEKME 3: SATIŞ TEMSİLCİLERİ PERFORMANSI */}
        {activeTab === "salesReps" && (
          <div className="space-y-6">
            {loadingSalesReps ? (
              <div className="flex justify-center py-20">
                <Spinner className="size-8 text-primary" />
              </div>
            ) : salesReps.length === 0 ? (
              <div className="py-16 text-center text-sm text-gray-500">
                Kayıtlı satış temsilcisi verisi bulunamadı.
              </div>
            ) : (
              <>
                {/* Liderlik Kartları */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {/* En Çok Satış Yapan */}
                  {salesReps.length > 0 && salesReps[0] && (
                    <Card className="p-5 border-t-4 border-t-amber-500">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                          🏆 Kâr Lideri Temsilci
                        </span>
                        <CheckBadgeIcon className="size-5 text-amber-500" />
                      </div>
                      <div className="mt-3 flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 font-bold text-sm">
                          {salesReps[0].user.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-gray-900 dark:text-white">
                            {salesReps[0].user.name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-dark-400">
                            {salesReps[0].soldCount} araç satışı
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 pt-3 border-t border-gray-100 dark:border-dark-700 flex justify-between items-center text-xs">
                        <span className="text-gray-500">Sağlanan Net Kâr</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                          {money(salesReps[0].totalProfit)}
                        </span>
                      </div>
                    </Card>
                  )}

                  {/* Toplam Temsilci İstatistiği */}
                  <Card className="p-5 border-t-4 border-t-primary">
                    <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                      Ekip Satış Performansı
                    </span>
                    <div className="mt-3 text-2xl font-bold text-gray-900 dark:text-white">
                      {salesReps.reduce((s, r) => s + r.soldCount, 0)}{" "}
                      <span className="text-xs font-normal text-gray-500">toplam araç</span>
                    </div>
                    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-dark-700 flex justify-between items-center text-xs">
                      <span className="text-gray-500">Temsilciler Toplam Cirosu</span>
                      <span className="font-bold text-gray-900 dark:text-white text-sm">
                        {money(salesReps.reduce((s, r) => s + r.totalRevenue, 0))}
                      </span>
                    </div>
                  </Card>

                  {/* Ortalama Satış Hızı */}
                  <Card className="p-5 border-t-4 border-t-blue-500">
                    <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                      Ortalama Satış Döngüsü
                    </span>
                    <div className="mt-3 text-2xl font-bold text-gray-900 dark:text-white">
                      {salesReps.filter((r) => r.soldCount > 0).length > 0
                        ? Math.round(
                            salesReps.reduce((s, r) => s + r.avgDaysToSell, 0) /
                              salesReps.filter((r) => r.soldCount > 0).length,
                          )
                        : 0}{" "}
                      <span className="text-xs font-normal text-gray-500">gün</span>
                    </div>
                    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-dark-700 flex justify-between items-center text-xs">
                      <span className="text-gray-500">Ortalama Araç Kârı</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                        {money(
                          salesReps.reduce((s, r) => s + r.soldCount, 0) > 0
                            ? salesReps.reduce((s, r) => s + r.totalProfit, 0) /
                                salesReps.reduce((s, r) => s + r.soldCount, 0)
                            : 0,
                        )}
                      </span>
                    </div>
                  </Card>
                </div>

                {/* Temsilciler Tablosu */}
                <Card className="overflow-hidden">
                  <div className="p-4 border-b border-gray-200 dark:border-dark-700 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      Temsilci Bazlı Detaylı Sıralama
                    </h3>
                  </div>

                  <div className="overflow-x-auto">
                    <Table className="w-full text-left text-xs">
                      <THead>
                        <Tr>
                          <Th>Temsilci</Th>
                          <Th className="text-center">Satılan Araç</Th>
                          <Th className="text-right">Toplam Ciro</Th>
                          <Th className="text-right">Maliyet (Alış + Masraf)</Th>
                          <Th className="text-right">Toplam Net Kâr</Th>
                          <Th className="text-right">Araç Başı Ort. Kâr</Th>
                          <Th className="text-right">Kâr Marjı %</Th>
                          <Th className="text-center">Ort. Satış Süresi</Th>
                        </Tr>
                      </THead>
                      <TBody>
                        {salesReps.map((rep, idx) => (
                          <Tr key={rep.user.id} className="hover:bg-gray-50 dark:hover:bg-dark-800/50">
                            <Td>
                              <div className="flex items-center gap-3">
                                <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">
                                  {rep.user.name.slice(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                                    {rep.user.name}
                                    {idx === 0 && rep.soldCount > 0 && (
                                      <span className="rounded bg-amber-100 px-1 py-0.2 text-[9px] font-bold text-amber-800">
                                        #1
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-gray-400">{rep.user.email}</div>
                                </div>
                              </div>
                            </Td>
                            <Td className="text-center font-bold text-gray-900 dark:text-white">
                              {rep.soldCount}
                            </Td>
                            <Td className="text-right font-medium text-gray-800 dark:text-dark-100">
                              {money(rep.totalRevenue)}
                            </Td>
                            <Td className="text-right font-medium text-gray-600 dark:text-dark-300">
                              {money(rep.totalCost)}
                            </Td>
                            <Td className="text-right font-bold text-emerald-600 dark:text-emerald-400">
                              {money(rep.totalProfit)}
                            </Td>
                            <Td className="text-right font-semibold text-gray-900 dark:text-white">
                              {money(rep.avgProfitPerVehicle)}
                            </Td>
                            <Td className="text-right">
                              <span
                                className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-bold ${
                                  rep.margin >= 0
                                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
                                    : "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300"
                                }`}
                              >
                                %{rep.margin}
                              </span>
                            </Td>
                            <Td className="text-center">
                              <span className="inline-flex items-center gap-1 text-gray-600 dark:text-dark-300">
                                <ClockIcon className="size-3 text-gray-400" />
                                {rep.avgDaysToSell} gün
                              </span>
                            </Td>
                          </Tr>
                        ))}
                      </TBody>
                    </Table>
                  </div>
                </Card>
              </>
            )}
          </div>
        )}
      </div>
    </Page>
  );
}
