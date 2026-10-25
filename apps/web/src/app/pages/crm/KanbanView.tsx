import { useRef, useState, useEffect } from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PhoneIcon,
  CalendarDaysIcon,
  DocumentTextIcon,
  ArrowTopRightOnSquareIcon,
  ArrowsRightLeftIcon,
} from "@heroicons/react/24/outline";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  type Lead,
  updateLead,
} from "@/services/crmService";
import {
  KANBAN_STAGES,
  LEAD_STATUS_CONFIG,
  LEAD_SOURCE_CONFIG,
} from "./constants";
import { toast } from "sonner";

interface Props {
  leads: Lead[];
  onSelectLead: (leadId: string) => void;
  onRefresh: () => void;
}

export function KanbanView({ leads, onSelectLead, onRefresh }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Kaydırma durumunu kontrol et
  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, [leads]);

  // Butonlarla sola/sağa kaydırma
  const handleScroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = 300;
      scrollRef.current.scrollBy({
        left: direction === "right" ? scrollAmount : -scrollAmount,
        behavior: "smooth",
      });
      setTimeout(checkScroll, 350);
    }
  };

  // Aşama değiştirme kısayolu
  const handleMoveStage = async (
    e: React.MouseEvent,
    lead: Lead,
    direction: "prev" | "next",
  ) => {
    e.stopPropagation();
    const currentIndex = KANBAN_STAGES.indexOf(lead.status);
    if (currentIndex === -1) return;

    const newIndex = direction === "next" ? currentIndex + 1 : currentIndex - 1;
    if (newIndex < 0 || newIndex >= KANBAN_STAGES.length) return;

    const newStatus = KANBAN_STAGES[newIndex];
    try {
      await updateLead(lead.id, { status: newStatus });
      toast.success(
        `${lead.fullName} -> "${LEAD_STATUS_CONFIG[newStatus].label}" aşamasına taşındı.`,
      );
      onRefresh();
    } catch {
      toast.error("Aşama güncellenemedi.");
    }
  };

  return (
    <div className="relative">
      {/* Üst Bilgi ve Kaydırma Kontrolleri */}
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-dark-300">
          <ArrowsRightLeftIcon className="size-3.5 text-primary-500" />
          <span>
            Satış hunisinde <strong>{KANBAN_STAGES.length} aşama</strong> bulunuyor.
            Yatay kaydırarak tüm aşamaları inceleyebilirsiniz.
          </span>
        </div>

        {/* Kaydırma Butonları */}
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="flat"
            isIcon
            disabled={!canScrollLeft}
            onClick={() => handleScroll("left")}
            className="size-7.5 rounded-lg border border-gray-200 bg-white text-gray-700 shadow-2xs hover:bg-gray-100 disabled:opacity-40 dark:border-dark-600 dark:bg-dark-700 dark:text-dark-100 dark:hover:bg-dark-600"
            title="Sola Kaydır"
          >
            <ChevronLeftIcon className="size-4" />
          </Button>
          <Button
            type="button"
            variant="flat"
            isIcon
            disabled={!canScrollRight}
            onClick={() => handleScroll("right")}
            className="size-7.5 rounded-lg border border-gray-200 bg-white text-gray-700 shadow-2xs hover:bg-gray-100 disabled:opacity-40 dark:border-dark-600 dark:bg-dark-700 dark:text-dark-100 dark:hover:bg-dark-600"
            title="Sağa Kaydır"
          >
            <ChevronRightIcon className="size-4" />
          </Button>
        </div>
      </div>

      {/* Kanban Sütunları Konteyneri */}
      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className="flex gap-3.5 overflow-x-auto pb-4 pt-1 custom-scrollbar scroll-smooth overscroll-x-contain"
      >
        {KANBAN_STAGES.map((stage, stageIdx) => {
          const stageConfig = LEAD_STATUS_CONFIG[stage];
          const stageLeads = leads.filter((l) => l.status === stage);

          return (
            <div
              key={stage}
              className="flex w-[275px] shrink-0 flex-col rounded-2xl border border-gray-150 bg-gray-50/80 p-3 shadow-2xs dark:border-dark-700/70 dark:bg-dark-850"
            >
              {/* Sütun Başlığı */}
              <div className="mb-3 flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`size-2.5 rounded-full ${
                      stage === "CONVERTED"
                        ? "bg-success"
                        : stage === "NEW"
                          ? "bg-primary-500"
                          : stage === "TEST_DRIVE"
                            ? "bg-warning"
                            : stage === "QUOTE_SENT"
                              ? "bg-purple-500"
                              : stage === "NEGOTIATION"
                                ? "bg-amber-500"
                                : "bg-info"
                    }`}
                  />
                  <h3 className="text-xs font-bold text-gray-800 dark:text-dark-100">
                    {stageConfig.label}
                  </h3>
                </div>
                <span className="rounded-full bg-white px-2 py-0.5 text-tiny font-bold text-gray-600 shadow-xs dark:bg-dark-700 dark:text-dark-200">
                  {stageLeads.length}
                </span>
              </div>

              {/* Potansiyel Kartları */}
              <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto min-h-[140px]">
                {stageLeads.length === 0 ? (
                  <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-gray-200 py-10 text-tiny text-gray-400 dark:border-dark-700">
                    Bu aşamada potansiyel yok
                  </div>
                ) : (
                  stageLeads.map((lead) => {
                    const sourceConfig = LEAD_SOURCE_CONFIG[lead.source];

                    return (
                      <Card
                        key={lead.id}
                        onClick={() => onSelectLead(lead.id)}
                        className="group cursor-pointer border border-gray-150/70 p-3.5 shadow-2xs transition-all hover:border-primary-400 hover:shadow-md dark:border-dark-700 dark:hover:border-primary-600"
                      >
                        {/* Kart Üst: Ad & Kaynak */}
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-xs font-bold text-gray-900 group-hover:text-primary-600 dark:text-dark-50">
                            {lead.fullName}
                          </h4>
                          {sourceConfig && (
                            <span
                              className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium ${sourceConfig.badgeColor}`}
                            >
                              {sourceConfig.label}
                            </span>
                          )}
                        </div>

                        {/* Telefon & WhatsApp */}
                        {lead.phone && (
                          <div className="mt-1.5 flex items-center justify-between text-tiny text-gray-500 dark:text-dark-300">
                            <span className="flex items-center gap-1 font-mono">
                              <PhoneIcon className="size-3 text-gray-400" />
                              {lead.phone}
                            </span>
                            <a
                              href={`https://wa.me/${lead.phone.replace(/\D/g, "")}`}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-0.5 text-emerald-600 hover:underline dark:text-emerald-400"
                              title="WhatsApp Aç"
                            >
                              <span>WhatsApp</span>
                              <ArrowTopRightOnSquareIcon className="size-3" />
                            </a>
                          </div>
                        )}

                        {/* İlgilendiği Araçlar */}
                        {lead.interestedVehicles && lead.interestedVehicles.length > 0 && (
                          <div className="mt-2.5 flex flex-wrap gap-1">
                            {lead.interestedVehicles.slice(0, 2).map((iv) => (
                              <span
                                key={iv.id}
                                className="inline-flex items-center rounded-md bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-gray-700 dark:bg-dark-700 dark:text-dark-200"
                              >
                                {iv.vehicle?.plate} • {iv.vehicle?.brandName}
                              </span>
                            ))}
                            {lead.interestedVehicles.length > 2 && (
                              <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500 dark:bg-dark-700">
                                +{lead.interestedVehicles.length - 2}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Bütçe */}
                        {lead.budget && (
                          <div className="mt-2 text-tiny font-semibold text-emerald-600 dark:text-emerald-400">
                            Bütçe: {Number(lead.budget).toLocaleString("tr-TR")} TL
                          </div>
                        )}

                        {/* Alt Sayaçlar & Aşama Değiştirici Butonlar */}
                        <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-2 text-tiny text-gray-400 dark:border-dark-700">
                          <div className="flex items-center gap-2">
                            {(lead._count?.testDrives ?? 0) > 0 && (
                              <span
                                className="flex items-center gap-0.5 text-amber-600 dark:text-amber-400"
                                title="Deneme Sürüşü Sayısı"
                              >
                                <CalendarDaysIcon className="size-3.5" />
                                {lead._count?.testDrives}
                              </span>
                            )}
                            {(lead._count?.quotes ?? 0) > 0 && (
                              <span
                                className="flex items-center gap-0.5 text-purple-600 dark:text-purple-400"
                                title="Teklif Sayısı"
                              >
                                <DocumentTextIcon className="size-3.5" />
                                {lead._count?.quotes}
                              </span>
                            )}
                          </div>

                          {/* Aşama İlerleme Okları */}
                          <div className="flex items-center gap-1">
                            {stageIdx > 0 && (
                              <button
                                type="button"
                                onClick={(e) => handleMoveStage(e, lead, "prev")}
                                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-dark-700 dark:hover:text-white"
                                title="Önceki Aşamaya Taşı"
                              >
                                <ChevronLeftIcon className="size-3.5" />
                              </button>
                            )}
                            {stageIdx < KANBAN_STAGES.length - 1 && (
                              <button
                                type="button"
                                onClick={(e) => handleMoveStage(e, lead, "next")}
                                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-dark-700 dark:hover:text-white"
                                title="Sonraki Aşamaya Taşı"
                              >
                                <ChevronRightIcon className="size-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
