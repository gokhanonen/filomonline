// Import Dependencies
import { useLayoutEffect, useRef, useEffect, useState } from "react";
import { register } from "swiper/element/bundle";
import { Link } from "react-router";
import {
  TbCar,
  TbReceipt,
  TbTrendingUp,
} from "react-icons/tb";

// Local Imports
import { useLocaleContext } from "@/app/contexts/locale/context";
import { Box } from "@/components/ui";
import { getSummary, type ReportSummary } from "@/services/reportService";

// ----------------------------------------------------------------------

register();

function formatTL(val?: number): string {
  if (val === undefined || val === null) return "₺0";
  return val.toLocaleString("tr-TR", { maximumFractionDigits: 0 }) + " ₺";
}

interface BankingCardProps {
  close?: () => void;
  summary?: ReportSummary | null;
}

export function BankingCard({ close, summary: propSummary }: BankingCardProps) {
  const { direction } = useLocaleContext();
  const carouselRef = useRef<HTMLElement | null>(null);
  const [summary, setSummary] = useState<ReportSummary | null>(propSummary ?? null);

  useEffect(() => {
    if (propSummary) {
      setSummary(propSummary);
      return;
    }
    getSummary()
      .then(setSummary)
      .catch(() => void 0);
  }, [propSummary]);

  useLayoutEffect(() => {
    if (!carouselRef.current) return;

    const params = {
      injectStyles: [
        `
        :host(.banking-card-carousel) .swiper {
          padding-left: .75rem;
          padding-right: .75rem;
        }
        `,
      ],
    };

    Object.assign(carouselRef.current, params);
    (carouselRef.current as any).initialize();
  }, []);

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between px-3">
        <h2 className="line-clamp-1 text-xs-plus font-medium tracking-wide text-gray-800 dark:text-dark-100">
          Filo & Kasa Kartları
        </h2>
        <span className="text-[10px] font-medium text-primary-600 dark:text-primary-400">
          Canlı Özet
        </span>
      </div>

      {/* @ts-expect-error - Custom web component */}
      <swiper-container
        class="banking-card-carousel mt-2 flex"
        init="false"
        ref={carouselRef}
        slides-per-view="auto"
        dir={direction}
        space-between="16"
      >
        {/* Card 1: Filo Değeri */}
        {/* @ts-expect-error - Custom web component */}
        <swiper-slide class="w-52">
          <Link to="/vehicles" onClick={close} className="block transition-transform active:scale-98">
            <Box className="relative flex h-28 w-52 shrink-0 flex-col overflow-hidden rounded-xl bg-linear-to-br from-purple-500 to-indigo-600 p-3 shadow-md hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between text-white/90">
                <span className="text-[11px] font-semibold tracking-wider uppercase">
                  Filo Liste Değeri
                </span>
                <TbCar className="size-4.5 opacity-80" />
              </div>
              <div className="text-white mt-auto">
                <p className="text-lg font-bold tracking-tight">
                  {summary ? formatTL(summary.stokListeDeğeri || summary.stokMaliyeti) : "₺---"}
                </p>
                <div className="mt-1 flex items-center justify-between text-[11px] font-medium text-white/80">
                  <span>
                    {summary?.vehicles.stokta ?? 0} Stokta • {summary?.vehicles.kiralamada ?? 0} Kirada
                  </span>
                  <span className="text-[10px] underline">Araçlar →</span>
                </div>
              </div>
              <div className="mask is-reuleaux-triangle pointer-events-none absolute right-0 top-0 -m-3 size-16 bg-white/20" />
            </Box>
          </Link>
          {/* @ts-expect-error - Custom web component */}
        </swiper-slide>

        {/* Card 2: Satış & Brüt Kâr */}
        {/* @ts-expect-error - Custom web component */}
        <swiper-slide class="w-52">
          <Link to="/contracts" onClick={close} className="block transition-transform active:scale-98">
            <Box className="relative flex h-28 w-52 shrink-0 flex-col overflow-hidden rounded-xl bg-linear-to-br from-pink-500 to-rose-600 p-3 shadow-md hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between text-white/90">
                <span className="text-[11px] font-semibold tracking-wider uppercase">
                  Toplam Satış / Ciro
                </span>
                <TbTrendingUp className="size-4.5 opacity-80" />
              </div>
              <div className="text-white mt-auto">
                <p className="text-lg font-bold tracking-tight">
                  {summary ? formatTL(summary.toplamSatis) : "₺---"}
                </p>
                <div className="mt-1 flex items-center justify-between text-[11px] font-medium text-white/80">
                  <span>Kâr: {summary ? formatTL(summary.brutKar) : "₺0"}</span>
                  <span className="text-[10px] underline">Sözleşmeler →</span>
                </div>
              </div>
              <div className="mask is-diamond pointer-events-none absolute bottom-0 right-0 -m-3 size-16 bg-white/20" />
            </Box>
          </Link>
          {/* @ts-expect-error - Custom web component */}
        </swiper-slide>

        {/* Card 3: Masraflar */}
        {/* @ts-expect-error - Custom web component */}
        <swiper-slide class="w-52">
          <Link to="/expenses" onClick={close} className="block transition-transform active:scale-98">
            <Box className="relative flex h-28 w-52 shrink-0 flex-col overflow-hidden rounded-xl bg-linear-to-br from-teal-500 to-cyan-700 p-3 shadow-md hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between text-white/90">
                <span className="text-[11px] font-semibold tracking-wider uppercase">
                  Toplam Masraflar
                </span>
                <TbReceipt className="size-4.5 opacity-80" />
              </div>
              <div className="text-white mt-auto">
                <p className="text-lg font-bold tracking-tight">
                  {summary ? formatTL(summary.toplamMasraf) : "₺---"}
                </p>
                <div className="mt-1 flex items-center justify-between text-[11px] font-medium text-white/80">
                  <span>Bakım, Sigorta & Yakıt</span>
                  <span className="text-[10px] underline">Masraflar →</span>
                </div>
              </div>
              <div className="mask is-hexagon-2 pointer-events-none absolute right-0 top-0 -m-3 size-16 bg-white/20" />
            </Box>
          </Link>
          {/* @ts-expect-error - Custom web component */}
        </swiper-slide>
        {/* @ts-expect-error - Custom web component */}
      </swiper-container>
    </div>
  );
}
