import { useRef, useState, useEffect } from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PhoneIcon,
  CalendarDaysIcon,
  DocumentTextIcon,
  ArrowTopRightOnSquareIcon,
  ArrowsRightLeftIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
import clsx from "clsx";

import {
  type Lead,
  type LeadStatus,
  updateLead,
} from "@/services/crmService";
import {
  KANBAN_STAGES,
  LEAD_STATUS_CONFIG,
  LEAD_SOURCE_CONFIG,
} from "./constants";
import { KanbanTestDriveModal } from "./KanbanTestDriveModal";
import { KanbanQuoteModal } from "./KanbanQuoteModal";

interface Props {
  leads: Lead[];
  onSelectLead: (leadId: string) => void;
  onRefresh: () => void;
}

export function KanbanView({ leads, onSelectLead, onRefresh }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Drag and drop state
  const [draggedLead, setDraggedLead] = useState<Lead | null>(null);
  const [dragOverStage, setDragOverStage] = useState<LeadStatus | null>(null);

  // Modallar
  const [testDriveModalLead, setTestDriveModalLead] = useState<Lead | null>(null);
  const [quoteModalLead, setQuoteModalLead] = useState<Lead | null>(null);

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

  // Drag and drop eventleri
  const handleDragStart = (e: React.DragEvent, lead: Lead) => {
    e.dataTransfer.setData("text/plain", lead.id);
    e.dataTransfer.effectAllowed = "move";
    setDraggedLead(lead);
  };

  const handleDragEnd = () => {
    setDraggedLead(null);
    setDragOverStage(null);
  };

  const handleDropToStage = async (leadId: string, targetStage: LeadStatus) => {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;
    if (lead.status === targetStage) return;

    // Özel form akışları:
    if (targetStage === "TEST_DRIVE") {
      setTestDriveModalLead(lead);
      return;
    }

    if (targetStage === "QUOTE_SENT") {
      setQuoteModalLead(lead);
      return;
    }

    // Diğer aşamalar için doğrudan durum güncelle
    try {
      await updateLead(lead.id, { status: targetStage });
      toast.success(
        `${lead.fullName} -> "${LEAD_STATUS_CONFIG[targetStage].label}" aşamasına taşındı.`,
      );
      onRefresh();
    } catch {
      toast.error("Aşama güncellenemedi.");
    }
  };

  // Ok butonlarıyla aşama değiştirme kısayolu
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

    // İleri yönde deneme sürüşü veya teklif aşamasına geçiliyorsa formu aç
    if (direction === "next" && newStatus === "TEST_DRIVE") {
      setTestDriveModalLead(lead);
      return;
    }
    if (direction === "next" && newStatus === "QUOTE_SENT") {
      setQuoteModalLead(lead);
      return;
    }

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
      <div className="mb-3.5 flex items-center justify-between px-1">
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-dark-300">
          <ArrowsRightLeftIcon className="size-3.5 text-primary-500" />
          <span>
            Satış hunisinde <strong>{KANBAN_STAGES.length} aşama</strong> bulunuyor.
            Kartları <strong>sürükleyip bırakarak</strong> aşamaları değiştirebilirsiniz.
          </span>
        </div>

        {/* Kaydırma Butonları */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={!canScrollLeft}
            onClick={() => handleScroll("left")}
            className="flex size-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 shadow-2xs hover:bg-gray-100 disabled:opacity-40 dark:border-dark-600 dark:bg-dark-750 dark:text-dark-100 dark:hover:bg-dark-700 cursor-pointer disabled:cursor-not-allowed transition-all"
            title="Sola Kaydır"
            aria-label="Sola Kaydır"
          >
            <ChevronLeftIcon className="size-4" />
          </button>
          <button
            type="button"
            disabled={!canScrollRight}
            onClick={() => handleScroll("right")}
            className="flex size-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 shadow-2xs hover:bg-gray-100 disabled:opacity-40 dark:border-dark-600 dark:bg-dark-750 dark:text-dark-100 dark:hover:bg-dark-700 cursor-pointer disabled:cursor-not-allowed transition-all"
            title="Sağa Kaydır"
            aria-label="Sağa Kaydır"
          >
            <ChevronRightIcon className="size-4" />
          </button>
        </div>
      </div>

      {/* Kanban Sütunları Konteyneri */}
      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className="flex gap-4 overflow-x-auto pb-4 pt-1 custom-scrollbar scroll-smooth overscroll-x-contain"
      >
        {KANBAN_STAGES.map((stage, stageIdx) => {
          const stageConfig = LEAD_STATUS_CONFIG[stage];
          const stageLeads = leads.filter((l) => l.status === stage);
          const isOver = dragOverStage === stage;
          const isDragTargetSpecial =
            isOver &&
            draggedLead &&
            draggedLead.status !== stage &&
            (stage === "TEST_DRIVE" || stage === "QUOTE_SENT");

          return (
            <div
              key={stage}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                if (dragOverStage !== stage) setDragOverStage(stage);
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  if (dragOverStage === stage) setDragOverStage(null);
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverStage(null);
                const leadId = e.dataTransfer.getData("text/plain");
                handleDropToStage(leadId, stage);
              }}
              className={clsx(
                "flex w-[290px] shrink-0 flex-col rounded-2xl border p-3 shadow-xs transition-all duration-150",
                "border-gray-200/90 bg-gray-100/70",
                "dark:border-dark-600/90 dark:bg-dark-800/95",
                isOver &&
                  "ring-2 ring-primary-500/70 border-primary-500/60 bg-primary-50/20 dark:bg-primary-950/30",
              )}
            >
              {/* Sütun Başlığı */}
              <div className="mb-3 flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span
                    className={clsx(
                      "size-2.5 rounded-full ring-2 ring-white/60 dark:ring-dark-700 shadow-2xs",
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
                                : "bg-info",
                    )}
                  />
                  <h3 className="text-xs font-bold text-gray-800 dark:text-dark-100">
                    {stageConfig.label}
                  </h3>
                </div>
                <span className="rounded-full bg-white px-2 py-0.5 text-tiny font-bold text-gray-700 shadow-2xs dark:border dark:border-dark-600 dark:bg-dark-700 dark:text-dark-200">
                  {stageLeads.length}
                </span>
              </div>

              {/* Sürükleme İpucu Rozeti (Hedef Özel Form ise) */}
              {isDragTargetSpecial && (
                <div className="mb-2 flex items-center gap-1.5 rounded-lg border border-primary-500/30 bg-primary-50/80 px-2 py-1 text-[11px] font-semibold text-primary-700 dark:border-primary-400/30 dark:bg-primary-950/60 dark:text-primary-300 animate-pulse">
                  <SparklesIcon className="size-3.5 shrink-0" />
                  <span>
                    Bırakıldığında {stage === "TEST_DRIVE" ? "Deneme Sürüşü" : "Teklif"} formu açılacak
                  </span>
                </div>
              )}

              {/* Potansiyel Kartları */}
              <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto min-h-[160px]">
                {stageLeads.length === 0 ? (
                  <div
                    className={clsx(
                      "flex flex-1 items-center justify-center rounded-xl border border-dashed py-10 text-tiny transition-colors",
                      isOver
                        ? "border-primary-400 bg-primary-50/40 text-primary-700 font-semibold dark:border-primary-500/50 dark:bg-primary-950/40 dark:text-primary-300"
                        : "border-gray-300/80 text-gray-400 dark:border-dark-650 dark:text-dark-400",
                    )}
                  >
                    {isOver ? "Buraya Bırakın" : "Bu aşamada potansiyel yok"}
                  </div>
                ) : (
                  stageLeads.map((lead) => {
                    const sourceConfig = LEAD_SOURCE_CONFIG[lead.source];
                    const isBeingDragged = draggedLead?.id === lead.id;

                    return (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, lead)}
                        onDragEnd={handleDragEnd}
                        onClick={() => onSelectLead(lead.id)}
                        className={clsx(
                          "group rounded-xl border p-3.5 shadow-2xs transition-all select-none cursor-grab active:cursor-grabbing",
                          "border-gray-200/90 bg-white hover:border-primary-400 hover:shadow-md",
                          "dark:border-dark-600 dark:bg-dark-750 dark:hover:border-primary-500/70 dark:hover:bg-dark-700",
                          isBeingDragged &&
                            "opacity-40 scale-95 border-dashed border-primary-500 ring-2 ring-primary-500/30",
                        )}
                      >
                        {/* Kart Üst: Ad & Kaynak */}
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-xs font-bold text-gray-900 group-hover:text-primary-600 dark:text-dark-50 dark:group-hover:text-primary-400 transition-colors">
                            {lead.fullName}
                          </h4>
                          {sourceConfig && (
                            <span
                              className={clsx(
                                "shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium border border-transparent",
                                sourceConfig.badgeColor,
                              )}
                            >
                              {sourceConfig.label}
                            </span>
                          )}
                        </div>

                        {/* Telefon & WhatsApp */}
                        {lead.phone && (
                          <div className="mt-1.5 flex items-center justify-between text-tiny text-gray-500 dark:text-dark-300">
                            <span className="flex items-center gap-1 font-mono">
                              <PhoneIcon className="size-3 text-gray-400 dark:text-dark-400" />
                              {lead.phone}
                            </span>
                            <a
                              href={`https://wa.me/${lead.phone.replace(/\D/g, "")}`}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-0.5 font-medium text-emerald-600 hover:underline dark:text-emerald-400 dark:hover:text-emerald-300"
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
                                className="inline-flex items-center rounded-md border border-gray-200/80 bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-gray-700 dark:border-dark-600/70 dark:bg-dark-800 dark:text-dark-100"
                              >
                                {iv.vehicle?.plate} • {iv.vehicle?.brandName}
                              </span>
                            ))}
                            {lead.interestedVehicles.length > 2 && (
                              <span className="rounded-md border border-gray-200/80 bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500 dark:border-dark-600/70 dark:bg-dark-800 dark:text-dark-300">
                                +{lead.interestedVehicles.length - 2}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Bütçe */}
                        {lead.budget && (
                          <div className="mt-2 text-tiny font-bold text-emerald-600 dark:text-emerald-400">
                            Bütçe: {Number(lead.budget).toLocaleString("tr-TR")} TL
                          </div>
                        )}

                        {/* Alt Sayaçlar & Aşama Değiştirici Butonlar */}
                        <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-2 text-tiny text-gray-400 dark:border-dark-650 dark:text-dark-300">
                          <div className="flex items-center gap-2">
                            {(lead._count?.testDrives ?? 0) > 0 && (
                              <span
                                className="flex items-center gap-0.5 font-medium text-amber-600 dark:text-amber-400"
                                title="Deneme Sürüşü Sayısı"
                              >
                                <CalendarDaysIcon className="size-3.5" />
                                {lead._count?.testDrives}
                              </span>
                            )}
                            {(lead._count?.quotes ?? 0) > 0 && (
                              <span
                                className="flex items-center gap-0.5 font-medium text-purple-600 dark:text-purple-400"
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
                                className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:text-dark-400 dark:hover:bg-dark-650 dark:hover:text-dark-100 cursor-pointer transition-colors"
                                title="Önceki Aşamaya Taşı"
                              >
                                <ChevronLeftIcon className="size-3.5" />
                              </button>
                            )}
                            {stageIdx < KANBAN_STAGES.length - 1 && (
                              <button
                                type="button"
                                onClick={(e) => handleMoveStage(e, lead, "next")}
                                className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:text-dark-400 dark:hover:bg-dark-650 dark:hover:text-dark-100 cursor-pointer transition-colors"
                                title={
                                  KANBAN_STAGES[stageIdx + 1] === "TEST_DRIVE"
                                    ? "Deneme Sürüşü Planla & Taşı"
                                    : KANBAN_STAGES[stageIdx + 1] === "QUOTE_SENT"
                                      ? "Teklif Hazırla & Taşı"
                                      : "Sonraki Aşamaya Taşı"
                                }
                              >
                                <ChevronRightIcon className="size-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Sürükleme ile Tetiklenen Deneme Sürüşü Modalı */}
      <KanbanTestDriveModal
        open={Boolean(testDriveModalLead)}
        lead={testDriveModalLead}
        onClose={() => setTestDriveModalLead(null)}
        onSuccess={onRefresh}
      />

      {/* Sürükleme ile Tetiklenen Teklif Modalı */}
      <KanbanQuoteModal
        open={Boolean(quoteModalLead)}
        lead={quoteModalLead}
        onClose={() => setQuoteModalLead(null)}
        onSuccess={onRefresh}
      />
    </div>
  );
}
