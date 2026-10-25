import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  TbCalendar,
  TbGauge,
  TbGasStation,
  TbPalette,
  TbClock,
  TbEye,
  TbPencil,
  TbFileText,
  TbCopy,
  TbMapPin,
  TbTag,
  TbTrash,
  TbCar,
  TbReceipt2,
  TbCashBanknote,
  TbLink,
  TbBrandWhatsapp,
  TbFileCheck,
  TbArrowsExchange,
} from "react-icons/tb";

import {
  FUEL_LABELS,
  TRANSMISSION_LABELS,
  VEHICLE_STATUS_LABELS,
  type Vehicle,
} from "@/@types/vehicle";
import { listingSourceIcon, matchListingSource, type ListingSource } from "@/@types/catalog";
import { RadialMenu, type RadialAction } from "@/components/shared/RadialMenu";
import { VehiclePhotoGalleryModal } from "./VehiclePhotoGalleryModal";

const STATUS_BADGE: Record<string, string> = {
  STOKTA: "bg-success",
  KIRALAMADA: "bg-warning",
  SATILDI: "bg-gray-500",
  IC_KULLANIM: "bg-blue-600",
  KULLANIM_DISI: "bg-rose-600",
};

function money(v?: string | null): string {
  if (!v) return "—";
  return "₺" + Number(v).toLocaleString("tr-TR", { maximumFractionDigits: 0 });
}

function daysInStock(v: Vehicle): string {
  const ref = v.purchaseDate ?? v.createdAt;
  const days = Math.max(0, Math.floor((Date.now() - new Date(ref).getTime()) / 86400000));
  return `${days} gün stokta`;
}

interface Props {
  vehicle: Vehicle;
  sources?: ListingSource[];
  onView: () => void;
  onEdit: () => void;
  onAddExpense?: () => void;
  onSale?: () => void;
  onContract?: () => void;
  onLinks?: () => void;
  onOption?: () => void;
  onWhatsApp?: () => void;
  onDocuments?: () => void;
  onCopy?: () => void;
  onTransfer?: () => void;
  onDelete?: () => void;
  onChangeStatus?: () => void;
}

