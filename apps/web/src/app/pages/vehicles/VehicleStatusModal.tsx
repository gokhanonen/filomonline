import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  TbArrowsExchange,
  TbCheck,
  TbKey,
  TbFileCheck,
  TbBuildingCommunity,
  TbBan,
  TbTrash,
} from "react-icons/tb";

import { Button } from "@/components/ui";
import { Modal } from "@/components/shared/Modal";
import {
  VEHICLE_STATUS_LABELS,
  type Vehicle,
  type VehicleStatus,
} from "@/@types/vehicle";
import { updateVehicle } from "@/services/vehicleService";
import { DeleteVehicleModal } from "./DeleteVehicleModal";

interface Props {
  open: boolean;
  onClose: () => void;
  vehicle: Vehicle | null;
  onStatusChanged: (newStatus: VehicleStatus) => void;
  onVehicleDeleted?: (vehicleId: string) => void;
}

interface StatusOption {
  value: VehicleStatus;
  label: string;
  badge: string;
  badgeBg: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  borderClass: string;
  bgLightClass: string;
}

const STATUS_OPTIONS: StatusOption[] = [
  {
    value: "STOKTA",
    label: "Stokta (Hazır Stok)",
    badge: "Hazır Stok",
    badgeBg: "bg-emerald-600 text-white",
    icon: TbCheck,
    description: "Araç satışa veya kiralamaya hazır. Genel stok ve vitrin listesinde aktif listelenir.",
    borderClass: "border-emerald-500",
    bgLightClass: "bg-emerald-50/80 border-emerald-400 dark:bg-emerald-950/40 dark:border-emerald-800",
  },
  {
    value: "KIRALAMADA",
    label: "Kiralamada",
    badge: "Kirada",
    badgeBg: "bg-amber-500 text-white",
    icon: TbKey,
    description: "Araç aktif bir kira sözleşmesi altında veya müşteri kullanımında bulunuyor.",
    borderClass: "border-amber-500",
    bgLightClass: "bg-amber-50/80 border-amber-400 dark:bg-amber-950/40 dark:border-amber-800",
  },
  {
    value: "SATILDI",
    label: "Satıldı",
    badge: "Satıldı",
    badgeBg: "bg-gray-600 text-white",
    icon: TbFileCheck,
    description: "Aracın satışı tamamlandı. Aktif filodan düşer, kârlılık ve ciro kayıtlarına aktarılır.",
    borderClass: "border-gray-500",
    bgLightClass: "bg-gray-100 border-gray-400 dark:bg-gray-800/60 dark:border-gray-700",
  },
  {
    value: "IC_KULLANIM",
    label: "İç Kullanım",
    badge: "İç Kullanım",
    badgeBg: "bg-blue-600 text-white",
    icon: TbBuildingCommunity,
    description: "Şirket personeli, yönetim veya operasyonel şirket içi saha hizmetinde kullanılan araç.",
    borderClass: "border-blue-500",
    bgLightClass: "bg-blue-50/80 border-blue-400 dark:bg-blue-950/40 dark:border-blue-800",
  },
  {
    value: "KULLANIM_DISI",
    label: "Kullanım Dışı",
    badge: "Kullanım Dışı",
    badgeBg: "bg-rose-600 text-white",
    icon: TbBan,
    description: "Bakım, servis, ağır hasar, tadilat veya geçici olarak operasyon harici tutulan araç.",
    borderClass: "border-rose-500",
    bgLightClass: "bg-rose-50/80 border-rose-400 dark:bg-rose-950/40 dark:border-rose-800",
  },
];

export function VehicleStatusModal({
  open,
  onClose,
  vehicle,
  onStatusChanged,
  onVehicleDeleted,
}: Props) {
  const [selectedStatus, setSelectedStatus] = useState<VehicleStatus>("STOKTA");
  const [saving, setSaving] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  useEffect(() => {
    if (vehicle) {
      setSelectedStatus(vehicle.status);
    }
  }, [vehicle]);

  if (!vehicle) return null;

  const currentStatus = vehicle.status;
  const isChanged = selectedStatus !== currentStatus;

  const handleSave = async () => {
    if (!isChanged) {
      onClose();
      return;
    }

    setSaving(true);
    try {
      await updateVehicle(vehicle.id, { status: selectedStatus });
      toast.success(
        `${vehicle.plate} statüsü güncellendi: ${VEHICLE_STATUS_LABELS[selectedStatus]}`,
      );
      onStatusChanged(selectedStatus);
      onClose();
    } catch (err) {
      toast.error(
        (err as { message?: string })?.message ?? "Statü güncellenemedi",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <div>
          <h3 className="text-base font-bold text-gray-900 dark:text-dark-100">
            Araç Statüsünü Değiştir
          </h3>
          <p className="mt-0.5 text-xs font-normal text-gray-500 dark:text-dark-300">
            {vehicle.plate} • {vehicle.brandName ?? ""}{" "}
            {vehicle.modelName ?? ""}
          </p>
        </div>
      }
      className="max-w-md"
    >
      <div className="space-y-4">
        <p className="text-xs text-gray-500 dark:text-dark-300">
          Süreç tetiklemelerinden bağımsız olarak aracın operasyonel durumunu
          doğrudan belirleyebilirsiniz:
        </p>

        <div className="space-y-2.5">
          {STATUS_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isSelected = selectedStatus === opt.value;
            const isCurrent = currentStatus === opt.value;

            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSelectedStatus(opt.value)}
                className={`relative flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-all ${
                  isSelected
                    ? `${opt.bgLightClass} ring-2 ring-primary-500/30`
                    : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/70 dark:border-dark-600 dark:bg-dark-750 dark:hover:bg-dark-700"
                }`}
              >
                <div
                  className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg ${opt.badgeBg}`}
                >
                  <Icon className="size-4.5" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-900 dark:text-dark-100">
                      {opt.label}
                    </span>
                    {isCurrent && (
                      <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-semibold text-gray-700 dark:bg-dark-500 dark:text-dark-200">
                        Mevcut
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-gray-500 dark:text-dark-300">
                    {opt.description}
                  </p>
                </div>

                <div className="mt-1 flex size-4.5 shrink-0 items-center justify-center rounded-full border border-gray-300 dark:border-dark-500">
                  {isSelected && (
                    <div className="size-2.5 rounded-full bg-primary-600" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Butonlar */}
        <div className="mt-6 flex items-center justify-between border-t border-gray-150 pt-4 dark:border-dark-600">
          {currentStatus === "KULLANIM_DISI" ? (
            <Button
              color="error"
              variant="soft"
              onClick={() => setDeleteModalOpen(true)}
              className="gap-1.5 text-xs text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-400"
            >
              <TbTrash className="size-4" />
              Aracı Sil
            </Button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <Button variant="flat" onClick={onClose} disabled={saving}>
              Vazgeç
            </Button>
            <Button
              color="primary"
              onClick={handleSave}
              disabled={(!isChanged && !saving) || saving}
              className="gap-1.5"
            >
              <TbArrowsExchange className="size-4" />
              {saving ? "Güncelleniyor..." : "Statüyü Güncelle"}
            </Button>
          </div>
        </div>
      </div>

      {/* Kullanım dışı araç silme modalı */}
      <DeleteVehicleModal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        vehicle={vehicle}
        onDeleted={() => {
          setDeleteModalOpen(false);
          onClose();
          onVehicleDeleted?.(vehicle.id);
        }}
      />
    </Modal>
  );
}
