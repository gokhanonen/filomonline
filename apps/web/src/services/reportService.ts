import axios from "@/utils/axios";

export interface ReportSummary {
  vehicles: { stokta: number; kiralamada: number; satildi: number; toplam: number };
  stokMaliyeti: number;
  stokListeDeğeri: number;
  toplamSatis: number;
  brutKar: number;
  toplamMasraf: number;
  cariSayisi: number;
  aktifKiraGeliri?: number;
  aktifKiraAdedi?: number;
  documentCount?: number;
  photoCount?: number;
  storageGB?: number;
  storageQuotaGB?: number;
  trends?: {
    months: string[];
    revenueSeries: number[];
    expenseSeries: number[];
    currentRevenueTL: number;
    currentExpenseTL: number;
    currentMonthlyExpenseTL?: number;
    revenueGrowth: number;
    expenseGrowth: number;
  };
}

export interface VehicleProfitabilityItem {
  id: string;
  plate: string;
  brandName: string;
  modelName: string;
  year: number | null;
  status: string;
  purchasePrice: number;
  purchaseDate: string | null;
  totalExpenses: number;
  totalCost: number;
  salePrice: number;
  saleDate: string | null;
  isSold: boolean;
  netProfit: number;
  profitMargin: number;
  daysInStock: number;
  salesRep: { id: string; name: string } | null;
}

export interface VehicleProfitabilitySummary {
  totalVehicles: number;
  soldCount: number;
  totalPurchases: number;
  totalExpenses: number;
  totalSalesRevenue: number;
  totalNetProfit: number;
  avgDaysInStock: number;
}

export interface VehicleProfitabilityResponse {
  items: VehicleProfitabilityItem[];
  summary: VehicleProfitabilitySummary;
}

export interface SalesRepPerformance {
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  };
  soldCount: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  avgProfitPerVehicle: number;
  avgDaysToSell: number;
  margin: number;
}

export interface MonthlyTrend {
  month: string;
  salesCount: number;
  revenue: number;
  profit: number;
}

export async function getSummary(): Promise<ReportSummary> {
  const { data } = await axios.get<ReportSummary>("/reports/summary");
  return data;
}

export async function getVehicleProfitability(params?: {
  status?: string;
  search?: string;
}): Promise<VehicleProfitabilityResponse> {
  const { data } = await axios.get<VehicleProfitabilityResponse>(
    "/reports/vehicle-profitability",
    { params },
  );
  return data;
}

export async function getSalesRepPerformance(): Promise<SalesRepPerformance[]> {
  const { data } = await axios.get<SalesRepPerformance[]>("/reports/sales-reps");
  return data;
}

export async function getMonthlyTrends(): Promise<MonthlyTrend[]> {
  const { data } = await axios.get<MonthlyTrend[]>("/reports/trends");
  return data;
}
