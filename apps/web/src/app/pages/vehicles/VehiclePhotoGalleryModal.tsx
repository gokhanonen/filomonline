import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  TbCar,
  TbChevronLeft,
  TbChevronRight,
  TbPlayerPause,
  TbPlayerPlay,
  TbX,
} from "react-icons/tb";

import { Spinner } from "@/components/ui";
import type { Vehicle } from "@/@types/vehicle";
import { getVehicle } from "@/services/vehicleService";
import { presignDownload } from "@/services/storageService";

interface Props {
  open: boolean;
  onClose: () => void;
  vehicle: Vehicle | null;
  initialIndex?: number;
}

export function VehiclePhotoGalleryModal({
  open,
  onClose,
  vehicle,
  initialIndex = 0,
}: Props) {
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [loading, setLoading] = useState(false);
  const [isSliding, setIsSliding] = useState(false);
  const thumbnailsRef = useRef<HTMLDivElement | null>(null);
  const touchStartX = useRef<number | null>(null);
  const lastScrollTime = useRef<number>(0);

  // Fotoğrafları yükle
  useEffect(() => {
    if (!open || !vehicle) {
      setIsSliding(false);
      return;
    }

    setCurrentIndex(initialIndex);
    setIsSliding(false);
    setLoading(true);

    getVehicle(vehicle.id)
      .then(async (v) => {
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
  }, [open, vehicle, initialIndex]);

  const total = photoUrls.length;

  const nextPhoto = useCallback(() => {
    if (total <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % total);
  }, [total]);

  const prevPhoto = useCallback(() => {
    if (total <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + total) % total);
  }, [total]);

  // Slayt (Slide) otomatik geçiş motoru (3 saniyede bir)
  useEffect(() => {
    if (!isSliding || total <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % total);
    }, 3000);
    return () => clearInterval(interval);
  }, [isSliding, total]);

  // Aktif thumbnail'i görünür alana kaydır
  useEffect(() => {
    if (!thumbnailsRef.current) return;
    const activeThumb = thumbnailsRef.current.children[currentIndex] as HTMLElement | undefined;
    if (activeThumb) {
      activeThumb.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [currentIndex]);

  // Klavye kısayolları (Sağ/Sol ok, Boşluk: slayt, Esc: kapat)
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowRight") {
        nextPhoto();
      } else if (e.key === "ArrowLeft") {
        prevPhoto();
      } else if (e.key === " " && !e.repeat) {
        e.preventDefault();
        setIsSliding((s) => !s);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, nextPhoto, prevPhoto, onClose]);

  // Mouse wheel ile sağ-sol scroll geçişi
  const handleWheel = (e: React.WheelEvent) => {
    const now = Date.now();
    if (now - lastScrollTime.current < 280) return; // scroll debounce
    if (Math.abs(e.deltaY) > 25 || Math.abs(e.deltaX) > 25) {
      if (e.deltaY > 0 || e.deltaX > 0) {
        nextPhoto();
      } else {
        prevPhoto();
      }
      lastScrollTime.current = now;
    }
  };

  // Touch Swipe (Mobil/Dokunmatik ekran desteği)
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(deltaX) > 40) {
      if (deltaX < 0) {
        nextPhoto();
      } else {
        prevPhoto();
      }
    }
    touchStartX.current = null;
  };

  if (!open || !vehicle) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[300] flex flex-col justify-between bg-black/95 backdrop-blur-xl text-white select-none animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* ÜST ÇUBUK: Plaka, Araç Bilgisi, Slayt Butonu, Kapat */}
      <div
        className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-black/40 backdrop-blur-md z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-white/15 px-3 py-1 font-mono text-sm font-black tracking-wider text-white shadow-xs">
            {vehicle.plate}
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">
              {[vehicle.brandName, vehicle.modelName].filter(Boolean).join(" ") || "Araç Fotoğraf Galerisi"}
            </h3>
            <p className="text-xs text-white/60">
              {vehicle.year ? `${vehicle.year} Model • ` : ""}
              {total > 0 ? `Fotoğraf ${currentIndex + 1} / ${total}` : "Fotoğraf aranıyor..."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Slayt Gösterisi (Slide) Butonu */}
          {total > 1 && (
            <button
              type="button"
              onClick={() => setIsSliding((s) => !s)}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all shadow-md ${
                isSliding
                  ? "bg-primary-500 text-white ring-2 ring-primary-400/50 shadow-primary-500/30 animate-pulse"
                  : "bg-white/10 text-white hover:bg-white/20"
              }`}
              title="Otomatik slayt geçişini başlat / durdur (Boşluk tuşu)"
            >
              {isSliding ? (
                <>
                  <TbPlayerPause className="size-4" /> Slaytı Durdur (3s)
                </>
              ) : (
                <>
                  <TbPlayerPlay className="size-4" /> Slayt Gösterisi
                </>
              )}
            </button>
          )}

          {/* Kapat Butonu */}
          <button
            type="button"
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded-xl bg-white/10 text-white transition hover:bg-white/20 hover:text-white"
            title="Kapat (Esc)"
          >
            <TbX className="size-5" />
          </button>
        </div>
      </div>

      {/* ORTA ANA SAHNE: Büyük Görsel & Sağ/Sol Navigasyon */}
      <div
        className="relative flex flex-1 items-center justify-center p-4 sm:p-8 overflow-hidden"
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onClick={(e) => e.stopPropagation()}
      >
        {loading ? (
          <div className="flex flex-col items-center gap-3">
            <Spinner className="size-10 text-primary-400" />
            <span className="text-xs text-white/60">Fotoğraflar yükleniyor...</span>
          </div>
        ) : total === 0 ? (
          <div className="flex flex-col items-center gap-2 text-white/40">
            <TbCar className="size-20" />
            <p className="text-sm">Bu araç için henüz fotoğraf yüklenmemiş.</p>
          </div>
        ) : (
          <>
            {/* Sol Buton */}
            {total > 1 && (
              <button
                type="button"
                onClick={prevPhoto}
                className="absolute left-4 sm:left-8 z-20 flex size-12 sm:size-14 items-center justify-center rounded-full bg-black/50 text-white/90 backdrop-blur-md transition-all hover:scale-110 hover:bg-white hover:text-gray-900 shadow-2xl ring-1 ring-white/20"
                title="Önceki Fotoğraf (←)"
              >
                <TbChevronLeft className="size-7" />
              </button>
            )}

            {/* Büyük Fotoğraf */}
            <div className="relative flex max-h-[72vh] max-w-[92vw] items-center justify-center overflow-hidden rounded-2xl shadow-2xl">
              <img
                key={photoUrls[currentIndex]}
                src={photoUrls[currentIndex]}
                alt={`${vehicle.plate} - ${currentIndex + 1}`}
                className="max-h-[72vh] max-w-full rounded-2xl object-contain transition-all duration-300 animate-in fade-in zoom-in-95"
              />
            </div>

            {/* Sağ Buton */}
            {total > 1 && (
              <button
                type="button"
                onClick={nextPhoto}
                className="absolute right-4 sm:right-8 z-20 flex size-12 sm:size-14 items-center justify-center rounded-full bg-black/50 text-white/90 backdrop-blur-md transition-all hover:scale-110 hover:bg-white hover:text-gray-900 shadow-2xl ring-1 ring-white/20"
                title="Sonraki Fotoğraf (→)"
              >
                <TbChevronRight className="size-7" />
              </button>
            )}
          </>
        )}
      </div>

      {/* ALT THUMBNAIL ŞERİDİ (Yatay Scroll) */}
      {total > 1 && (
        <div
          className="border-t border-white/10 bg-black/60 px-6 py-3.5 backdrop-blur-md z-10"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            ref={thumbnailsRef}
            className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent"
          >
            {photoUrls.map((url, index) => {
              const isActive = index === currentIndex;
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => {
                    setCurrentIndex(index);
                    setIsSliding(false);
                  }}
                  className={`group relative size-16 shrink-0 overflow-hidden rounded-xl border-2 transition-all duration-150 ${
                    isActive
                      ? "scale-105 border-primary-500 ring-2 ring-primary-500/50 shadow-lg"
                      : "border-transparent opacity-50 hover:opacity-100 hover:scale-102"
                  }`}
                >
                  <img
                    src={url}
                    alt={`Küçük resim ${index + 1}`}
                    className="size-full object-cover"
                  />
                  {isActive && (
                    <div className="absolute inset-0 bg-primary-500/10 pointer-events-none" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}
