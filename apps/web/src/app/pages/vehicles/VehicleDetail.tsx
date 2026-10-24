import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import {
  ArrowLeftIcon,
  PencilSquareIcon,
} from "@heroicons/react/24/outline";
import {
  TbBrandWhatsapp,
  TbCar,
  TbLink,
  TbTag,
  TbTool,
  TbKey,
  TbShieldCheck,
  TbAlertTriangle,
} from "react-icons/tb";
import { toast } from "sonner";

import { Page } from "@/components/shared/Page";
import { Button, Card, Spinner, Tag } from "@/components/ui";
import {
  DRIVE_LABELS,
  FUEL_LABELS,
  PURCHASE_REGIME_CONFIG,
  STATUS_TAG_COLOR,
  TRANSMISSION_LABELS,
  VEHICLE_STATUS_LABELS,
  type Vehicle,
} from "@/@types/vehicle";
import { listingSourceIcon, matchListingSource, type CatalogAll } from "@/@types/catalog";
import { getVehicle } from "@/services/vehicleService";
import { getCatalog } from "@/services/catalogService";
import { presignDownload } from "@/services/storageService";
import { DocumentManager } from "@/components/shared/DocumentManager";
import { VehicleForm } from "./VehicleForm";
import { ListingLinksModal } from "./ListingLinksModal";
import { VehicleOptionModal } from "./VehicleOptionModal";
import { WhatsAppModal } from "./WhatsAppModal";

function money(v?: string | null): string {
  if (!v) return "—";
  return "₺" + Number(v).toLocaleString("tr-TR", { maximumFractionDigits: 0 });
}
function fmtDate(d?: string | null): string {
  return d ? new Date(d).toLocaleDateString("tr-TR") : "—";
}

