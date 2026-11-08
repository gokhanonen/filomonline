import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import {
  MagnifyingGlassIcon,
  BuildingOffice2Icon,
  MapPinIcon,
} from "@heroicons/react/24/outline";
import { TbCar } from "react-icons/tb";

import { Page } from "@/components/shared/Page";
import { Button, Card, Input, Select, Spinner } from "@/components/ui";
import { useAuthContext } from "@/app/contexts/auth/context";
import {
  VEHICLE_STATUS_LABELS,
  type VehicleStatus,
} from "@/@types/vehicle";
import {
  listHoldingVehicles,
  type HoldingVehicle,
} from "@/services/vehicleService";

const PAGE_SIZE = 30;

const money = (n: number | null) =>
  n == null ? "—" : `${Number(n).toLocaleString("tr-TR", { maximumFractionDigits: 0 })} ₺`;

const statusOptions = [
  { value: "", label: "Tüm durumlar" },
  ...(Object.keys(VEHICLE_STATUS_LABELS) as VehicleStatus[]).map((k) => ({
    value: k,
    label: VEHICLE_STATUS_LABELS[k],
  })),
];

const statusColor: Record<string, string> = {
  STOKTA: "bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-300",
  KIRALAMADA: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  SATILDI: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
};

export default function HoldingVehiclesPage() {
  const { switchLocation, switchCompany } = useAuthContext();
  const navigate = useNavigate();

  const [items, setItems] = useState<HoldingVehicle[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [status, setStatus] = useState<VehicleStatus | "">("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(
    async (p: number, replace: boolean) => {
      setLoading(true);
      try {
        const res = await listHoldingVehicles({
          page: p,
          pageSize: PAGE_SIZE,
          search: debounced || undefined,
          status: status || undefined,
        });
        setTotal(res.total);
        setItems((prev) =>
          replace ? res.items : [...prev, ...res.items],
        );
      } finally {
        setLoading(false);
      }
    },
    [debounced, status],
  );

  // Filtre değişince baştan yükle
  const firstRun = useRef(true);
  useEffect(() => {
    setPage(1);
    void load(1, true);
    firstRun.current = false;
  }, [load]);

  const openVehicle = (v: HoldingVehicle) => {
    if (v.currentLocationId) switchLocation(v.companyId, v.currentLocationId);
    else switchCompany(v.companyId);
    navigate(`/vehicles?search=${encodeURIComponent(v.plate ?? "")}`);
  };

  const hasMore = items.length < total;

  return (
    <Page title="Tüm Firmalar — Araçlar">
      <div className="w-full space-y-5 px-(--margin-x) py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-primary-100 text-primary-600 dark:bg-primary-500/20 dark:text-primary-400">
              <TbCar className="size-6" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-800 dark:text-dark-50">
                Tüm Firmalar — Araçlar
              </h1>
              <p className="text-sm text-gray-400 dark:text-dark-300">
                {total} araç · bir araca tıklayınca o firmanın operasyonuna geçersiniz
              </p>
            </div>
          </div>
          <Button variant="outlined" onClick={() => navigate("/holding")}>
            Konsolide Özet
          </Button>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="relative min-w-56 flex-1">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Plaka, marka, model, şasi ara…"
              className="pl-10"
            />
          </div>
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value as VehicleStatus | "")}
            className="w-48"
          >
            {statusOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>

        {loading && items.length === 0 ? (
          <div className="flex justify-center py-16">
            <Spinner className="size-7" />
          </div>
        ) : items.length === 0 ? (
          <Card className="p-6 text-center text-sm text-gray-400">
            Araç bulunamadı.
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((v) => (
                <Card
                  key={v.id}
                  className="cursor-pointer p-4 transition hover:border-primary-400 hover:shadow-md"
                  onClick={() => openVehicle(v)}
                  title="Aracın firmasına geçip işlem yap"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-gray-800 dark:text-dark-50">
                        {v.plate || "Plakasız"}
                      </p>
                      <p className="truncate text-sm text-gray-500 dark:text-dark-200">
                        {[v.brandName, v.modelName, v.year].filter(Boolean).join(" ")}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded px-1.5 py-0.5 text-tiny font-medium ${
                        statusColor[v.status] ??
                        "bg-gray-100 text-gray-600 dark:bg-dark-600 dark:text-dark-200"
                      }`}
                    >
                      {VEHICLE_STATUS_LABELS[v.status] ?? v.status}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-1.5 text-tiny">
                    <span className="inline-flex items-center gap-1 rounded bg-gray-100 px-1.5 py-0.5 text-gray-600 dark:bg-dark-600 dark:text-dark-200">
                      <BuildingOffice2Icon className="size-3.5" />
                      {v.companyName ?? "—"}
                    </span>
                    {v.locationName && (
                      <span className="inline-flex items-center gap-1 rounded bg-primary-50 px-1.5 py-0.5 text-primary-700 dark:bg-primary-500/15 dark:text-primary-300">
                        <MapPinIcon className="size-3.5" />
                        {v.locationName}
                      </span>
                    )}
                  </div>

                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-gray-400 dark:text-dark-300">
                      {v.km != null ? `${Number(v.km).toLocaleString("tr-TR")} km` : ""}
                    </span>
                    <span className="font-semibold text-gray-800 dark:text-dark-50">
                      {money(v.status === "SATILDI" ? v.saleAmount : v.listPrice)}
                    </span>
                  </div>
                </Card>
              ))}
            </div>

            {hasMore && (
              <div className="flex justify-center pt-2">
                <Button
                  variant="outlined"
                  disabled={loading}
                  onClick={() => {
                    const next = page + 1;
                    setPage(next);
                    void load(next, false);
                  }}
                >
                  {loading ? <Spinner className="size-4" /> : "Daha Fazla"}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </Page>
  );
}
