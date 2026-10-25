import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import clsx from "clsx";
import Chart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import {
  TbArrowRight,
  TbCalendarDue,
  TbChartBar,
  TbScale,
  TbTable,
  TbTrendingDown,
  TbTrendingUp,
} from "react-icons/tb";

import { Page } from "@/components/shared/Page";
import { useThemeContext } from "@/app/contexts/theme/context";
import type { FinanceDashboard, LedgerRow } from "@/@types/finance";
import { getFinanceDashboard } from "@/services/financeService";
import { FinanceActions } from "../FinanceActions";
import {
  ACCOUNT_TYPE_LABEL,
  ACCOUNT_TYPE_META,
  ChequeStatusBadge,
  FinanceNav,
  Kpi,
  MOVEMENT_TYPE_LABEL,
  errMsg,
  fmtDate,
  fmtMoney,
} from "../shared";

/** Giriş/çıkış serileri: kategorik 1-2 (mavi/turuncu), koyu temada kendi adımları — durum renkleri seri için kullanılmaz */
const SERIES_COLORS = { light: ["#2a78d6", "#eb6834"], dark: ["#3987e5", "#d95926"] };
const SURFACE = { light: "#ffffff", dark: "#1c1d21" };

const compactTl = (n: number) =>
  `${new Intl.NumberFormat("tr-TR", { notation: "compact", maximumFractionDigits: 1 }).format(n)} ₺`;
const monthLabel = (m: string) => {
  const [y, mo] = m.split("-").map(Number);
  return new Date(y, mo - 1, 1).toLocaleDateString("tr-TR", { month: "short", year: "2-digit" });
};

