import { useState, useEffect, useRef } from "react";
import { type Lead } from "@/services/crmService";
import { LeadCard } from "./LeadCard";
import { Spinner } from "@/components/ui/Spinner";
import { SparklesIcon } from "@heroicons/react/24/outline";

interface Props {
  leads: Lead[];
  onSelectLead: (leadId: string) => void;
  onRefresh: () => void;
}

const BATCH_SIZE = 12; // 4'lü ızgara için bi kerede 12 kart (3 satır)

export function LeadCardGrid({ leads, onSelectLead, onRefresh }: Props) {
  const [displayedCount, setDisplayedCount] = useState(BATCH_SIZE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Filtreler veya arama değişince görünür kart sayısını 12'ye sıfırla
  useEffect(() => {
    setDisplayedCount(BATCH_SIZE);
  }, [leads]);

  const hasMore = displayedCount < leads.length;

  // Infinite Scroll Trigger (Aşağı kaydırdıkça sonraki 12 kartı getir)
  useEffect(() => {
    if (!hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoadingMore) {
          setIsLoadingMore(true);
          // Doğal ve akıcı bir yükleme hissi için kısa animasyon gecikmesi
          setTimeout(() => {
            setDisplayedCount((prev) => Math.min(prev + BATCH_SIZE, leads.length));
            setIsLoadingMore(false);
          }, 250);
        }
      },
      { rootMargin: "300px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, leads.length]);

  const displayedLeads = leads.slice(0, displayedCount);

  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 py-16 text-center dark:border-dark-700 dark:bg-dark-850">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-400 dark:bg-dark-800 dark:text-dark-300 mb-3">
          <SparklesIcon className="size-6" />
        </div>
        <h3 className="text-sm font-bold text-gray-900 dark:text-dark-50">
          Kriterlere Uygun Potansiyel Bulunamadı
        </h3>
        <p className="mt-1 text-xs text-gray-500 dark:text-dark-300 max-w-sm">
          Arama kriterlerinizi değiştirebilir veya sağ üstteki "+" butonuyla yeni potansiyel ekleyebilirsiniz.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 4'lü Izgara Düzeni (xl:grid-cols-4 = tam 4 sütun) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {displayedLeads.map((lead) => (
          <LeadCard
            key={lead.id}
            lead={lead}
            onSelect={onSelectLead}
            onRefresh={onRefresh}
          />
        ))}
      </div>

      {/* Infinite Scroll Yükleme Tetikleyici ve Durum */}
      {hasMore && (
        <div ref={sentinelRef} className="flex justify-center py-6">
          <div className="flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-xs font-medium text-gray-600 shadow-xs dark:bg-dark-750 dark:text-dark-200">
            <Spinner className="size-4" />
            <span>Daha fazla potansiyel yükleniyor ({displayedCount} / {leads.length})...</span>
          </div>
        </div>
      )}

      {/* Tüm Kartlar Yüklendiğinde Gösterilen Bilgi */}
      {!hasMore && leads.length > BATCH_SIZE && (
        <div className="flex justify-center py-4 text-center">
          <span className="text-xs text-gray-400 dark:text-dark-400">
            Toplam <strong>{leads.length}</strong> potansiyel listelendi • Tüm kayıtlar yüklendi ✨
          </span>
        </div>
      )}
    </div>
  );
}
