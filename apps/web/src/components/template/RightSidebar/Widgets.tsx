// Import Dependencies
import { useEffect, useState } from "react";
import Chart from "react-apexcharts";
import { CheckCircleIcon } from "@heroicons/react/20/solid";
import { KeyIcon, ArrowTrendingUpIcon, WrenchScrewdriverIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { ApexOptions } from "apexcharts";
import { Link } from "react-router";

// Local Imports
import { Box, Progress } from "@/components/ui";
import { Delayed } from "@/components/shared/Delayed";
import { getSummary, type ReportSummary } from "@/services/reportService";

// ----------------------------------------------------------------------

const chart1config: ApexOptions = {
  colors: ["#F59E0B"],
  chart: {
    stacked: false,
    parentHeightOffset: 0,
    toolbar: {
      show: false,
    },
  },
  dataLabels: {
    enabled: false,
  },
  grid: {
    padding: {
      left: 0,
      right: 0,
      top: -20,
      bottom: -8,
    },
  },
  fill: {
    type: "gradient",
    gradient: {
      shadeIntensity: 1,
      inverseColors: false,
      opacityFrom: 0.45,
      opacityTo: 0.1,
      stops: [20, 100, 100, 100],
    },
  },
  stroke: {
    width: 2,
  },
  tooltip: {
    shared: true,
  },
  legend: {
    show: false,
  },
  yaxis: {
    show: false,
  },
  xaxis: {
    labels: {
      show: false,
    },
    axisTicks: {
      show: false,
    },
    axisBorder: {
      show: false,
    },
  },
};

const chart2config: ApexOptions = {
  colors: ["#06B6D4"],
  chart: {
    stacked: false,
    parentHeightOffset: 0,
    toolbar: {
      show: false,
    },
  },
  dataLabels: {
    enabled: false,
  },
  grid: {
    padding: {
      left: 0,
      right: 0,
      top: -20,
      bottom: -8,
    },
  },
  fill: {
    type: "gradient",
    gradient: {
      shadeIntensity: 1,
      inverseColors: false,
      opacityFrom: 0.45,
      opacityTo: 0.1,
      stops: [20, 100, 100, 100],
    },
  },
  stroke: {
    width: 2,
  },
  tooltip: {
    shared: true,
  },
  legend: {
    show: false,
  },
  yaxis: {
    show: false,
  },
  xaxis: {
    labels: {
      show: false,
    },
    axisTicks: {
      show: false,
    },
    axisBorder: {
      show: false,
    },
  },
};

interface ChartSeries {
  name: string;
  data: number[];
}

interface WidgetsProps {
  close?: () => void;
}

export function Widgets({ close }: WidgetsProps) {
  const [summary, setSummary] = useState<ReportSummary | null>(null);

  useEffect(() => {
    getSummary()
      .then(setSummary)
      .catch(() => void 0);
  }, []);

  const totalActive = (summary?.vehicles.stokta ?? 0) + (summary?.vehicles.kiralamada ?? 0);
  const occupancyRate = totalActive > 0
    ? Math.round(((summary?.vehicles.kiralamada ?? 0) / totalActive) * 100)
    : 65;
  const stockRate = 100 - occupancyRate;

  const seriesRevenue: ChartSeries[] = [
    {
      name: "Gelir",
      data: [180, 240, 210, 310, 290, 385],
    },
  ];

  const seriesExpense: ChartSeries[] = [
    {
      name: "Masraf",
      data: [120, 110, 145, 98, 112, 94],
    },
  ];

  return (
    <>
      <div className="mt-4 grid grid-cols-2 gap-3 px-3">
        {/* Box 1: Kiradaki Araçlar / Doluluk */}
        <Link to="/contracts" onClick={close} className="block transition-transform active:scale-98">
          <Box className="rounded-lg bg-gray-100 px-2.5 py-2.5 hover:bg-gray-150 dark:bg-dark-600 dark:hover:bg-dark-550 transition-colors">
            <div className="flex items-center justify-between space-x-1">
              <p>
                <span className="text-lg font-bold text-gray-800 dark:text-dark-100">
                  {summary ? summary.vehicles.kiralamada : 8}
                </span>{" "}
                <span className="text-xs text-gray-500">araç</span>
              </p>
              <KeyIcon className="size-4.5 text-secondary dark:text-secondary-light" />
            </div>
            <p className="mt-0.5 text-tiny-plus uppercase font-semibold text-gray-600 dark:text-dark-200">
              Kirada / Doluluk
            </p>
            <Progress
              isActive
              value={occupancyRate}
              color="secondary"
              classNames={{
                bar: "h-1.5",
                root: "mt-3",
              }}
            />

            <div className="mt-1.5 flex items-center justify-between text-xs text-gray-500 dark:text-dark-300">
              <span className="flex items-center gap-0.5 text-[10px] text-secondary font-medium">
                Sözleşmeler <ChevronRightIcon className="size-3" />
              </span>
              <span className="font-semibold">%{occupancyRate}</span>
            </div>
          </Box>
        </Link>

        {/* Box 2: Stoktaki Araçlar */}
        <Link to="/vehicles" onClick={close} className="block transition-transform active:scale-98">
          <Box className="rounded-lg bg-gray-100 px-2.5 py-2.5 hover:bg-gray-150 dark:bg-dark-600 dark:hover:bg-dark-550 transition-colors">
            <div className="flex items-center justify-between space-x-1">
              <p>
                <span className="text-lg font-bold text-gray-800 dark:text-dark-100">
                  {summary ? summary.vehicles.stokta : 14}
                </span>{" "}
                <span className="text-xs text-gray-500">araç</span>
              </p>
              <CheckCircleIcon className="size-4.5 text-success dark:text-success-light" />
            </div>
            <p className="mt-0.5 text-tiny-plus uppercase font-semibold text-gray-600 dark:text-dark-200">
              Hazır Stok
            </p>
            <Progress
              value={stockRate}
              color="success"
              classNames={{
                bar: "h-1.5",
                root: "mt-3",
              }}
            />

            <div className="mt-1.5 flex items-center justify-between text-xs text-gray-500 dark:text-dark-300">
              <span className="flex items-center gap-0.5 text-[10px] text-success font-medium">
                Filo Listesi <ChevronRightIcon className="size-3" />
              </span>
              <span className="font-semibold">%{stockRate}</span>
            </div>
          </Box>
        </Link>
      </div>

      {/* Finans & Trend Grafikleri */}
      <div className="mt-4 px-3">
        <div className="flex items-center justify-between">
          <h2 className="line-clamp-1 text-xs-plus font-medium tracking-wide text-dark-700 dark:text-gray-100">
            Finans & Trend Göstergeleri
          </h2>
          <span className="text-[10px] text-gray-400 dark:text-dark-300">Son 6 Ay</span>
        </div>
        <div className="mt-2.5 grid grid-cols-2 gap-3">
          {/* Trend 1: Kira Geliri */}
          <Link to="/invoices" onClick={close} className="block transition-transform active:scale-98">
            <Box className="rounded-lg bg-gray-100 p-2.5 hover:bg-gray-150 dark:bg-dark-600 dark:hover:bg-dark-550 transition-colors">
              <div className="flex items-center gap-2">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <ArrowTrendingUpIcon className="size-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="truncate font-semibold text-xs text-gray-800 dark:text-dark-100">
                    Kira Geliri
                  </h3>
                  <p className="text-[10px] text-gray-500">Aylık Hacim</p>
                </div>
              </div>
              <div className="ax-transparent-gridline h-[85px]">
                <Delayed>
                  <Chart
                    series={seriesRevenue}
                    type="area"
                    height="85"
                    options={chart1config}
                  />
                </Delayed>
              </div>

              <div className="mt-1.5 flex items-center justify-between">
                <p className="text-xs font-bold text-gray-800 dark:text-dark-100">
                  ₺385K
                </p>
                <p className="text-[10px] font-semibold text-success dark:text-success-light">
                  +12.4%
                </p>
              </div>
            </Box>
          </Link>

          {/* Trend 2: Masraflar */}
          <Link to="/expenses" onClick={close} className="block transition-transform active:scale-98">
            <Box className="rounded-lg bg-gray-100 p-2.5 hover:bg-gray-150 dark:bg-dark-600 dark:hover:bg-dark-550 transition-colors">
              <div className="flex items-center gap-2">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                  <WrenchScrewdriverIcon className="size-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="truncate font-semibold text-xs text-gray-800 dark:text-dark-100">
                    Masraflar
                  </h3>
                  <p className="text-[10px] text-gray-500">Aylık Gider</p>
                </div>
              </div>
              <div className="ax-transparent-gridline h-[85px]">
                <Delayed>
                  <Chart
                    series={seriesExpense}
                    type="area"
                    height="85"
                    options={chart2config}
                  />
                </Delayed>
              </div>

              <div className="mt-1.5 flex items-center justify-between">
                <p className="text-xs font-bold text-gray-800 dark:text-dark-100">
                  ₺94K
                </p>
                <p className="text-[10px] font-semibold text-success dark:text-success-light">
                  -4.2%
                </p>
              </div>
            </Box>
          </Link>
        </div>
      </div>
    </>
  );
}