export default function FinanceDashboardPage() {
  const [data, setData] = useState<FinanceDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [asTable, setAsTable] = useState(false);

  const load = useCallback(() => {
    getFinanceDashboard()
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch((err) => setError(errMsg(err, "Finans paneli yüklenemedi")));
  }, []);
  useEffect(load, [load]);

  const s = data?.summary;
  const cashTry = (s?.balances.CASH.TRY ?? 0) + (s?.balances.BANK.TRY ?? 0);
  const foreign = Object.entries({ ...s?.balances.BANK })
    .filter(([c, v]) => c !== "TRY" && v)
    .map(([c, v]) => fmtMoney(v, c));

  return (
    <Page title="Finans">
      <div className="w-full space-y-5 px-(--margin-x) py-4">
        <FinanceNav />

        {error && <div className="rounded-2xl bg-error/10 px-4 py-3 text-sm text-error">{error}</div>}

        {/* Üst özet */}
        <div className="grid gap-3 lg:grid-cols-[1.3fr_1fr_1fr]">
          <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-primary-600 to-indigo-700 p-5 text-white shadow-sm">
            <div className="pointer-events-none absolute -right-10 -top-12 size-40 rounded-full bg-white/10" />
            <p className="text-xs font-semibold uppercase tracking-wider text-white/70">Nakit Varlık · Kasa + Banka</p>
            <p className="mt-1 text-3xl font-bold tracking-tight tabular-nums">{fmtMoney(cashTry)}</p>
            {foreign.length > 0 && <p className="mt-0.5 text-sm text-white/80">+ {foreign.join(" · ")}</p>}
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm">
              <span>
                <span className="text-white/70">POS bekleyen </span>
                <span className="font-semibold">{fmtMoney(s?.posPending)}</span>
              </span>
              <span>
                <span className="text-white/70">Kart borcu </span>
                <span className="font-semibold">{fmtMoney(s?.cardDebt)}</span>
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Kpi label="Bu Ay Giriş" value={fmtMoney(s?.monthCollection)} tone="success" Icon={TbTrendingUp} />
            <Kpi label="Bu Ay Çıkış" value={fmtMoney(s?.monthPayment)} tone="error" Icon={TbTrendingDown} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Link to="/finance/receivables" className="block">
              <Kpi
                label="Alacak"
                value={fmtMoney(s?.receivable.total)}
                hint={s?.receivable.overdue ? `Vadesi geçen ${fmtMoney(s.receivable.overdue)}` : "Vadesi geçen yok"}
                tone={s?.receivable.overdue ? "warning" : "default"}
                Icon={TbScale}
              />
            </Link>
            <Link to="/finance/receivables?side=PAYABLE" className="block">
              <Kpi
                label="Borç"
                value={fmtMoney(s?.payable.total)}
                hint={s?.payable.overdue ? `Vadesi geçen ${fmtMoney(s.payable.overdue)}` : "Vadesi geçen yok"}
                tone={s?.payable.overdue ? "error" : "default"}
                Icon={TbScale}
              />
            </Link>
          </div>
        </div>

        {/* Hızlı işlemler */}
        <FinanceActions variant="tiles" onDone={load} />

        {/* Nakit akışı + hesaplar */}
        <div className="grid gap-4 xl:grid-cols-3">
          <Card
            className="xl:col-span-2"
            title="Nakit Akışı"
            subtitle="Son 6 ay · kasa, banka, POS (hesaplar arası virman hariç)"
            action={
              <button
                type="button"
                onClick={() => setAsTable((v) => !v)}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-gray-500 hover:bg-gray-100 dark:text-dark-300 dark:hover:bg-dark-600"
              >
                {asTable ? <TbChartBar className="size-4" /> : <TbTable className="size-4" />} {asTable ? "Grafik" : "Tablo"}
              </button>
            }
          >
            <CashflowChart rows={data?.cashflow ?? []} asTable={asTable} />
          </Card>
          <Card title="Hesaplar" link={{ to: "/finance/accounts", label: "Yönet" }}>
            <div className="-mx-1 divide-y divide-gray-100 dark:divide-dark-600">
              {(data?.accounts ?? []).length === 0 && <Empty>Hesap tanımlı değil.</Empty>}
              {data?.accounts.map((a) => {
                const { Icon, gradient } = ACCOUNT_TYPE_META[a.type];
                const isCard = a.type === "CREDIT_CARD";
                const isPos = a.type === "POS";
                return (
                  <Link key={a.id} to={`/finance/movements?cashRegisterId=${a.id}`} className="flex items-center gap-3 rounded-lg px-1 py-2.5 hover:bg-gray-50 dark:hover:bg-dark-600/50">
                    <span className={clsx("flex size-9 shrink-0 items-center justify-center rounded-lg bg-linear-to-br text-white", gradient)}>
                      <Icon className="size-4.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-gray-800 dark:text-dark-50">{a.name}</span>
                      <span className="block truncate text-xs text-gray-400">
                        {ACCOUNT_TYPE_LABEL[a.type]}
                        {isCard && a.dueDate ? ` · Son ödeme ${fmtDate(a.dueDate)}` : isPos ? " · valör bekleyen" : a.bankName ? ` · ${a.bankName}` : ""}
                      </span>
                    </span>
                    <span className={clsx("shrink-0 text-sm font-bold tabular-nums", isCard && (a.cardDebt ?? 0) > 0 ? "text-error" : "text-gray-800 dark:text-dark-50")}>
                      {fmtMoney(isCard ? a.cardDebt : isPos ? a.pendingPos : a.balance, a.currency)}
                    </span>
                  </Link>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Vade & cariler */}
        <div className="grid gap-4 lg:grid-cols-3">
          <Card title="Yaklaşan Çek & Senet" subtitle="30 gün içinde · vadesi geçenler dahil" link={{ to: "/finance/cheques", label: "Portföy" }}>
            {(data?.upcomingCheques ?? []).length === 0 && <Empty>Yaklaşan çek yok.</Empty>}
            <div className="space-y-2">
              {data?.upcomingCheques.map((c) => {
                const days = Math.round((new Date(c.dueDate).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86_400_000);
                return (
                  <div key={c.id} className="flex items-center gap-3">
                    <span
                      className={clsx(
                        "flex size-10 shrink-0 flex-col items-center justify-center rounded-lg text-center leading-none",
                        days < 0 ? "bg-error/10 text-error" : days <= 7 ? "bg-warning/10 text-warning" : "bg-gray-100 text-gray-600 dark:bg-dark-600 dark:text-dark-200",
                      )}
                    >
                      <span className="text-sm font-bold">{Math.abs(days)}</span>
                      <span className="text-[9px] font-semibold uppercase">{days < 0 ? "geçti" : "gün"}</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-gray-800 dark:text-dark-50">
                        {c.direction === "ISSUED" ? "Ödenecek" : "Tahsil"} · {c.accountName ?? `#${c.serialNo}`}
                      </span>
                      <span className="flex items-center gap-1.5 text-xs text-gray-400">
                        {fmtDate(c.dueDate)} <ChequeStatusBadge status={c.status} />
                      </span>
                    </span>
                    <span className={clsx("text-sm font-bold tabular-nums", c.direction === "ISSUED" ? "text-error" : "text-gray-800 dark:text-dark-50")}>
                      {fmtMoney(c.amount, c.currency)}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
          <AccountsCard title="En Büyük Alacaklar" rows={data?.topReceivables ?? []} link="/finance/receivables" empty="Açık alacak yok." />
          <AccountsCard title="En Büyük Borçlar" rows={data?.topPayables ?? []} link="/finance/receivables?side=PAYABLE" empty="Açık borç yok." tone="error" />
        </div>

        {/* Son hareketler */}
        <Card title="Son Hareketler" link={{ to: "/finance/movements", label: "Tüm hareketler" }}>
          {(data?.recent ?? []).length === 0 && <Empty>Henüz hareket yok.</Empty>}
          <div className="-mx-1 divide-y divide-gray-100 dark:divide-dark-600">
            {data?.recent.map((r) => <RecentRow key={r.key} r={r} />)}
          </div>
        </Card>
      </div>
    </Page>
  );
}

// ---------------------------------------------------------------------------

function CashflowChart({ rows, asTable }: { rows: { month: string; in: number; out: number }[]; asTable: boolean }) {
  const { isDark } = useThemeContext();
  const mode = isDark ? "dark" : "light";
  const ink = isDark ? "#c3c2b7" : "#52514e";
  const grid = isDark ? "#2c2d33" : "#ecebe8";

  const options: ApexOptions = useMemo(
    () => ({
      chart: { type: "bar", toolbar: { show: false }, fontFamily: "inherit", background: "transparent", animations: { enabled: false } },
      theme: { mode },
      colors: SERIES_COLORS[mode],
      plotOptions: { bar: { columnWidth: "55%", borderRadius: 4, borderRadiusApplication: "end" } },
      stroke: { show: true, width: 2, colors: [SURFACE[mode]] }, // çubuklar arası 2px yüzey boşluğu
      dataLabels: { enabled: false },
      legend: { position: "top", horizontalAlign: "left", fontSize: "12px", labels: { colors: ink }, markers: { size: 6 } },
      grid: { borderColor: grid, strokeDashArray: 3, yaxis: { lines: { show: true } }, xaxis: { lines: { show: false } } },
      xaxis: {
        categories: rows.map((r) => monthLabel(r.month)),
        labels: { style: { colors: ink, fontSize: "12px" } },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: { labels: { style: { colors: ink, fontSize: "11px" }, formatter: (v: number) => compactTl(v) } },
      tooltip: { shared: true, intersect: false, theme: mode, y: { formatter: (v: number) => fmtMoney(v) } },
      states: { hover: { filter: { type: "darken" } } },
    }),
    [rows, mode, ink, grid],
  );
  const series = useMemo(
    () => [
      { name: "Giriş", data: rows.map((r) => r.in) },
      { name: "Çıkış", data: rows.map((r) => r.out) },
    ],
    [rows],
  );

  return (
    <div>
      {asTable ? (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-400">
              <th className="py-1.5 font-semibold">Ay</th>
              <th className="py-1.5 text-right font-semibold">Giriş</th>
              <th className="py-1.5 text-right font-semibold">Çıkış</th>
              <th className="py-1.5 text-right font-semibold">Net</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 tabular-nums dark:divide-dark-600">
            {rows.map((r) => (
              <tr key={r.month} className="text-gray-700 dark:text-dark-100">
                <td className="py-1.5 capitalize">{monthLabel(r.month)}</td>
                <td className="py-1.5 text-right">{fmtMoney(r.in)}</td>
                <td className="py-1.5 text-right">{fmtMoney(r.out)}</td>
                <td className={clsx("py-1.5 text-right font-semibold", r.in - r.out >= 0 ? "text-success" : "text-error")}>{fmtMoney(r.in - r.out)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <Chart type="bar" height={280} options={options} series={series} />
      )}
    </div>
  );
}

function AccountsCard({ title, rows, link, empty, tone }: { title: string; rows: FinanceDashboard["topReceivables"]; link: string; empty: string; tone?: "error" }) {
  const max = Math.max(1, ...rows.map((r) => r.total));
  return (
    <Card title={title} link={{ to: link, label: "Tümü" }}>
      {rows.length === 0 && <Empty>{empty}</Empty>}
      <div className="space-y-3">
        {rows.map((r) => (
          <Link key={r.accountId} to={`/finance/statement/${r.accountId}`} className="block rounded-lg hover:opacity-80">
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="truncate font-semibold text-gray-800 dark:text-dark-50">{r.accountName ?? "—"}</span>
              <span className="shrink-0 font-bold tabular-nums text-gray-800 dark:text-dark-50">{fmtMoney(r.total)}</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-dark-600">
              <div className={clsx("h-full rounded-full", tone === "error" ? "bg-error/70" : "bg-primary-500")} style={{ width: `${(r.total / max) * 100}%` }} />
            </div>
            {r.overdue > 0 && <p className="mt-0.5 text-xs text-error">Vadesi geçen {fmtMoney(r.overdue)}</p>}
          </Link>
        ))}
      </div>
    </Card>
  );
}

function RecentRow({ r }: { r: LedgerRow }) {
  const isDoc = r.kind !== "MOVEMENT";
  const label = isDoc
    ? { SALES: "Satış Faturası", RENTAL: "Kira Faturası", PURCHASE: "Alış Faturası", EXPENSE: "Masraf" }[r.kind as "SALES"]
    : MOVEMENT_TYPE_LABEL[r.movementType!];
  const module = r.legs?.[0]?.module;
  const Icon = module ? ACCOUNT_TYPE_META[module].Icon : TbCalendarDue;
  return (
    <Link to="/finance/movements" className="flex items-center gap-3 rounded-lg px-1 py-2.5 hover:bg-gray-50 dark:hover:bg-dark-600/50">
      <span
        className={clsx(
          "flex size-9 shrink-0 items-center justify-center rounded-lg",
          r.flow === "IN" ? "bg-success/10 text-success" : r.flow === "OUT" ? "bg-error/10 text-error" : isDoc ? "bg-primary-500/10 text-primary-600" : "bg-info/10 text-info",
        )}
      >
        <Icon className="size-4.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-gray-800 dark:text-dark-50">{r.accountName || r.description || label}</span>
        <span className="block truncate text-xs text-gray-400">
          {label} · {fmtDate(r.date)}
          {r.documentNo ? ` · #${r.documentNo}` : ""}
        </span>
      </span>
      <span className={clsx("shrink-0 text-sm font-bold tabular-nums", r.flow === "IN" ? "text-success" : r.flow === "OUT" ? "text-error" : "text-gray-800 dark:text-dark-50")}>
        {r.flow === "IN" ? "+" : r.flow === "OUT" ? "−" : ""}
        {fmtMoney(r.amount)}
      </span>
    </Link>
  );
}

function Card({
  title,
  subtitle,
  link,
  action,
  className,
  children,
}: {
  title: string;
  subtitle?: string;
  link?: { to: string; label: string };
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={clsx("rounded-2xl border border-gray-150 bg-white p-4 shadow-sm dark:border-dark-600 dark:bg-dark-700", className)}>
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-gray-800 dark:text-dark-50">{title}</h3>
          {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
        </div>
        {action}
        {link && (
          <Link to={link.to} className="flex shrink-0 items-center gap-1 text-xs font-semibold text-primary-600 hover:underline dark:text-primary-400">
            {link.label} <TbArrowRight className="size-3.5" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-6 text-center text-sm text-gray-400">{children}</p>;
}
