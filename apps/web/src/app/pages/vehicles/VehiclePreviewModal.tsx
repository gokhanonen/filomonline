import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  TbCar,
  TbGauge,
  TbGasStation,
  TbCalendar,
  TbPalette,
  TbTag,
  TbShieldCheck,
  TbKey,
  TbAlertTriangle,
  TbReceipt2,
  TbBrandWhatsapp,
  TbFileText,
  TbPencil,
  TbExternalLink,
  TbLink,
  TbCopy,
  TbFileCheck,
  TbMapPin,
  TbArrowsExchange,
} from "react-icons/tb";

import { Button, Tag, Spinner } from "@/components/ui";
import { Modal } from "@/components/shared/Modal";
import {
  DRIVE_LABELS,
  FUEL_LABELS,
  PURCHASE_REGIME_CONFIG,
  STATUS_TAG_COLOR,
  TRANSMISSION_LABELS,
  VEHICLE_STATUS_LABELS,
  type Vehicle,
} from "@/@types/vehicle";
import { listingSourceIcon, matchListingSource, type ListingSource } from "@/@types/catalog";
import { getVehicle } from "@/services/vehicleService";
import { presignDownload } from "@/services/storageService";

interface Props {
  open: boolean;
  onClose: () => void;
  vehicle: Vehicle | null;
  sources?: ListingSource[];
  onEdit?: (v: Vehicle) => void;
  onCopy?: (v: Vehicle) => void;
  onWhatsApp?: (v: Vehicle) => void;
  onDocuments?: (v: Vehicle) => void;
  onExpense?: (v: Vehicle) => void;
  onOption?: (v: Vehicle) => void;
  onContract?: (v: Vehicle) => void;
  onTransfer?: (v: Vehicle) => void;
  onChangeStatus?: (v: Vehicle) => void;
}

function money(v?: string | null): string {
  if (!v) return "—";
  return "₺" + Number(v).toLocaleString("tr-TR", { maximumFractionDigits: 0 });
}

