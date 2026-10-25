import React from "react";
import {
  PhoneIcon,
  CalendarDaysIcon,
  DocumentTextIcon,
  ArrowTopRightOnSquareIcon,
  BanknotesIcon,
  ChevronRightIcon,
  ChatBubbleLeftRightIcon,
} from "@heroicons/react/24/outline";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
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
import { toast } from "sonner";

interface Props {
  lead: Lead;
  onSelect: (leadId: string) => void;
  onRefresh?: () => void;
}

export function LeadCard({ lead, onSelect, onRefresh }: Props) {
  const statusCfg = LEAD_STATUS_CONFIG[lead.status] || {
    label: lead.status,
    color: "neutral",
  };
  const sourceCfg = LEAD_SOURCE_CONFIG[lead.source];
  const primaryVehicle = lead.interestedVehicles?.[0]?.vehicle;

  // İleri aşamaya hızlı geçiş kısayolu
  const handleNextStage = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const currentIndex = KANBAN_STAGES.indexOf(lead.status);
    if (currentIndex === -1 || currentIndex >= KANBAN_STAGES.length - 1) return;
    const nextStatus = KANBAN_STAGES[currentIndex + 1] as LeadStatus;

    try {
      await updateLead(lead.id, { status: nextStatus });
      toast.success(
        `${lead.fullName} -> "${LEAD_STATUS_CONFIG[nextStatus].label}" aşamasına taşındı.`,
      );
      onRefresh?.();
    } catch {
      toast.error("Aşama güncellenemedi.");
    }
  };

  const currentStageIndex = KANBAN_STAGES.indexOf(lead.status);

  return (
    <Card
      onClick={() => onSelect(lead.id)}
      className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-gray-200/80 bg-white p-4 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-primary-400 hover:shadow-lg dark:border-dark-700 dark:bg-dark-800 dark:hover:border-primary-500 cursor-pointer"
    >
      <div>
        {/* Üst Bar: Kaynak Rozeti & Aşama İlerleme Göstergesi */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          {sourceCfg ? (
            <span
              className={`rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wide ${sourceCfg.badgeColor}`}
            >
              {sourceCfg.label}
            </span>
          ) : (
            <span className="text-[10px] font-medium text-gray-400">Kaynak Yok</span>
          )}

          {/* Aşama Seviye Noktaları */}
          <div className="flex items-center gap-1" title={`Aşama: ${statusCfg.label}`}>
            {KANBAN_STAGES.map((s, idx) => (
              <span
                key={s}
                className={`size-1.5 rounded-full transition-all ${
                  idx <= currentStageIndex
                    ? lead.status === "CONVERTED"
                      ? "bg-emerald-500"
                      : lead.status === "LOST"
                        ? "bg-rose-500"
                        : "bg-primary-500"
                    : "bg-gray-200 dark:bg-dark-600"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Başlık (Potansiyel Müşteri Adı & Durum Rozeti) */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-bold text-gray-900 group-hover:text-primary-600 transition-colors line-clamp-1 dark:text-dark-50">
            {lead.fullName}
          </h3>
          <Badge
            color={statusCfg.color as any}
            variant="soft"
            className="shrink-0 text-[10px] font-semibold py-0.5 px-2"
          >
            {statusCfg.label}
          </Badge>
        </div>

        {/* Telefon & WhatsApp */}
        {lead.phone && (
          <div className="mt-2 flex items-center justify-between text-xs text-gray-600 dark:text-dark-300">
            <a
              href={`tel:${lead.phone}`}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 font-mono hover:text-primary-600 transition-colors"
            >
              <PhoneIcon className="size-3.5 text-gray-400" />
              <span>{lead.phone}</span>
            </a>
            <a
              href={`https://wa.me/${lead.phone.replace(/\D/g, "")}`}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/50 transition-colors"
              title="WhatsApp ile Mesaj Gönder"
            >
              <span>WhatsApp</span>
              <ArrowTopRightOnSquareIcon className="size-3" />
            </a>
          </div>
        )}

        {/* İlgilendiği Araç Bilgisi (Varsa) */}
        {primaryVehicle ? (
          <div className="mt-3 flex items-center gap-2.5 rounded-xl border border-gray-150 bg-gray-50/70 p-2 dark:border-dark-700 dark:bg-dark-850">
            {primaryVehicle.photos?.[0]?.url ? (
              <img
                src={primaryVehicle.photos[0].thumbUrl || primaryVehicle.photos[0].url}
                alt={primaryVehicle.plate}
                className="size-11 rounded-lg object-cover shrink-0 border border-gray-200 dark:border-dark-700"
              />
            ) : (
              <div className="flex size-11 items-center justify-center rounded-lg bg-primary-100 text-primary-700 dark:bg-primary-950/60 dark:text-primary-300 shrink-0 font-bold text-xs">
                {primaryVehicle.plate.slice(0, 2)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-xs font-bold text-gray-900 dark:text-dark-100">
                  {primaryVehicle.plate}
                </span>
                {primaryVehicle.year && (
                  <span className="text-[11px] text-gray-400">({primaryVehicle.year})</span>
                )}
              </div>
              <p className="truncate text-xs text-gray-600 dark:text-dark-300">
                {primaryVehicle.brandName} {primaryVehicle.modelName}
              </p>
              {primaryVehicle.saleAmount && (
                <p className="text-xs font-bold text-primary-600 dark:text-primary-400 mt-0.5">
                  {primaryVehicle.saleAmount.toLocaleString("tr-TR")} ₺
                </p>
              )}
            </div>
          </div>
        ) : lead.budget ? (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-gray-50 p-2 text-xs text-gray-700 dark:bg-dark-850 dark:text-dark-200">
            <BanknotesIcon className="size-4 text-emerald-500" />
            <span>
              Bütçe: <strong>{lead.budget.toLocaleString("tr-TR")} ₺</strong>
            </span>
          </div>
        ) : null}

        {/* Not Önizleme */}
        {lead.notes && (
          <p className="mt-2.5 text-xs text-gray-500 dark:text-dark-400 line-clamp-2 leading-relaxed">
            {lead.notes}
          </p>
        )}
      </div>

      {/* Kart Altı: Aktivite Sayaçları & Hızlı Aksiyon */}
      <div className="mt-4 pt-3 border-t border-gray-150 dark:border-dark-700 flex items-center justify-between text-xs text-gray-500 dark:text-dark-400">
        <div className="flex items-center gap-3">
          <span
            className="flex items-center gap-1 text-[11px]"
            title={`${lead._count?.testDrives || 0} Test Sürüşü`}
          >
            <CalendarDaysIcon className="size-3.5 text-amber-500" />
            <span>{lead._count?.testDrives || 0}</span>
          </span>
          <span
            className="flex items-center gap-1 text-[11px]"
            title={`${lead._count?.quotes || 0} Teklif`}
          >
            <DocumentTextIcon className="size-3.5 text-purple-500" />
            <span>{lead._count?.quotes || 0}</span>
          </span>
          <span
            className="flex items-center gap-1 text-[11px]"
            title={`${lead._count?.activities || 0} Aktivite`}
          >
            <ChatBubbleLeftRightIcon className="size-3.5 text-blue-500" />
            <span>{lead._count?.activities || 0}</span>
          </span>
        </div>

        {/* İleri Aşama Butonu */}
        {currentStageIndex >= 0 && currentStageIndex < KANBAN_STAGES.length - 1 && (
          <Button
            variant="flat"
            onClick={handleNextStage}
            className="h-7 px-2 text-[11px] font-semibold gap-1 text-primary-600 hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-primary-950/40 rounded-lg"
            title="Sonraki Aşamaya Taşı"
          >
            <span>İlerlet</span>
            <ChevronRightIcon className="size-3" />
          </Button>
        )}
      </div>
    </Card>
  );
}
