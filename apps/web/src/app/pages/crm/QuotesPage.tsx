import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Page } from "@/components/shared/Page";
import { Select, Spinner, Tag } from "@/components/ui";
import {
  listQuotes,
  updateQuote,
  type LeadQuote,
  type QuoteStatus,
} from "@/services/crmService";
import { QUOTE_STATUS_CONFIG } from "./constants";

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<LeadQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await listQuotes();
      setQuotes(data);
    } catch {
      toast.error("Teklifler yüklenemedi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleStatusChange = async (id: string, status: QuoteStatus) => {
    try {
      await updateQuote(id, { status });
      toast.success("Teklif durumu güncellendi.");
      loadData();
    } catch {
      toast.error("İşlem başarısız.");
    }
  };

  const filtered = quotes.filter((q) => {
    if (statusFilter !== "ALL" && q.status !== statusFilter) return false;
    return true;
  });

  const totalAmount = filtered.reduce((sum, q) => sum + Number(q.offeredPrice || 0), 0);

  return (
    <Page title="Araç Fiyat Teklifleri">
      <div className="w-full px-(--margin-x) py-6 space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-gray-900 dark:text-dark-50">
                Araç Fiyat Teklifleri
              </h2>
              <span className="rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-bold text-purple-700 dark:bg-purple-950/40 dark:text-purple-300">
                Toplam: {Number(totalAmount).toLocaleString("tr-TR")} TL
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-dark-300">
              Müşteri adayları için oluşturulan araç teklifleri ve onay durumları
            </p>
          </div>

          <Select
            className="w-44 text-xs"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            data={[
              { value: "ALL", label: "Tüm Durumlar" },
              ...Object.entries(QUOTE_STATUS_CONFIG).map(([k, v]) => ({
                value: k,
                label: v.label,
              })),
            ]}
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Spinner className="size-8" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 py-16 text-center text-xs text-gray-400 dark:border-dark-700">
            Hazırlanmış araç teklifi bulunamadı.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-150 bg-white shadow-2xs dark:border-dark-700 dark:bg-dark-800">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-gray-150 bg-gray-50/70 text-tiny font-bold uppercase tracking-wider text-gray-500 dark:border-dark-700 dark:bg-dark-850 dark:text-dark-300">
                  <tr>
                    <th className="px-4 py-3">Teklif No</th>
                    <th className="px-4 py-3">Müşteri Adayı</th>
                    <th className="px-4 py-3">Araç</th>
                    <th className="px-4 py-3 text-right">Teklif Tutarı</th>
                    <th className="px-4 py-3">Ödeme Şekli</th>
                    <th className="px-4 py-3">Geçerlilik</th>
                    <th className="px-4 py-3">Durum</th>
                    <th className="px-4 py-3 text-right">Aksiyon</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-dark-700">
                  {filtered.map((q) => {
                    const cfg = QUOTE_STATUS_CONFIG[q.status];

                    return (
                      <tr key={q.id} className="transition-colors hover:bg-gray-50/80 dark:hover:bg-dark-750">
                        <td className="px-4 py-3.5 font-mono font-bold text-purple-700 dark:text-purple-400">
                          {q.quoteNumber}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-gray-900 dark:text-dark-50">
                            {q.lead?.fullName}
                          </div>
                          {q.lead?.phone && (
                            <div className="font-mono text-tiny text-gray-400">
                              {q.lead.phone}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-gray-900 dark:text-dark-50">
                              {q.vehicle?.plate}
                            </span>
                            <span className="text-gray-600 dark:text-dark-300">
                              {q.vehicle?.brandName} {q.vehicle?.modelName}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-right font-bold text-gray-900 dark:text-dark-50">
                          {Number(q.offeredPrice).toLocaleString("tr-TR")} TL
                        </td>
                        <td className="px-4 py-3.5 text-gray-600 dark:text-dark-300">
                          {q.paymentType || "Nakit"}
                        </td>
                        <td className="px-4 py-3.5 text-tiny text-gray-500">
                          {q.validUntil
                            ? new Date(q.validUntil).toLocaleDateString("tr-TR")
                            : "Süresiz"}
                        </td>
                        <td className="px-4 py-3.5">
                          {cfg && (
                            <Tag color={cfg.color} className="text-tiny">
                              {cfg.label}
                            </Tag>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <Select
                            className="w-28 text-tiny"
                            value={q.status}
                            onChange={(e) =>
                              handleStatusChange(q.id, e.target.value as QuoteStatus)
                            }
                            data={Object.entries(QUOTE_STATUS_CONFIG).map(([k, v]) => ({
                              value: k,
                              label: v.label,
                            }))}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Page>
  );
}
