import { useState, useEffect, useMemo } from "react";
import {
  CalendarDaysIcon,
  ClockIcon,
  IdentificationIcon,
  ChatBubbleBottomCenterTextIcon,
  UserIcon,
  PhoneIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";

import { Modal } from "@/components/shared/Modal";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import { Button, Input, Spinner } from "@/components/ui";
import {
  type Lead,
  createTestDrive,
  updateLead,
} from "@/services/crmService";
import { listVehicles } from "@/services/vehicleService";
import type { Vehicle } from "@/@types/vehicle";

interface Props {
  open: boolean;
  lead: Lead | null;
  onClose: () => void;
  onSuccess: () => void;
}

const pad = (n: number) => String(n).padStart(2, "0");
const getNextSlot = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() < 30 ? 30 : 60, 0, 0);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export function KanbanTestDriveModal({ open, lead, onClose, onSuccess }: Props) {
  const [stockVehicles, setStockVehicles] = useState<Vehicle[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);

  const [vehicleId, setVehicleId] = useState("");
  const [scheduledAt, setScheduledAt] = useState(getNextSlot());
  const [durationMinutes, setDurationMinutes] = useState("30");
  const [driverLicenseNo, setDriverLicenseNo] = useState("");
  const [feedbackNotes, setFeedbackNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Modal her açıldığında ve lead değiştiğinde formu hazırla
  useEffect(() => {
    if (!open || !lead) return;

    setScheduledAt(getNextSlot());
    setDurationMinutes("30");
    setDriverLicenseNo("");
    setFeedbackNotes("");

    // İlk ilgilenilen aracı seç
    const initialVehicleId = lead.interestedVehicles?.[0]?.vehicleId || "";
    setVehicleId(initialVehicleId);

    // Stoktaki araçları yükle
    setLoadingVehicles(true);
    listVehicles({ status: "STOKTA", pageSize: 100 })
      .then((res) => {
        setStockVehicles(res.items || []);
        // Eğer ilgilenilen araç yoksa ama stokta araç varsa ilkini seç
        if (!initialVehicleId && res.items?.length > 0) {
          setVehicleId(res.items[0].id);
        }
      })
      .catch(() => {
        setStockVehicles([]);
      })
      .finally(() => {
        setLoadingVehicles(false);
      });
  }, [open, lead]);

  // Araç seçenekleri
  const vehicleOptions = useMemo(() => {
    const interestedIds = new Set(lead?.interestedVehicles?.map((iv) => iv.vehicleId) || []);
    
    // Önce ilgilenilen araçlar (stok listesinde var mı veya direkt lead üzerinden)
    const options: { value: string; label: string; subLabel?: string }[] = [];

    // İlgilenilen araçlar
    lead?.interestedVehicles?.forEach((iv) => {
      if (iv.vehicle) {
        options.push({
          value: iv.vehicleId,
          label: `⭐ ${iv.vehicle.plate || "Plakasız"} · ${iv.vehicle.brandName || ""} ${iv.vehicle.modelName || ""}`,
          subLabel: "Müşterinin İlgilendiği Araç",
        });
      }
    });

    // Diğer stoktaki araçlar
    stockVehicles.forEach((v) => {
      if (!interestedIds.has(v.id)) {
        options.push({
          value: v.id,
          label: `${v.plate || "Plakasız"} · ${v.brandName || ""} ${v.modelName || ""}`,
          subLabel: v.saleAmount ? `${Number(v.saleAmount).toLocaleString("tr-TR")} TL` : undefined,
        });
      }
    });

    return options;
  }, [lead, stockVehicles]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead) return;

    if (!vehicleId) {
      toast.error("Lütfen deneme sürüşü yapılacak aracı seçin.");
      return;
    }
    if (!scheduledAt) {
      toast.error("Lütfen randevu tarihi ve saati belirleyin.");
      return;
    }

    setSaving(true);
    try {
      // 1. Deneme sürüşünü kaydet
      await createTestDrive({
        leadId: lead.id,
        vehicleId,
        scheduledAt: new Date(scheduledAt).toISOString(),
        durationMinutes: Number(durationMinutes) || 30,
        driverLicenseNo: driverLicenseNo.trim() || undefined,
        feedbackNotes: feedbackNotes.trim() || undefined,
      });

      // 2. Potansiyel durumunu TEST_DRIVE aşamasına güncelle
      await updateLead(lead.id, { status: "TEST_DRIVE" });

      toast.success(
        `${lead.fullName} için deneme sürüşü planlandı ve "Deneme Sürüşü" aşamasına taşındı.`,
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ||
          "Deneme sürüşü kaydedilemedi. Lütfen bilgileri kontrol edin.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (!open || !lead) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-warning/10 text-warning">
            <CalendarDaysIcon className="size-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-gray-900 dark:text-dark-50">
              Deneme Sürüşü Planla & Aşamaya Taşı
            </div>
            <div className="text-xs text-gray-500 dark:text-dark-300">
              Formu kaydettiğinizde müşteri otomatik olarak &quot;Deneme Sürüşü&quot; aşamasına taşınacaktır.
            </div>
          </div>
        </div>
      }
      className="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Potansiyel Müşteri Özeti */}
        <div className="flex items-center justify-between rounded-xl border border-gray-200/80 bg-gray-50/70 p-3 dark:border-dark-600 dark:bg-dark-800/80">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-full bg-primary-100 font-bold text-primary-700 dark:bg-primary-950/60 dark:text-primary-300">
              <UserIcon className="size-4.5" />
            </div>
            <div>
              <div className="text-xs font-bold text-gray-900 dark:text-dark-50">
                {lead.fullName}
              </div>
              <div className="flex items-center gap-2 text-tiny text-gray-500 dark:text-dark-300">
                {lead.phone && (
                  <span className="flex items-center gap-1 font-mono">
                    <PhoneIcon className="size-3" />
                    {lead.phone}
                  </span>
                )}
                {lead.budget && (
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    Bütçe: {Number(lead.budget).toLocaleString("tr-TR")} TL
                  </span>
                )}
              </div>
            </div>
          </div>
          <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-tiny font-bold text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
            Hedef: Deneme Sürüşü
          </span>
        </div>

        {/* Araç Seçimi */}
        <div>
          <SearchableSelect
            label="Deneme Sürüşü Aracı *"
            options={vehicleOptions}
            value={vehicleId}
            onChange={setVehicleId}
            onClear={() => setVehicleId("")}
            placeholder={loadingVehicles ? "Araçlar yükleniyor..." : "Araç arayıp seçin..."}
            disabled={loadingVehicles}
          />
        </div>

        {/* Randevu Tarihi ve Tahmini Süre */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            label="Randevu Tarihi & Saati *"
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            required
            prefix={<CalendarDaysIcon className="size-4 text-gray-400" />}
          />
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-dark-200">
              Tahmini Süre
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {[15, 30, 45, 60].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setDurationMinutes(String(mins))}
                  className={`flex items-center justify-center rounded-lg border py-2 text-xs font-semibold transition-all ${
                    durationMinutes === String(mins)
                      ? "border-primary-500 bg-primary-50 text-primary-700 dark:border-primary-400 dark:bg-primary-950/50 dark:text-primary-300"
                      : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-dark-600 dark:bg-dark-750 dark:text-dark-200 dark:hover:bg-dark-700"
                  }`}
                >
                  <ClockIcon className="mr-1 size-3.5" />
                  {mins} dk
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Ehliyet No & Notlar */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            label="Sürücü Belgesi / Ehliyet No (Opsiyonel)"
            placeholder="Örn: 12345678"
            value={driverLicenseNo}
            onChange={(e) => setDriverLicenseNo(e.target.value)}
            prefix={<IdentificationIcon className="size-4 text-gray-400" />}
          />
          <Input
            label="Planlama Notu (Opsiyonel)"
            placeholder="Örn: Müşteri otobanda denemek istiyor"
            value={feedbackNotes}
            onChange={(e) => setFeedbackNotes(e.target.value)}
            prefix={<ChatBubbleBottomCenterTextIcon className="size-4 text-gray-400" />}
          />
        </div>

        {/* Aksiyon Butonları */}
        <div className="flex items-center justify-end gap-2.5 border-t border-gray-150 pt-3 dark:border-dark-600">
          <Button
            type="button"
            variant="outlined"
            onClick={onClose}
            disabled={saving}
            className="cursor-pointer"
          >
            Vazgeç
          </Button>
          <Button
            type="submit"
            color="primary"
            disabled={saving || !vehicleId || !scheduledAt}
            className="cursor-pointer min-w-36"
          >
            {saving ? (
              <span className="flex items-center gap-1.5">
                <Spinner className="size-4" />
                Kaydediliyor...
              </span>
            ) : (
              "Randevuyu Kaydet & Taşı"
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