export function VehicleCard({
  vehicle: v,
  sources = [],
  onView,
  onEdit,
  onAddExpense,
  onSale,
  onContract,
  onLinks,
  onOption,
  onWhatsApp,
  onDocuments,
  onCopy,
  onTransfer,
  onDelete,
  onChangeStatus,
}: Props) {
  const fuel = v.fuelType ? FUEL_LABELS[v.fuelType] : null;
  const trans = v.transmission ? TRANSMISSION_LABELS[v.transmission] : null;
  const cardRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);

  const firstLink = v.listingUrls?.[0];
  const firstSource = firstLink
    ? matchListingSource(firstLink.url, sources, firstLink.listingSourceId)
    : undefined;
  const firstIcon = listingSourceIcon(firstSource);
  const option = v.activeOption ?? null;

  const actions: RadialAction[] = [
    { icon: TbEye, label: "Önizle", color: "text-info", onClick: onView },
    { icon: TbPencil, label: "Düzenle", color: "text-primary-600", onClick: onEdit },
    { icon: TbReceipt2, label: "Masraf Ekle", color: "text-warning", onClick: onAddExpense ?? onView },
    ...(v.status !== "SATILDI"
      ? [{ icon: TbCashBanknote, label: "Satış Yap", color: "text-success", onClick: onSale ?? onView }]
      : []),
    ...(onOption
      ? [{ icon: TbTag, label: option ? "Opsiyonu Düzenle" : "Opsiyon Ekle", color: "text-amber-500", onClick: onOption }]
      : []),
    ...(onContract
      ? [{ icon: TbFileCheck, label: "Sözleşme", color: "text-blue-600 dark:text-blue-400", onClick: onContract }]
      : []),
    { icon: TbBrandWhatsapp, label: "WhatsApp Gönder", color: "text-green-500", onClick: onWhatsApp ?? onView },
    { icon: TbLink, label: firstLink ? "İlan Linkleri" : "İlan Linki Ekle", color: "text-fuchsia-500", onClick: onLinks ?? onView },
    { icon: TbFileText, label: "Evraklar", color: "text-secondary", onClick: onDocuments ?? onView },
    {
      icon: TbCopy,
      label: "Kopyala",
      color: "text-indigo-600 dark:text-indigo-400",
      onClick: onCopy ?? (() => toast.info("Araç kopyalama yakında aktif olacak")),
    },
    {
      icon: TbMapPin,
      label: "Lokasyon",
      color: "text-amber-500",
      onClick: onTransfer ?? (() => toast.info("Lokasyon transferi yakında aktif olacak")),
    },
    ...(onChangeStatus
      ? [
          {
            icon: TbArrowsExchange,
            label: "Statü Değiştir",
            color: "text-purple-600 dark:text-purple-400",
            onClick: onChangeStatus,
          },
        ]
      : onDelete
      ? [{ icon: TbTrash, label: "Pasifleştir", color: "text-error", onClick: onDelete }]
      : []),
  ];

  return (
    <>
      <div
        ref={cardRef}
        onClick={() => setMenuOpen(true)}
        className="group cursor-pointer overflow-hidden rounded-2xl border border-gray-150 bg-white shadow-sm transition hover:shadow-xl hover:ring-2 hover:ring-primary-500/30 dark:border-dark-600 dark:bg-dark-700"
      >
        {/* Fotoğraf + durum rozeti */}
        <div className="relative h-32 w-full overflow-hidden bg-gray-100 dark:bg-dark-800">
          {v.coverUrl ? (
            <img src={v.coverUrl} alt={v.plate} className="size-full object-cover transition duration-300 group-hover:scale-105" />
          ) : (
            <div className="flex size-full items-center justify-center text-gray-300 dark:text-dark-500">
              <TbCar className="size-16" />
            </div>
          )}
          <span className={`absolute right-3 top-3 rounded-md px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-white shadow ${STATUS_BADGE[v.status] ?? "bg-gray-500"}`}>
            {VEHICLE_STATUS_LABELS[v.status]}
          </span>
          {option && (
            <span
              className="absolute left-3 top-3 flex items-center gap-1 rounded-md bg-amber-500 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-white shadow"
              title={`${option.customerName ?? ""} — ${new Date(option.validUntil).toLocaleDateString("tr-TR")} tarihine kadar`}
            >
              <TbTag className="size-3.5" /> Opsiyonlu
            </span>
          )}
          {/* tıkla ipucu */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition group-hover:opacity-100">
            <span className="rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white">İşlemler için tıkla</span>
          </div>
        </div>

        {/* Gövde */}
        <div className="p-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-base font-bold text-gray-800 dark:text-dark-50">{v.plate}</h3>
            {/* Hızlı aksiyon: ilk ilan linki (radial açmadan) */}
            <div className="flex items-center gap-1">
              {firstLink && (
                <a
                  href={firstLink.url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="rounded-full p-1 transition hover:bg-gray-100 dark:hover:bg-dark-600"
                  title={firstSource?.label ?? "İlan Linki"}
                >
                  {firstIcon ? (
                    <img src={firstIcon} alt={firstSource?.label ?? ""} className="size-5 rounded-full object-contain" />
                  ) : (
                    <TbLink className="size-5 text-fuchsia-500" />
                  )}
                </a>
              )}
            </div>
          </div>
          <p className="mt-0.5 text-sm text-gray-400 dark:text-dark-300">
            {[v.brandName, v.modelName].filter(Boolean).join(" ") || "—"}
          </p>

          <div className="mt-2 grid grid-cols-2 gap-y-1.5 text-sm text-gray-600 dark:text-dark-200">
            <Info Icon={TbCalendar}>{v.year ?? "—"}</Info>
            <Info Icon={TbGauge}>{v.km != null ? `${v.km.toLocaleString("tr-TR")} km` : "—"}</Info>
            <Info Icon={TbGasStation}>{[fuel, trans].filter(Boolean).join(" • ") || "—"}</Info>
            <Info Icon={TbPalette}>{v.colorName ?? "—"}</Info>
            <Info Icon={TbClock} span>{daysInStock(v)}</Info>
            {option && (
              <div className="col-span-2 flex items-center gap-2 rounded-lg bg-amber-50 px-2 py-1 text-xs text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
                <TbTag className="size-4 shrink-0 text-amber-500" />
                <span className="truncate">
                  Opsiyon: <b>{option.customerName ?? "—"}</b> •{" "}
                  {new Date(option.validUntil).toLocaleDateString("tr-TR")}'e kadar
                </span>
              </div>
            )}
          </div>

          <hr className="my-2 border-gray-150 dark:border-dark-500" />

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Liste Fiyatı</p>
            <p className="text-lg font-bold text-gray-800 dark:text-dark-50">{money(v.listPrice)}</p>
          </div>
        </div>
      </div>

      <RadialMenu
        open={menuOpen}
        anchorRef={cardRef}
        actions={actions}
        onClose={() => setMenuOpen(false)}
        title={v.plate}
        imageUrl={v.coverUrl}
        onCenterClick={() => {
          setMenuOpen(false);
          setGalleryOpen(true);
        }}
      />

      <VehiclePhotoGalleryModal
        open={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        vehicle={v}
      />
    </>
  );
}

function Info({ Icon, children, span }: { Icon: React.ElementType; children: React.ReactNode; span?: boolean }) {
  return (
    <div className={`flex items-center gap-2 ${span ? "col-span-2" : ""}`}>
      <Icon className="size-4 shrink-0 text-gray-400" />
      <span className="truncate">{children}</span>
    </div>
  );
}
