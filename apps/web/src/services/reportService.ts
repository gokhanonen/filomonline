import axios from "@/utils/axios";

export interface ReportSummary {
  vehicles: { stokta: number; kiralamada: number; satildi: number; toplam: number };
  stokMaliyeti: number;
  stokListeDeğeri: number;
  toplamSatis: number;
  brutKar: number;
  toplamMasraf: number;
  cariSayisi: number;
}

export async function getSummary(): Promise<ReportSummary> {
  const { data } = await axios.get<ReportSummary>("/reports/summary");
  return data;
}