export default function VehicleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [catalog, setCatalog] = useState<CatalogAll | null>(null);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [activePhoto, setActivePhoto] = useState(0);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [linksOpen, setLinksOpen] = useState(false);
  const [optionOpen, setOptionOpen] = useState(false);
  const [waOpen, setWaOpen] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const v = await getVehicle(id);
      setVehicle(v);
      const urls = await Promise.all(
        (v.photos ?? []).map((p) => presignDownload(p.fileKey).catch(() => "")),
      );
      setPhotoUrls(urls.filter(Boolean));
      setActivePhoto(0);
    } catch {
      toast.error("Araç yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
    getCatalog().then(setCatalog).catch(() => void 0);
  }, [load]);

  if (loading || !vehicle) {
    return (
      <Page title="Araç Detayı">
        <div className="flex justify-center py-20"><Spinner className="size-9" /></div>
      </Page>
    );
  }

  const v = vehicle;
  const name = (id: string | null | undefined, list?: { id: string; name: string }[]) =>
    (id && list?.find((x) => x.id === id)?.name) || "—";

  const specs: [string, React.ReactNode][] = [
    ["Marka / Model", [v.brandName, v.modelName].filter(Boolean).join(" ") || "—"],
    ["Ruhsat Modeli", v.registrationModel || "—"],
    ["ERP Kodu", v.erpCode || "—"],
    ["Yıl", v.year ?? "—"],
    ["KM", v.km != null ? v.km.toLocaleString("tr-TR") : "—"],
    ["Renk", v.colorName ?? "—"],
    ["Yakıt", v.fuelType ? FUEL_LABELS[v.fuelType] : "—"],
    ["Vites", v.transmission ? TRANSMISSION_LABELS[v.transmission] : "—"],
    ["Çekiş", v.driveType ? DRIVE_LABELS[v.driveType] : "—"],
    ["Kasa Tipi", name(v.bodyTypeId, catalog?.bodyTypes)],
    ["Araç Tipi", name(v.vehicleTypeId, catalog?.vehicleTypes)],
    ["Kategori", name(v.categoryId, catalog?.vehicleCategories)],
    [
      "Motor Gücü",
      [v.enginePower ? `${v.enginePower} kW` : null, v.horsePower ? `${v.horsePower} HP` : null]
        .filter(Boolean)
        .join(" / ") || "—",
    ],
    ["Motor Hacmi", v.engineVolume ? `${v.engineVolume} cc` : "—"],
    [
      "Alım Rejimi",
      v.purchaseRegime && PURCHASE_REGIME_CONFIG[v.purchaseRegime]
        ? PURCHASE_REGIME_CONFIG[v.purchaseRegime].label
        : "—",
    ],
    ["Şase No", v.chassisNo ?? "—"],
    ["Motor No", v.engineNo ?? "—"],
  ];

  const totalTramer = useMemo(() => {
    return (v.tramerSet ?? []).reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
  }, [v.tramerSet]);

  return (
    <Page title={`${v.plate} — Detay`}>
      <div className="w-full px-(--margin-x) py-6">
        {/* Üst bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="outlined" isIcon onClick={() => navigate("/vehicles")} title="Geri">
              <ArrowLeftIcon className="size-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-dark-50">{v.plate}</h2>
                <Tag color={STATUS_TAG_COLOR[v.status]}>{VEHICLE_STATUS_LABELS[v.status]}</Tag>

                {/* Status Badges */}
                <div className="hidden sm:flex items-center gap-1.5 ml-2">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      v.spareKey
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                        : "bg-gray-100 text-gray-500 dark:bg-dark-700 dark:text-dark-400"
                    }`}
                  >
                    <TbKey className="size-3" />
                    {v.spareKey ? "Yedek Anahtar Var" : "Yedek Anahtar Yok"}
                  </span>

                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      v.warranty
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                        : "bg-gray-100 text-gray-500 dark:bg-dark-700 dark:text-dark-400"
                    }`}
                  >
                    <TbShieldCheck className="size-3" />
                    {v.warranty ? "Garantili" : "Garanti Yok"}
                  </span>

                  {v.heavyDamage && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-300">
                      <TbAlertTriangle className="size-3" />
                      Ağır Hasarlı
                    </span>
                  )}
                </div>
              </div>
              <p className="text-sm text-gray-400 dark:text-dark-300">
                {[v.brandName, v.modelName, v.year].filter(Boolean).join(" ")}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button color="success" variant="soft" className="gap-2" onClick={() => setWaOpen(true)}>
              <TbBrandWhatsapp className="size-5" /> WhatsApp
            </Button>
            {v.status === "STOKTA" && (
              <Button color="warning" variant="soft" className="gap-2" onClick={() => setOptionOpen(true)}>
                <TbTag className="size-5" /> {v.activeOption ? "Opsiyonu Düzenle" : "Opsiyon Ekle"}
              </Button>
            )}
            <Button color="primary" className="gap-2" onClick={() => setFormOpen(true)}>
              <PencilSquareIcon className="size-5" /> Düzenle
            </Button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[1.4fr_1fr]">
          {/* Galeri */}
          <Card className="overflow-hidden p-0">
            <div className="relative aspect-video w-full bg-gray-100 dark:bg-dark-800">
              {photoUrls.length > 0 ? (
                <img src={photoUrls[activePhoto]} alt={v.plate} className="size-full object-cover" />
              ) : (
                <div className="flex size-full items-center justify-center text-gray-300 dark:text-dark-500">
                  <TbCar className="size-24" />
                </div>
              )}
            </div>
            {photoUrls.length > 1 && (
              <div className="flex gap-2 overflow-x-auto p-3">
                {photoUrls.map((u, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActivePhoto(i)}
                    className={`size-16 shrink-0 overflow-hidden rounded-lg border-2 ${i === activePhoto ? "border-primary-600" : "border-transparent"}`}
                  >
                    <img src={u} alt="" className="size-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </Card>

          <div className="space-y-5">
            {/* Fiyatlandırma */}
            <Card className="p-5">
              <h3 className="mb-3 font-medium text-gray-800 dark:text-dark-50">Fiyatlandırma</h3>
              <div className="space-y-3">
                <PriceRow label="Liste Fiyatı" value={money(v.listPrice)} big />
                <PriceRow label="TENSF" value={money(v.tensf)} />
                <PriceRow label="Alış Fiyatı" value={money(v.purchasePrice)} />
                <PriceRow label="Alış Noter Fiyatı" value={money(v.purchaseNotaryPrice)} />
                <PriceRow label="Alış Tarihi" value={fmtDate(v.purchaseDate)} />
                {v.status === "SATILDI" && (
                  <>
                    <PriceRow label="Satış Tutarı" value={money(v.saleAmount ?? v.saleNotaryAmount)} />
                    <PriceRow label="Satış Noter Fiyatı" value={money(v.saleNotaryAmount)} />
                    <PriceRow label="Satış Tarihi" value={fmtDate(v.saleDate)} />
                  </>
                )}
              </div>
            </Card>

            {/* Opsiyon durumu */}
            <Card className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-medium text-gray-800 dark:text-dark-50">Opsiyon Durumu</h3>
                {v.status === "STOKTA" && (
                  <button type="button" onClick={() => setOptionOpen(true)} className="text-xs text-primary-600 hover:underline dark:text-primary-400">
                    {v.activeOption ? "Düzenle" : "Opsiyon ekle"}
                  </button>
                )}
              </div>
              {v.activeOption ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20">
                  <div className="flex items-center gap-2">
                    <TbTag className="size-5 text-amber-500" />
                    <span className="font-semibold text-amber-900 dark:text-amber-100">{v.activeOption.customerName ?? "—"}</span>
                  </div>
                  <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">
                    {money(v.activeOption.amount)} • {fmtDate(v.activeOption.validUntil)} tarihine kadar
                  </p>
                  {v.activeOption.note && <p className="mt-1 text-xs italic text-amber-700 dark:text-amber-300">{v.activeOption.note}</p>}
                </div>
              ) : (
                <p className="text-sm italic text-gray-400 dark:text-dark-300">Aktif opsiyon bulunmuyor</p>
              )}
            </Card>

            {/* İlan linkleri */}
            <Card className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-medium text-gray-800 dark:text-dark-50">İlan Linkleri</h3>
                <button type="button" onClick={() => setLinksOpen(true)} className="text-xs text-primary-600 hover:underline dark:text-primary-400">
                  Yönet
                </button>
              </div>
              {v.listingUrls && v.listingUrls.length > 0 ? (
                <div className="space-y-2">
                  {v.listingUrls.map((u) => {
                    const src = matchListingSource(u.url, catalog?.listingSources ?? [], u.listingSourceId);
                    const icon = listingSourceIcon(src);
                    return (
                      <a
                        key={u.id}
                        href={u.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-3 rounded-lg border border-gray-150 p-2 transition hover:bg-gray-50 dark:border-dark-500 dark:hover:bg-dark-600"
                      >
                        {icon ? (
                          <img src={icon} alt="" className="size-6 rounded-full object-contain" />
                        ) : (
                          <TbLink className="size-6 text-fuchsia-500" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-800 dark:text-dark-50">{src?.label ?? "Diğer kaynak"}</p>
                          <p className="truncate text-xs text-gray-400">{u.url}</p>
                        </div>
                      </a>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm italic text-gray-400 dark:text-dark-300">İlan linki eklenmemiş</p>
              )}
            </Card>
          </div>
        </div>

        {/* Teknik bilgiler */}
        <Card className="mt-5 p-5">
          <h3 className="mb-4 font-medium text-gray-800 dark:text-dark-50">Teknik Bilgiler</h3>
          <div className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
            {specs.map(([label, val]) => (
              <div key={label} className="flex justify-between border-b border-gray-100 pb-2 text-sm dark:border-dark-600">
                <span className="text-gray-400 dark:text-dark-300">{label}</span>
                <span className="font-medium text-gray-700 dark:text-dark-100">{val}</span>
              </div>
            ))}
          </div>
          {v.notes && (
            <div className="mt-4 rounded-lg bg-gray-50 p-3 text-sm text-gray-600 dark:bg-dark-600 dark:text-dark-200">
              {v.notes}
            </div>
          )}
        </Card>

        {/* Tramer Kayıtları */}
        <Card className="mt-5 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TbTool className="size-5 text-gray-500" />
              <h3 className="font-medium text-gray-800 dark:text-dark-50">Tramer Kayıtları</h3>
            </div>
            {totalTramer > 0 && (
              <span className="rounded-full bg-amber-100 px-3 py-1 font-mono text-xs font-bold text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                Toplam: ₺{totalTramer.toLocaleString("tr-TR", { maximumFractionDigits: 0 })}
              </span>
            )}
          </div>

          {v.tramerSet && v.tramerSet.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-400 dark:border-dark-600">
                    <th className="pb-2 font-medium">Tarih</th>
                    <th className="pb-2 font-medium text-right">Tutar</th>
                    <th className="pb-2 font-medium pl-4">Açıklama</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-dark-600">
                  {v.tramerSet.map((t) => (
                    <tr key={t.id} className="py-2.5">
                      <td className="py-2.5 font-medium text-gray-700 dark:text-dark-200">
                        {fmtDate(t.date)}
                      </td>
                      <td className="py-2.5 text-right font-mono font-bold text-gray-900 dark:text-dark-50">
                        {money(t.amount)}
                      </td>
                      <td className="py-2.5 pl-4 text-gray-600 dark:text-dark-300">
                        {t.description || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm italic text-gray-400 dark:text-dark-300">
              Kayıtlı tramer bilgisi bulunmuyor
            </p>
          )}
        </Card>

        {/* Evraklar */}
        <Card className="mt-5 p-5">
          <h3 className="mb-4 font-medium text-gray-800 dark:text-dark-50">Araç Evrakları</h3>
          <DocumentManager referenceType="VEHICLE" referenceId={v.id} />
        </Card>
      </div>

      <VehicleForm open={formOpen} onClose={() => setFormOpen(false)} onSaved={load} vehicle={v} />
      <ListingLinksModal
        open={linksOpen}
        onClose={() => setLinksOpen(false)}
        vehicle={v}
        sources={catalog?.listingSources ?? []}
        onChanged={(urls) => setVehicle((cur) => (cur ? { ...cur, listingUrls: urls } : cur))}
      />
      <VehicleOptionModal
        open={optionOpen}
        onClose={() => setOptionOpen(false)}
        vehicle={v}
        onChanged={(active) => setVehicle((cur) => (cur ? { ...cur, activeOption: active } : cur))}
      />
      <WhatsAppModal open={waOpen} onClose={() => setWaOpen(false)} vehicle={v} />
    </Page>
  );
}

function PriceRow({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-400 dark:text-dark-300">{label}</span>
      <span className={`font-semibold text-gray-800 dark:text-dark-50 ${big ? "text-xl" : ""}`}>{value}</span>
    </div>
  );
}
