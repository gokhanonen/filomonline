import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  TbTrash,
  TbAlertTriangle,
  TbCheck,
  TbShieldLock,
} from "react-icons/tb";

import { Button, Spinner } from "@/components/ui";
import { Modal } from "@/components/shared/Modal";
import type { Vehicle } from "@/@types/vehicle";
import {
  checkCanDeleteVehicle,
  deleteVehicle,
  type CanDeleteVehicleResult,
} from "@/services/vehicleService";

interface Props {
  open: boolean;
  onClose: () => void;
  vehicle: Vehicle | null;
  onDeleted: () => void;
}

export function DeleteVehicleModal({
  open,
  onClose,
  vehicle,
  onDeleted,
}: Props) {
  const [checking, setChecking] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [checkResult, setCheckResult] = useState<CanDeleteVehicleResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !vehicle) {
      setCheckResult(null);
      setError(null);
      return;
    }

    let active = true;
    setChecking(true);
    setError(null);

    checkCanDeleteVehicle(vehicle.id)
      .then((res) => {
        if (active) setCheckResult(res);
      })
      .catch((err) => {
        if (active) {
          setError(
            (err as { message?: string })?.message ??
              "Silme uygunluk kontrolü yapılırken bir hata oluştu.",
          );
        }
      })
      .finally(() => {
        if (active) setChecking(false);
      });

    return () => {
      active = false;
    };
  }, [open, vehicle]);

  if (!vehicle) return null;

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      await deleteVehicle(vehicle.id);
      toast.success(`${vehicle.plate} plakalı araç başarıyla silindi`);
      onClose();
      onDeleted();
    } catch (err) {
      const msg =
        (err as { message?: string })?.message ??
        "Araç silinirken bir hata oluştu";
      setError(msg);
      toast.error(msg);
    } finally {
      setDeleting(false);
    }
  };

  const titleContent = (
    <div className="flex items-center gap-3">
      <div className="flex size-10 items-center justify-center rounded-xl bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400">
        <TbTrash className="size-5" />
      </div>
      <div>
        <h3 className="text-base font-bold text-gray-900 dark:text-dark-50">
          Araç Kartını Sil
        </h3>
        <p className="text-xs text-gray-500 dark:text-dark-300">
          {vehicle.plate} • {[vehicle.brandName, vehicle.modelName].filter(Boolean).join(" ") || "Araç"}
        </p>
      </div>
    </div>
  );

  return (
    <Modal open={open} onClose={onClose} title={titleContent} className="max-w-lg">
      <div className="space-y-4">
        {/* Araç Kart Özeti */}
        <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50/70 p-3.5 dark:border-dark-600 dark:bg-dark-800/60">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-16 items-center justify-center rounded-lg border border-gray-300 bg-white font-mono font-bold tracking-wider text-gray-800 shadow-xs dark:border-dark-500 dark:bg-dark-700 dark:text-dark-100">
              <span className="text-xs text-blue-600 mr-1">TR</span>
              <span className="text-xs sm:text-sm">{vehicle.plate}</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800 dark:text-dark-100">
                {[vehicle.brandName, vehicle.modelName].filter(Boolean).join(" ") || "—"}
              </p>
              <p className="text-xs text-gray-500 dark:text-dark-300">
                {vehicle.year ? `${vehicle.year} Model • ` : ""}
                {vehicle.km != null ? `${vehicle.km.toLocaleString("tr-TR")} km` : "Km yok"}
              </p>
            </div>
          </div>
          <span className="rounded-lg bg-gray-200/80 px-2.5 py-1 text-xs font-medium text-gray-700 dark:bg-dark-600 dark:text-dark-200">
            {vehicle.status}
          </span>
        </div>

        {/* Kontrol Yükleniyor */}
        {checking && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Spinner className="size-8 text-primary-500" />
            <p className="mt-3 text-sm font-medium text-gray-600 dark:text-dark-300">
              Bağlantılı evrak ve sözleşme kayıtları taranıyor...
            </p>
          </div>
        )}

        {/* Hata Uyarısı */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
            <div className="flex items-start gap-2.5">
              <TbAlertTriangle className="size-4 shrink-0 text-red-600 mt-0.5" />
              <div>
                <p className="font-semibold">İşlem Başarısız</p>
                <p className="mt-0.5">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* DURUM 1: SİLME ENGELLENDİ (Mali İşlem, Fatura, Masraf veya Sözleşme Var) */}
        {!checking && checkResult && !checkResult.canDelete && (
          <div className="space-y-4">
            <div className="rounded-xl border border-red-300 bg-red-50/90 p-4 text-red-900 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-red-200/70 p-2 text-red-800 dark:bg-red-900/60 dark:text-red-300">
                  <TbShieldLock className="size-5" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-red-900 dark:text-red-100">
                    Araç Silme İşlemi Engellendi
                  </h4>
                  <p className="mt-1 text-xs leading-relaxed text-red-800 dark:text-red-200">
                    Sistem veri ve muhasebe bütünlüğünü korumak amacıyla üzerinde masraf, fatura, ödeme veya sözleşme kaydı bulunan araçlar silinemez.
                  </p>
                  
                  <div className="mt-3 space-y-1.5 rounded-lg border border-red-200 bg-white/70 p-2.5 dark:border-red-900/50 dark:bg-dark-800/80">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-red-800 dark:text-red-300">
                      Tespit Edilen Engelleyici İşlemler:
                    </p>
                    {checkResult.reasons.map((reason, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-gray-700 dark:text-dark-200">
                        <span className="size-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
                        <span>{reason}</span>
                      </div>
                    ))}
                  </div>

                  <p className="mt-3 text-xs text-red-700 dark:text-red-300">
                    💡 <b>Nasıl işlem yapılır?</b> Resmi muhasebe veya finans kaydı bulunan araçlar yasal gereklilikler sebebiyle silinemez. Bu aracı operasyondan düşürmek için statüsünü <b>"KULLANIM DIŞI"</b> olarak bırakabilirsiniz.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button variant="flat" onClick={onClose}>
                Anladım, Kapat
              </Button>
            </div>
          </div>
        )}

        {/* DURUM 2: SİLME ONAYI VERİLEBİLİR (Fatura/Masraf/Sözleşme Yok - Evrak ve Fotoğraflar Beraberinde Silinebilir) */}
        {!checking && checkResult && checkResult.canDelete && (
          <div className="space-y-4">
            {checkResult.hasWarnings ? (
              <div className="rounded-xl border border-amber-300 bg-amber-50/90 p-4 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-amber-200/70 p-2 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">
                    <TbAlertTriangle className="size-5" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-amber-900 dark:text-amber-100">
                      Dikkat: Ekli Evrak ve Fotoğraflar da Silinecektir!
                    </h4>
                    <p className="mt-1 text-xs leading-relaxed text-amber-800 dark:text-amber-200">
                      Bu araca bağlı herhangi bir muhasebe, fatura veya ödeme transaction kaydı bulunmadığı için silme işlemine izin verilmektedir. Ancak araca ait ekli resmi evraklar ve fotoğraflar da araçla birlikte <b>kalıcı olarak silinecektir</b>.
                    </p>
                    
                    <div className="mt-3 space-y-1.5 rounded-lg border border-amber-200 bg-white/70 p-2.5 dark:border-amber-900/50 dark:bg-dark-800/80">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                        Araçla Birlikte Silinecek Kayıtlar:
                      </p>
                      {checkResult.warnings?.map((warning, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs text-gray-700 dark:text-dark-200">
                          <span className="size-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                          <span>{warning}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-xs text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
                <div className="flex items-center gap-2 font-medium">
                  <TbCheck className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span>Bağlantı Kontrolü Başarılı: Bu araca ait herhangi bir masraf, fatura veya ödeme transaction kaydı bulunmuyor.</span>
                </div>
              </div>
            )}

            <div className="rounded-xl border border-red-200 bg-red-50/80 p-4 text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
              <div className="flex items-start gap-3">
                <TbAlertTriangle className="size-5 shrink-0 text-red-600 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-bold text-red-900 dark:text-red-100">
                    Bu işlem geri alınamaz!
                  </p>
                  <p className="text-xs text-red-800/90 dark:text-red-200/90 leading-relaxed">
                    <b>{vehicle.plate}</b> plakalı araç kartı, fotoğrafları, teknik kayıtları{checkResult.hasWarnings ? " ve tüm ekli resmi evrakları" : ""} sistemden <b>tamamen silinecektir</b>.
                  </p>
                </div>
              </div>
            </div>

            <p className="text-xs text-gray-500 dark:text-dark-300">
              Aracı silmek istediğinize emin misiniz?
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button variant="flat" onClick={onClose} disabled={deleting}>
                Vazgeç
              </Button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-xs transition hover:bg-red-700 focus:outline-hidden focus:ring-2 focus:ring-red-500 disabled:opacity-50"
              >
                {deleting ? (
                  <>
                    <Spinner className="size-4 text-white" />
                    <span>Siliniyor...</span>
                  </>
                ) : (
                  <>
                    <TbTrash className="size-4" />
                    <span>
                      {checkResult.hasWarnings
                        ? "Evet, Aracı ve Tüm Evrakları Sil"
                        : "Evet, Aracı Tamamen Sil"}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
