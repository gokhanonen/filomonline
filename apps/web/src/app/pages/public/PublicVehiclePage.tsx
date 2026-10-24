import { useEffect, useState } from "react";
import { useParams } from "react-router";
import {
  TbBrandWhatsapp,
  TbCar,
  TbCarOff,
  TbCheck,
  TbChevronLeft,
  TbChevronRight,
  TbColorSwatch,
  TbEngine,
  TbGasStation,
  TbGauge,
  TbKey,
  TbManualGearbox,
  TbMapPin,
  TbPhone,
  TbShieldCheck,
  TbX,
} from "react-icons/tb";

import { Spinner } from "@/components/ui";
import { getPublicVehicle } from "@/services/vehicleService";
import type { PublicVehicleResponse } from "@/@types/vehicle";
import {
  DRIVE_LABELS,
  FUEL_LABELS,
  TRANSMISSION_LABELS,
} from "@/@types/vehicle";

export default function PublicVehiclePage() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PublicVehicleResponse | null>(null);
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    getPublicVehicle(token)
      .then((res) => {
        setData(res);
        setActivePhotoIdx(0);
      })
      .catch((err) => {
        const msg =
          err?.response?.data?.message ||
          "Araç paylaşım bilgisi yüklenemedi veya bağlantı geçersiz.";
        setData({
          status: "disabled",
          reason: "INACTIVE",
          message: msg,
        });
      })
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-dark-900 px-4">
        <Spinner className="size-10 text-primary-500" />
        <p className="mt-4 text-sm text-gray-500 dark:text-dark-300 font-medium animate-pulse">
          Araç bilgileri hazırlanıyor...
        </p>
      </div>
    );
  }

  // --- DURUM 1: Araç Satıldı veya Link Devre Dışı ---
  if (!data || data.status === "disabled") {
    const isSold = data?.reason === "SOLD";
    const company = data?.company;
    const summary = data?.vehicleSummary;

    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-dark-900 dark:to-dark-950 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg bg-white dark:bg-dark-800 rounded-2xl shadow-xl border border-gray-200/80 dark:border-dark-700 p-8 text-center">
          <div
            className={`mx-auto size-20 rounded-2xl flex items-center justify-center mb-6 shadow-inner ${
              isSold
                ? "bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400"
                : "bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400"
            }`}
          >
            {isSold ? <TbCarOff className="size-10" /> : <TbX className="size-10" />}
          </div>

          <span
            className={`inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-3 ${
              isSold
                ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                : "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300"
            }`}
          >
            {isSold ? "Satışı Gerçekleşti" : "İlan Pasif"}
          </span>

          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isSold ? "Bu Araç Satılmıştır" : "İlan Yayından Kaldırıldı"}
          </h1>

          <p className="mt-2 text-sm text-gray-600 dark:text-dark-300 max-w-sm mx-auto">
            {data?.message ||
              "Bu aracın satışı tamamlandığı için dış paylaşım bağlantısı otomatik olarak kapatılmıştır."}
          </p>

          {summary && (summary.brandName || summary.modelName) && (
            <div className="mt-6 p-4 rounded-xl bg-gray-50 dark:bg-dark-700/50 border border-gray-200/60 dark:border-dark-600 text-left">
              <p className="text-xs text-gray-400 dark:text-dark-300 font-medium uppercase tracking-wider">
                Araç Bilgisi
              </p>
              <p className="text-base font-semibold text-gray-900 dark:text-white mt-1">
                {[summary.brandName, summary.modelName, summary.year].filter(Boolean).join(" ")}
              </p>
              {summary.plate && (
                <p className="text-xs font-mono text-gray-500 dark:text-dark-400 mt-0.5">
                  Plaka: {summary.plate}
                </p>
              )}
            </div>
          )}

          {company && (
            <div className="mt-6 pt-6 border-t border-gray-100 dark:border-dark-700 text-center">
              {company.logoUrl && (
                <img
                  src={company.logoUrl}
                  alt={company.name || "Firma Logosu"}
                  className="h-10 mx-auto object-contain mb-2"
                />
              )}
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {company.name}
              </p>
              {company.address && (
                <p className="text-xs text-gray-500 dark:text-dark-400 mt-1">
                  {company.address}
                </p>
              )}

              <div className="mt-4 flex flex-col sm:flex-row gap-2 justify-center">
                {company.phone && (
                  <a
                    href={`tel:${company.phone}`}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gray-900 dark:bg-dark-700 text-white text-xs font-semibold hover:bg-gray-800 transition"
                  >
                    <TbPhone className="size-4" /> Bizi Arayın
                  </a>
                )}
                {company.phone && (
                  <a
                    href={`https://wa.me/${company.phone.replace(/\D/g, "")}?text=${encodeURIComponent(
                      `Merhaba, ${
                        summary?.brandName ? `${summary.brandName} ${summary.modelName || ""}` : "araç"
                      } satılmış görünüyor. Benzer stoklarınız hakkında bilgi alabilir miyim?`,
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition"
                  >
                    <TbBrandWhatsapp className="size-4" /> Benzer Araçları Sor
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- DURUM 2: Aktif İlan ---
  const v = data.vehicle;
  const company = data.company;
  const photos = v.photos && v.photos.length > 0 ? v.photos : [];
  const currentPhoto = photos[activePhotoIdx] ?? null;

  const title = [v.year, v.brandName, v.modelName].filter(Boolean).join(" ");
  const cleanPhone = company?.phone?.replace(/\D/g, "") || "";
  const waChatUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
        `Merhaba, ${title} (${v.plate}) aracı hakkında bilgi almak istiyorum. Link: ${window.location.href}`,
      )}`
    : "";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-950 text-gray-800 dark:text-dark-100 flex flex-col">
      {/* Üst Bar / Firma Bilgisi */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-dark-900/90 backdrop-blur-md border-b border-gray-200/80 dark:border-dark-800 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {company?.logoUrl ? (
              <img
                src={company.logoUrl}
                alt={company.name || "Logo"}
                className="h-9 w-auto max-w-[120px] sm:max-w-[160px] object-contain rounded"
              />
            ) : (
              <div className="size-9 rounded-lg bg-primary-500 text-white flex items-center justify-center font-bold text-sm">
                {company?.name?.slice(0, 2).toUpperCase() || "FL"}
              </div>
            )}
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
                {company?.name || "FilomOnline"}
              </p>
              {company?.address && (
                <p className="text-xs text-gray-500 dark:text-dark-400 line-clamp-1">
                  {company.address}
                </p>
              )}
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2.5">
            {company?.phone && (
              <a
                href={`tel:${company.phone}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-gray-300 dark:border-dark-700 text-xs font-semibold text-gray-700 dark:text-dark-200 hover:bg-gray-100 dark:hover:bg-dark-800 transition"
              >
                <TbPhone className="size-4" /> {company.phone}
              </a>
            )}
            {waChatUrl && (
              <a
                href={waChatUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 shadow-sm transition"
              >
                <TbBrandWhatsapp className="size-4" /> WhatsApp'tan Yazın
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Ana Gövde */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 pb-24 sm:pb-12">
        {/* Özel Satıcı Notu / Banner (varsa) */}
        {data.customNote && (
          <div className="mb-6 p-4 rounded-xl bg-primary-50 dark:bg-primary-950/40 border border-primary-200 dark:border-primary-800/50 flex items-start gap-3">
            <span className="p-1 rounded bg-primary-500 text-white text-xs font-bold uppercase mt-0.5">
              Not
            </span>
            <p className="text-sm text-primary-900 dark:text-primary-200 font-medium">
              {data.customNote}
            </p>
          </div>
        )}

        {/* Başlık & Fiyat Alanı */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="px-2.5 py-1 rounded-md bg-gray-900 dark:bg-dark-700 text-white font-mono text-xs font-semibold tracking-wider">
                {v.plate}
              </span>
              <span className="px-2.5 py-1 rounded-md bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
                Stokta
              </span>
              {v.isReserved && (
                <span className="px-2.5 py-1 rounded-md bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 text-xs font-semibold">
                  Opsiyonlu
                </span>
              )}
              {v.warranty && (
                <span className="px-2.5 py-1 rounded-md bg-blue-100 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 text-xs font-semibold flex items-center gap-1">
                  <TbShieldCheck className="size-3.5" /> Garantili
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              {title}
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-dark-400 mt-1">
              {[
                v.fuelType ? FUEL_LABELS[v.fuelType] : null,
                v.transmission ? TRANSMISSION_LABELS[v.transmission] : null,
                v.km != null ? `${v.km.toLocaleString("tr-TR")} km` : null,
                v.colorName,
              ]
                .filter(Boolean)
                .join(" • ")}
            </p>
          </div>

          <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white px-6 py-4 rounded-2xl shadow-lg flex flex-col items-start md:items-end">
            <span className="text-xs font-medium text-emerald-100 uppercase tracking-wider">
              {data.title || "Satış Fiyatı"}
            </span>
            <span className="text-2xl sm:text-3xl font-black tracking-tight">
              {v.listPrice != null
                ? `${v.listPrice.toLocaleString("tr-TR")} TL`
                : "Fiyat Belirtilmedi"}
            </span>
          </div>
        </div>

        {/* Galeri & Teknik Özellikler Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sol Kolon: Fotoğraf Galerisi */}
          <div className="lg:col-span-7 flex flex-col gap-3">
            <div className="relative aspect-[16/10] bg-gray-900 rounded-2xl overflow-hidden shadow-md group">
              {currentPhoto ? (
                <img
                  src={currentPhoto.url || currentPhoto.thumbUrl || ""}
                  alt={`${title} - Fotoğraf ${activePhotoIdx + 1}`}
                  onClick={() => setLightboxOpen(true)}
                  className="w-full h-full object-cover cursor-pointer transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-gray-500">
                  <TbCar className="size-16 stroke-1" />
                  <p className="text-xs mt-2">Fotoğraf bulunmuyor</p>
                </div>
              )}

              {/* Sol / Sağ Oklar */}
              {photos.length > 1 && (
                <>
                  <button
                    onClick={() =>
                      setActivePhotoIdx((prev) =>
                        prev === 0 ? photos.length - 1 : prev - 1,
                      )
                    }
                    className="absolute left-3 top-1/2 -translate-y-1/2 size-10 rounded-full bg-black/50 text-white hover:bg-black/80 flex items-center justify-center backdrop-blur-sm transition"
                    title="Önceki Fotoğraf"
                  >
                    <TbChevronLeft className="size-6" />
                  </button>
                  <button
                    onClick={() =>
                      setActivePhotoIdx((prev) =>
                        prev === photos.length - 1 ? 0 : prev + 1,
                      )
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 size-10 rounded-full bg-black/50 text-white hover:bg-black/80 flex items-center justify-center backdrop-blur-sm transition"
                    title="Sonraki Fotoğraf"
                  >
                    <TbChevronRight className="size-6" />
                  </button>

                  <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full bg-black/60 text-white text-xs font-medium backdrop-blur-sm">
                    {activePhotoIdx + 1} / {photos.length}
                  </div>
                </>
              )}
            </div>

            {/* Thumbnail Scroll Bar */}
            {photos.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                {photos.map((p, idx) => (
                  <button
                    key={p.id}
                    onClick={() => setActivePhotoIdx(idx)}
                    className={`relative shrink-0 size-16 sm:size-20 rounded-xl overflow-hidden border-2 transition ${
                      activePhotoIdx === idx
                        ? "border-primary-500 ring-2 ring-primary-500/30 scale-95"
                        : "border-transparent opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img
                      src={p.thumbUrl || p.url || ""}
                      alt={`Küçük Foto ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sağ Kolon: Temel Özellikler Kartı */}
          <div className="lg:col-span-5 flex flex-col gap-5">
            <div className="bg-white dark:bg-dark-800 rounded-2xl p-5 shadow-sm border border-gray-200/80 dark:border-dark-700">
              <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4">
                Teknik ve Genel Özellikler
              </h2>

              <div className="grid grid-cols-2 gap-3.5 text-xs">
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-dark-700/60 border border-gray-100 dark:border-dark-600">
                  <span className="text-gray-400 dark:text-dark-300 block mb-0.5">
                    Model Yılı
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-white text-sm">
                    {v.year || "—"}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-gray-50 dark:bg-dark-700/60 border border-gray-100 dark:border-dark-600">
                  <span className="text-gray-400 dark:text-dark-300 block mb-0.5 flex items-center gap-1">
                    <TbGauge className="size-3.5" /> Kilometre
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-white text-sm">
                    {v.km != null ? `${v.km.toLocaleString("tr-TR")} km` : "—"}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-gray-50 dark:bg-dark-700/60 border border-gray-100 dark:border-dark-600">
                  <span className="text-gray-400 dark:text-dark-300 block mb-0.5 flex items-center gap-1">
                    <TbManualGearbox className="size-3.5" /> Vites Tipi
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-white text-sm">
                    {v.transmission ? TRANSMISSION_LABELS[v.transmission] : "—"}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-gray-50 dark:bg-dark-700/60 border border-gray-100 dark:border-dark-600">
                  <span className="text-gray-400 dark:text-dark-300 block mb-0.5 flex items-center gap-1">
                    <TbGasStation className="size-3.5" /> Yakıt Türü
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-white text-sm">
                    {v.fuelType ? FUEL_LABELS[v.fuelType] : "—"}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-gray-50 dark:bg-dark-700/60 border border-gray-100 dark:border-dark-600">
                  <span className="text-gray-400 dark:text-dark-300 block mb-0.5 flex items-center gap-1">
                    <TbColorSwatch className="size-3.5" /> Renk
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-white text-sm">
                    {v.colorName || "—"}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-gray-50 dark:bg-dark-700/60 border border-gray-100 dark:border-dark-600">
                  <span className="text-gray-400 dark:text-dark-300 block mb-0.5 flex items-center gap-1">
                    <TbEngine className="size-3.5" /> Motor Gücü
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-white text-sm">
                    {v.horsePower
                      ? `${v.horsePower} HP`
                      : v.enginePower
                        ? `${Math.round(v.enginePower * 1.35962)} HP`
                        : "—"}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-gray-50 dark:bg-dark-700/60 border border-gray-100 dark:border-dark-600">
                  <span className="text-gray-400 dark:text-dark-300 block mb-0.5">
                    Motor Hacmi
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-white text-sm">
                    {v.engineVolume ? `${v.engineVolume} cc` : "—"}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-gray-50 dark:bg-dark-700/60 border border-gray-100 dark:border-dark-600">
                  <span className="text-gray-400 dark:text-dark-300 block mb-0.5">
                    Çekiş Tipi
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-white text-sm">
                    {v.driveType ? DRIVE_LABELS[v.driveType] : "—"}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-gray-50 dark:bg-dark-700/60 border border-gray-100 dark:border-dark-600">
                  <span className="text-gray-400 dark:text-dark-300 block mb-0.5 flex items-center gap-1">
                    <TbKey className="size-3.5" /> Yedek Anahtar
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-white text-sm">
                    {v.spareKey ? "Mevcut" : "Yok"}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-gray-50 dark:bg-dark-700/60 border border-gray-100 dark:border-dark-600">
                  <span className="text-gray-400 dark:text-dark-300 block mb-0.5">
                    Ağır Hasar Kaydı
                  </span>
                  <span
                    className={`font-semibold text-sm ${
                      v.heavyDamage
                        ? "text-rose-600 dark:text-rose-400"
                        : "text-emerald-600 dark:text-emerald-400"
                    }`}
                  >
                    {v.heavyDamage ? "Var" : "Yok"}
                  </span>
                </div>
              </div>
            </div>

            {/* İletişim Kartı (Masaüstü) */}
            {company && (
              <div className="bg-white dark:bg-dark-800 rounded-2xl p-5 shadow-sm border border-gray-200/80 dark:border-dark-700">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-dark-400 mb-3">
                  Satıcı Bilgileri
                </h3>
                <div className="flex items-center gap-3 mb-4">
                  {company.logoUrl ? (
                    <img
                      src={company.logoUrl}
                      alt={company.name}
                      className="size-12 object-contain rounded-lg border border-gray-100 dark:border-dark-700 p-1 bg-white"
                    />
                  ) : (
                    <div className="size-12 rounded-lg bg-gray-100 dark:bg-dark-700 flex items-center justify-center font-bold text-gray-600 dark:text-dark-200">
                      {company.name?.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white text-sm">
                      {company.name}
                    </h4>
                    {company.address && (
                      <p className="text-xs text-gray-500 dark:text-dark-400 flex items-center gap-1 mt-0.5">
                        <TbMapPin className="size-3.5 shrink-0" /> {company.address}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  {company.phone && (
                    <a
                      href={`tel:${company.phone}`}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gray-900 dark:bg-dark-700 hover:bg-gray-800 text-white text-xs font-bold transition shadow-sm"
                    >
                      <TbPhone className="size-4" /> {company.phone}
                    </a>
                  )}
                  {waChatUrl && (
                    <a
                      href={waChatUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm"
                    >
                      <TbBrandWhatsapp className="size-4" /> WhatsApp ile Bilgi Al
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tramer / Ekspertiz Bilgisi */}
        <div className="mt-8 bg-white dark:bg-dark-800 rounded-2xl p-6 shadow-sm border border-gray-200/80 dark:border-dark-700">
          <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4">
            Hasar & Tramer Kayıtları
          </h2>

          {v.tramerSet && v.tramerSet.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-dark-700 text-gray-400">
                    <th className="py-2.5 font-medium">Tarih</th>
                    <th className="py-2.5 font-medium">Açıklama</th>
                    <th className="py-2.5 font-medium text-right">Tutar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-dark-700">
                  {v.tramerSet.map((t) => (
                    <tr key={t.id}>
                      <td className="py-2.5 text-gray-700 dark:text-dark-200 font-medium">
                        {new Date(t.date).toLocaleDateString("tr-TR")}
                      </td>
                      <td className="py-2.5 text-gray-600 dark:text-dark-300">
                        {t.description || "Tramer Hasar Kaydı"}
                      </td>
                      <td className="py-2.5 text-right font-semibold text-gray-900 dark:text-white">
                        {t.amount.toLocaleString("tr-TR")} TL
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50/50 dark:bg-dark-700/30 font-bold">
                    <td colSpan={2} className="py-2.5">
                      Toplam Tramer Tutarı
                    </td>
                    <td className="py-2.5 text-right text-rose-600 dark:text-rose-400">
                      {v.tramerSet
                        .reduce((sum, item) => sum + item.amount, 0)
                        .toLocaleString("tr-TR")}{" "}
                      TL
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40 flex items-center gap-3">
              <div className="size-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                <TbCheck className="size-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                  Tramer Kaydı Bulunmamaktadır
                </p>
                <p className="text-xs text-emerald-700 dark:text-emerald-400">
                  Araca ait kayıtlı herhangi bir hasar veya tramer kaydı bulunmamaktadır.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Açıklama / Notlar */}
        {v.notes && (
          <div className="mt-8 bg-white dark:bg-dark-800 rounded-2xl p-6 shadow-sm border border-gray-200/80 dark:border-dark-700">
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-3">
              Araç Açıklaması
            </h2>
            <p className="text-xs sm:text-sm text-gray-700 dark:text-dark-200 whitespace-pre-line leading-relaxed">
              {v.notes}
            </p>
          </div>
        )}
      </main>

      {/* Mobil Sticky Alt Bar */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-dark-900 border-t border-gray-200 dark:border-dark-800 px-4 py-3 flex items-center gap-2.5 shadow-2xl backdrop-blur-md">
        {company?.phone && (
          <a
            href={`tel:${company.phone}`}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-xl bg-gray-900 dark:bg-dark-700 text-white text-xs font-bold shadow transition active:scale-95"
          >
            <TbPhone className="size-4" /> Ara
          </a>
        )}
        {waChatUrl && (
          <a
            href={waChatUrl}
            target="_blank"
            rel="noreferrer"
            className="flex-[2] flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-md transition active:scale-95"
          >
            <TbBrandWhatsapp className="size-5" /> WhatsApp'tan Yaz
          </a>
        )}
      </div>

      {/* Lightbox / Tam Ekran Foto Galeri */}
      {lightboxOpen && currentPhoto && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4">
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 text-white/80 hover:text-white size-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition"
          >
            <TbX className="size-6" />
          </button>

          <div className="relative max-w-5xl max-h-[85vh] w-full flex items-center justify-center">
            <img
              src={currentPhoto.url || currentPhoto.thumbUrl || ""}
              alt={title}
              className="max-h-[85vh] max-w-full object-contain rounded-lg shadow-2xl"
            />

            {photos.length > 1 && (
              <>
                <button
                  onClick={() =>
                    setActivePhotoIdx((prev) =>
                      prev === 0 ? photos.length - 1 : prev - 1,
                    )
                  }
                  className="absolute left-2 size-12 rounded-full bg-black/60 text-white hover:bg-black/90 flex items-center justify-center transition"
                >
                  <TbChevronLeft className="size-7" />
                </button>
                <button
                  onClick={() =>
                    setActivePhotoIdx((prev) =>
                      prev === photos.length - 1 ? 0 : prev + 1,
                    )
                  }
                  className="absolute right-2 size-12 rounded-full bg-black/60 text-white hover:bg-black/90 flex items-center justify-center transition"
                >
                  <TbChevronRight className="size-7" />
                </button>
              </>
            )}
          </div>

          <div className="mt-4 text-white/70 text-xs font-mono">
            {activePhotoIdx + 1} / {photos.length}
          </div>
        </div>
      )}
    </div>
  );
}