export function VehiclePreviewModal({
  open,
  onClose,
  vehicle,
  sources = [],
  onEdit,
  onCopy,
  onWhatsApp,
  onDocuments,
  onExpense,
  onOption,
  onContract,
  onTransfer,
  onChangeStatus,
}: Props) {
  const navigate = useNavigate();
  const [full, setFull] = useState<Vehicle | null>(vehicle);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [activePhoto, setActivePhoto] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !vehicle) return;
    setFull(vehicle);
    setActivePhoto(0);
    setPhotoUrls([]);

    // Detay kaydını ve fotoğraflarını çek
    setLoading(true);
    getVehicle(vehicle.id)
      .then(async (v) => {
        setFull(v);
        const urls = await Promise.all(
          (v.photos ?? []).map((p) =>
            p.url ? Promise.resolve(p.url) : presignDownload(p.fileKey).catch(() => ""),
          ),
        );
        const validUrls = urls.filter(Boolean);
        if (validUrls.length === 0 && v.coverUrl) {
          validUrls.push(v.coverUrl);
        }
        setPhotoUrls(validUrls);
      })
      .catch(() => {
        if (vehicle.coverUrl) setPhotoUrls([vehicle.coverUrl]);
      })
      .finally(() => setLoading(false));
  }, [open, vehicle]);

  if (!vehicle) return null;
  const v = full ?? vehicle;

  const totalTramer = (v.tramerSet ?? []).reduce(
    (acc, t) => acc + (Number(t.amount) || 0),
    0,
  );

  const goToDetail = () => {
    onClose();
    navigate(`/vehicles/${v.id}`);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      className="max-w-3xl overflow-hidden p-0"
      hideHeader
    >
      {/* Üst Bar: Plaka & Durum */}
      <div className="flex items-center justify-between border-b border-gray-150 px-5 py-3.5 dark:border-dark-600">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-gray-900 px-3 py-1 font-mono text-base font-bold text-white shadow-sm">
            {v.plate}
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-800 dark:text-dark-50">
              {[v.brandName, v.modelName].filter(Boolean).join(" ") || "Araç Önizleme"}
            </h3>
            <p className="text-xs text-gray-400">
              {[v.year ? `${v.year} Model` : null, v.registrationModel].filter(Boolean).join(" • ")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Tag color={STATUS_TAG_COLOR[v.status] ?? "neutral"}>
            {VEHICLE_STATUS_LABELS[v.status] ?? v.status}
          </Tag>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-dark-600 dark:hover:text-dark-100"
            title="Kapat"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="max-h-[75vh] overflow-y-auto p-5 space-y-4">
        {/* Galeri / Fotoğraf */}
        <div className="overflow-hidden rounded-xl bg-gray-100 dark:bg-dark-800">
          <div className="relative aspect-video w-full">
            {photoUrls.length > 0 ? (
              <img
                src={photoUrls[activePhoto] ?? photoUrls[0]}
                alt={v.plate}
                className="size-full object-cover"
              />
            ) : (
              <div className="flex size-full items-center justify-center text-gray-300 dark:text-dark-500">
                <TbCar className="size-20" />
              </div>
            )}

            {/* Rozetler */}
            <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
              {v.spareKey && (
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-600/90 px-2 py-0.5 text-tiny font-semibold text-white shadow backdrop-blur">
                  <TbKey className="size-3" /> Yedek Anahtar
                </span>
              )}
              {v.warranty && (
                <span className="inline-flex items-center gap-1 rounded-md bg-blue-600/90 px-2 py-0.5 text-tiny font-semibold text-white shadow backdrop-blur">
                  <TbShieldCheck className="size-3" /> Garantili
                </span>
              )}
              {v.heavyDamage && (
                <span className="inline-flex items-center gap-1 rounded-md bg-red-600/90 px-2 py-0.5 text-tiny font-semibold text-white shadow backdrop-blur">
                  <TbAlertTriangle className="size-3" /> Ağır Hasarlı
                </span>
              )}
            </div>
          </div>

          {photoUrls.length > 1 && (
            <div className="flex gap-2 overflow-x-auto p-2 bg-gray-50 dark:bg-dark-700">
              {photoUrls.map((u, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActivePhoto(i)}
                  className={`size-14 shrink-0 overflow-hidden rounded-lg border-2 transition ${
                    i === activePhoto ? "border-primary-600" : "border-transparent opacity-70 hover:opacity-100"
                  }`}
                >
                  <img src={u} alt="" className="size-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Fiyat Kartları */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-gray-150 bg-gray-50/50 p-3 dark:border-dark-600 dark:bg-dark-800/50">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Liste Fiyatı</p>
            <p className="mt-0.5 text-base font-bold text-gray-900 dark:text-dark-50">{money(v.listPrice)}</p>
          </div>
          <div className="rounded-xl border border-gray-150 bg-gray-50/50 p-3 dark:border-dark-600 dark:bg-dark-800/50">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">TENSF</p>
            <p className="mt-0.5 text-base font-bold text-gray-900 dark:text-dark-50">{money(v.tensf)}</p>
          </div>
          <div className="rounded-xl border border-gray-150 bg-gray-50/50 p-3 dark:border-dark-600 dark:bg-dark-800/50">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Alış Fiyatı</p>
            <p className="mt-0.5 text-base font-bold text-gray-900 dark:text-dark-50">{money(v.purchasePrice)}</p>
          </div>
          <div className="rounded-xl border border-gray-150 bg-gray-50/50 p-3 dark:border-dark-600 dark:bg-dark-800/50">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Tramer Toplamı</p>
            <p className="mt-0.5 text-base font-bold text-amber-600 dark:text-amber-400">
              {totalTramer > 0 ? money(String(totalTramer)) : "Hasarsız"}
            </p>
          </div>
        </div>

        {/* Opsiyon Bildirimi (varsa) */}
        {v.activeOption && (
          <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
            <div className="flex items-center gap-2">
              <TbTag className="size-4 text-amber-500" />
              <span>
                Opsiyon Sahibi: <b>{v.activeOption.customerName ?? "—"}</b> •{" "}
                {money(v.activeOption.amount)} •{" "}
                {new Date(v.activeOption.validUntil).toLocaleDateString("tr-TR")} tarihine kadar
              </span>
            </div>
          </div>
        )}

        {/* Temel Özellikler Izgarası */}
        <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
          <div className="flex items-center gap-2 rounded-lg border border-gray-100 p-2.5 dark:border-dark-600">
            <TbGauge className="size-4 text-gray-400" />
            <div>
              <span className="text-gray-400">Kilometre:</span>{" "}
              <span className="font-semibold text-gray-700 dark:text-dark-100">
                {v.km != null ? `${v.km.toLocaleString("tr-TR")} km` : "—"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-gray-100 p-2.5 dark:border-dark-600">
            <TbGasStation className="size-4 text-gray-400" />
            <div>
              <span className="text-gray-400">Yakıt:</span>{" "}
              <span className="font-semibold text-gray-700 dark:text-dark-100">
                {v.fuelType ? FUEL_LABELS[v.fuelType] : "—"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-gray-100 p-2.5 dark:border-dark-600">
            <TbCalendar className="size-4 text-gray-400" />
            <div>
              <span className="text-gray-400">Vites:</span>{" "}
              <span className="font-semibold text-gray-700 dark:text-dark-100">
                {v.transmission ? TRANSMISSION_LABELS[v.transmission] : "—"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-gray-100 p-2.5 dark:border-dark-600">
            <TbPalette className="size-4 text-gray-400" />
            <div>
              <span className="text-gray-400">Renk:</span>{" "}
              <span className="font-semibold text-gray-700 dark:text-dark-100">{v.colorName ?? "—"}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-gray-100 p-2.5 dark:border-dark-600">
            <TbCar className="size-4 text-gray-400" />
            <div>
              <span className="text-gray-400">Çekiş:</span>{" "}
              <span className="font-semibold text-gray-700 dark:text-dark-100">
                {v.driveType ? DRIVE_LABELS[v.driveType] : "—"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-gray-100 p-2.5 dark:border-dark-600">
            <TbTag className="size-4 text-gray-400" />
            <div>
              <span className="text-gray-400">Alım Rejimi:</span>{" "}
              <span className="font-semibold text-gray-700 dark:text-dark-100">
                {v.purchaseRegime && PURCHASE_REGIME_CONFIG[v.purchaseRegime]
                  ? PURCHASE_REGIME_CONFIG[v.purchaseRegime].label
                  : "—"}
              </span>
            </div>
          </div>
        </div>

        {/* İlan Linkleri (varsa) */}
        {v.listingUrls && v.listingUrls.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <p className="text-xs font-semibold text-gray-500 dark:text-dark-300">İlan Linkleri</p>
            <div className="flex flex-wrap gap-2">
              {v.listingUrls.map((u) => {
                const src = matchListingSource(u.url, sources, u.listingSourceId);
                const icon = listingSourceIcon(src);
                return (
                  <a
                    key={u.id}
                    href={u.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-150 px-2.5 py-1 text-xs text-gray-700 transition hover:bg-gray-100 dark:border-dark-600 dark:text-dark-200 dark:hover:bg-dark-700"
                  >
                    {icon ? (
                      <img src={icon} alt="" className="size-4 rounded-full object-contain" />
                    ) : (
                      <TbLink className="size-4 text-fuchsia-500" />
                    )}
                    <span>{src?.label ?? "İlan"}</span>
                    <TbExternalLink className="size-3 text-gray-400" />
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {v.notes && (
          <div className="rounded-lg bg-gray-50 p-2.5 text-xs text-gray-600 dark:bg-dark-800 dark:text-dark-300">
            <b>Not:</b> {v.notes}
          </div>
        )}
      </div>

      {/* Alt Aksiyon Çubuğu */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-150 bg-gray-50 px-5 py-3 dark:border-dark-600 dark:bg-dark-800">
        <div className="flex flex-wrap items-center gap-1.5">
          {onWhatsApp && (
            <Button
              color="success"
              variant="soft"
              className="gap-1 px-3 py-1.5 text-xs"
              onClick={() => {
                onClose();
                onWhatsApp(v);
              }}
            >
              <TbBrandWhatsapp className="size-4" /> WhatsApp
            </Button>
          )}

          {onDocuments && (
            <Button
              color="secondary"
              variant="soft"
              className="gap-1 px-3 py-1.5 text-xs"
              onClick={() => {
                onClose();
                onDocuments(v);
              }}
            >
              <TbFileText className="size-4" /> Evraklar
            </Button>
          )}

          {onExpense && (
            <Button
              color="warning"
              variant="soft"
              className="gap-1 px-3 py-1.5 text-xs"
              onClick={() => {
                onClose();
                onExpense(v);
              }}
            >
              <TbReceipt2 className="size-4" /> Masraf
            </Button>
          )}

          {onCopy && (
            <Button
              color="primary"
              variant="soft"
              className="gap-1 px-3 py-1.5 text-xs text-indigo-700 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300"
              onClick={() => {
                onClose();
                onCopy(v);
              }}
            >
              <TbCopy className="size-4" /> Kopyala
            </Button>
          )}

          {onOption && (
            <Button
              color="warning"
              variant="soft"
              className="gap-1 px-3 py-1.5 text-xs text-amber-700 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300"
              onClick={() => {
                onClose();
                onOption(v);
              }}
            >
              <TbTag className="size-4" /> Opsiyon
            </Button>
          )}

          {onContract && (
            <Button
              color="info"
              variant="soft"
              className="gap-1 px-3 py-1.5 text-xs text-blue-700 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300"
              onClick={() => {
                onClose();
                onContract(v);
              }}
            >
              <TbFileCheck className="size-4" /> Sözleşme
            </Button>
          )}

          {onTransfer && (
            <Button
              color="warning"
              variant="soft"
              className="gap-1 px-3 py-1.5 text-xs text-amber-700 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300"
              onClick={() => {
                onClose();
                onTransfer(v);
              }}
            >
              <TbMapPin className="size-4" /> Lokasyon
            </Button>
          )}

          {onChangeStatus && (
            <Button
              variant="outlined"
              className="gap-1 px-3 py-1.5 text-xs text-purple-600 border-purple-200 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-400 dark:hover:bg-purple-950/30"
              onClick={() => {
                onClose();
                onChangeStatus(v);
              }}
            >
              <TbArrowsExchange className="size-4" /> Statü Değiştir
            </Button>
          )}

          {onEdit && (
            <Button
              variant="outlined"
              className="gap-1 px-3 py-1.5 text-xs"
              onClick={() => {
                onClose();
                onEdit(v);
              }}
            >
              <TbPencil className="size-4" /> Düzenle
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {loading && <Spinner className="size-4 text-gray-400" />}
          <Button variant="outlined" className="px-3 py-1.5 text-xs" onClick={onClose}>
            Kapat
          </Button>
          <Button color="primary" className="gap-1.5 px-3 py-1.5 text-xs" onClick={goToDetail}>
            <span>Tam Detay Sayfası</span>
            <TbExternalLink className="size-4" />
          </Button>
        </div>
      </div>
    </Modal>
  );
}
