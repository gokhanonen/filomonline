import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import clsx from "clsx";
import {
  TbArrowDownLeft,
  TbArrowUpRight,
  TbBuildingBank,
  TbCar,
  TbExternalLink,
  TbFileInvoice,
  TbHistory,
  TbId,
  TbPhone,
  TbPrinter,
  TbRefresh,
  TbScale,
  TbUserSearch,
} from "react-icons/tb";
import { toast } from "sonner";

import { Page } from "@/components/shared/Page";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import { Button, Input } from "@/components/ui";
import { useAuthContext } from "@/app/contexts/auth/context";
import { ACCOUNT_TYPE_LABELS, type AccountType } from "@/@types/account";
import type { Statement, StatementRow } from "@/@types/finance";
import { getStatement } from "@/services/financeService";
import { OperationModal } from "../OperationModal";
import { FinanceNav, Kpi, errMsg, fmtDate, fmtMoney, todayISO, useAccountOptions } from "../shared";

// ---------------------------------------------------------------------------
// Yardımcılar
// ---------------------------------------------------------------------------

const LEDGER_LABEL: Record<NonNullable<Statement["account"]["ledgerCode"]>, string> = {
  L120: "120 Alıcılar",
  L320: "320 Satıcılar",
  L329: "329 Diğer Ticari Borçlar",
};

const pad = (n: number) => String(n).padStart(2, "0");
const isoOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const yearStartISO = () => `${new Date().getFullYear()}-01-01`;
const monthStartISO = () => {
  const d = new Date();
  return isoOf(new Date(d.getFullYear(), d.getMonth(), 1));
};

/** Bakiye: pozitif → (B) borçlu, negatif → (A) alacaklı */
function fmtBalance(v: number): string {
  if (Math.abs(v) < 0.005) return fmtMoney(0);
  return `${fmtMoney(Math.abs(v))} (${v > 0 ? "B" : "A"})`;
}

function balanceText(v: number): string {
  if (Math.abs(v) < 0.005) return "Kapalı";
  return v > 0 ? "Cari bize borçlu" : "Cariye borçluyuz";
}

const balanceTone = (v: number) => (Math.abs(v) < 0.005 ? "default" : v > 0 ? "success" : "error");

function rowLink(row: StatementRow, accountId: string): string | null {
  if (row.kind === "MOVEMENT") return `/finance/movements?accountId=${accountId}`;
  return row.link;
}

function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const fmtNum = (v: number) => (v ? fmtMoney(v) : "");

// ---------------------------------------------------------------------------
// Yazdırma (A4)
// ---------------------------------------------------------------------------

function buildPrintHtml(st: Statement): string {
  const a = st.account;
  const period = `${st.from ? fmtDate(st.from) : "Başlangıç"} – ${st.to ? fmtDate(st.to) : fmtDate(new Date())}`;
  const showOpening = Boolean(st.from);
  const rows = st.rows
    .map(
      (r) => `
      <tr>
        <td class="nowrap">${esc(fmtDate(r.date))}</td>
        <td class="mono">${esc(r.documentNo || "—")}</td>
        <td>${esc(r.description)}${r.vehiclePlate ? ` <span class="plate">${esc(r.vehiclePlate)}</span>` : ""}${
          r.foreignAmount != null && r.currency ? `<div class="fx">${esc(fmtMoney(r.foreignAmount, r.currency))}</div>` : ""
        }</td>
        <td class="num">${esc(fmtNum(r.debit))}</td>
        <td class="num">${esc(fmtNum(r.credit))}</td>
        <td class="num strong">${esc(fmtBalance(r.balance))}</td>
      </tr>`,
    )
    .join("");

  const info: [string, string | null][] = [
    ["Cari", a.name],
    ["VKN / TCKN", a.taxNumber || a.tckn],
    ["Vergi Dairesi", a.taxOffice],
    ["Telefon", a.phone],
    ["Hesap", a.ledgerCode ? LEDGER_LABEL[a.ledgerCode] : null],
  ];

  return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="utf-8" />
<title>Cari Hesap Ekstresi - ${esc(a.name)}</title>
<style>
  @page { size: A4; margin: 12mm 12mm 14mm; }
  * { box-sizing: border-box; }
  body { font-family: "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 10.5px; color: #111827; margin: 0;
         -webkit-print-color-adjust: exact; print-color-adjust: exact; background: #fff; }
  h1 { font-size: 18px; margin: 0; letter-spacing: .3px; }
  .head { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #111827; padding-bottom: 8px; }
  .muted { color: #6b7280; }
  .info { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 12px 0; }
  .box { border: 1px solid #d1d5db; border-radius: 6px; padding: 8px 10px; }
  .box table td { padding: 2px 0; vertical-align: top; }
  .box table td:first-child { color: #6b7280; width: 92px; }
  .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 12px; }
  .kpi { border: 1px solid #d1d5db; border-radius: 6px; padding: 6px 8px; }
  .kpi .l { font-size: 9px; text-transform: uppercase; color: #6b7280; letter-spacing: .4px; }
  .kpi .v { font-size: 12.5px; font-weight: 700; margin-top: 2px; }
  table.ledger { width: 100%; border-collapse: collapse; }
  table.ledger th { background: #f3f4f6; text-align: left; font-size: 9.5px; text-transform: uppercase; letter-spacing: .3px;
                    padding: 6px; border-bottom: 1px solid #9ca3af; }
  table.ledger td { padding: 5px 6px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
  table.ledger tr { page-break-inside: avoid; }
  table.ledger thead { display: table-header-group; }
  table.ledger tfoot td { font-weight: 700; background: #f9fafb; border-top: 2px solid #111827; border-bottom: none; }
  .num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
  th.num { text-align: right; }
  .strong { font-weight: 600; }
  .nowrap { white-space: nowrap; }
  .mono { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 9.5px; }
  .plate { display: inline-block; border: 1px solid #9ca3af; border-radius: 3px; padding: 0 4px; font-family: ui-monospace, Menlo, monospace; font-size: 9px; margin-left: 4px; }
  .fx { color: #6b7280; font-size: 9px; margin-top: 1px; }
  .opening td { background: #f9fafb; font-style: italic; }
  .result { margin-top: 10px; padding: 8px 10px; border: 1px solid #d1d5db; border-radius: 6px; display: flex; justify-content: space-between; }
  .sign { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 28px; page-break-inside: avoid; }
  .sign .s { border: 1px solid #d1d5db; border-radius: 6px; padding: 10px; min-height: 96px; }
  .sign .t { font-weight: 700; margin-bottom: 4px; }
  .line { border-top: 1px dotted #6b7280; margin-top: 44px; padding-top: 3px; font-size: 9px; color: #6b7280; }
  .note { margin-top: 14px; font-size: 9.5px; color: #4b5563; line-height: 1.5; }
</style>
</head>
<body onload="window.print(); window.close();">
  <div class="head">
    <div>
      <h1>Cari Hesap Ekstresi</h1>
      <div class="muted" style="margin-top:3px">Dönem: ${esc(period)}</div>
    </div>
    <div class="muted" style="text-align:right">Düzenleme Tarihi: ${esc(fmtDate(new Date()))}</div>
  </div>

  <div class="info">
    <div class="box"><table>${info
      .map(([k, v]) => `<tr><td>${esc(k)}</td><td><b>${esc(v || "—")}</b></td></tr>`)
      .join("")}</table></div>
    <div class="box"><table>
      <tr><td>Dönem Başı</td><td><b>${esc(st.from ? fmtDate(st.from) : "—")}</b></td></tr>
      <tr><td>Dönem Sonu</td><td><b>${esc(st.to ? fmtDate(st.to) : fmtDate(new Date()))}</b></td></tr>
      <tr><td>Kayıt Sayısı</td><td><b>${st.rows.length}</b></td></tr>
      <tr><td>Durum</td><td><b>${esc(balanceText(st.totals.balance))}</b></td></tr>
    </table></div>
  </div>

  <div class="kpis">
    <div class="kpi"><div class="l">Devir</div><div class="v">${esc(fmtBalance(st.opening))}</div></div>
    <div class="kpi"><div class="l">Toplam Borç</div><div class="v">${esc(fmtMoney(st.totals.debit))}</div></div>
    <div class="kpi"><div class="l">Toplam Alacak</div><div class="v">${esc(fmtMoney(st.totals.credit))}</div></div>
    <div class="kpi"><div class="l">Bakiye</div><div class="v">${esc(fmtBalance(st.totals.balance))}</div></div>
  </div>

  <table class="ledger">
    <thead>
      <tr>
        <th style="width:68px">Tarih</th>
        <th style="width:96px">Belge No</th>
        <th>Açıklama</th>
        <th class="num" style="width:88px">Borç</th>
        <th class="num" style="width:88px">Alacak</th>
        <th class="num" style="width:104px">Bakiye</th>
      </tr>
    </thead>
    <tbody>
      ${
        showOpening
          ? `<tr class="opening"><td class="nowrap">${esc(fmtDate(st.from))}</td><td></td><td>Devir (önceki dönem bakiyesi)</td><td class="num">${esc(
              st.opening > 0 ? fmtMoney(st.opening) : "",
            )}</td><td class="num">${esc(st.opening < 0 ? fmtMoney(-st.opening) : "")}</td><td class="num strong">${esc(fmtBalance(st.opening))}</td></tr>`
          : ""
      }
      ${rows || `<tr><td colspan="6" style="text-align:center;padding:16px" class="muted">Bu dönemde hareket bulunmuyor.</td></tr>`}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="3">Dönem Toplamı</td>
        <td class="num">${esc(fmtMoney(st.totals.debit))}</td>
        <td class="num">${esc(fmtMoney(st.totals.credit))}</td>
        <td class="num">${esc(fmtBalance(st.totals.balance))}</td>
      </tr>
    </tfoot>
  </table>

  <div class="result">
    <span>${esc(st.to ? fmtDate(st.to) : fmtDate(new Date()))} itibarıyla bakiye</span>
    <b>${esc(fmtBalance(st.totals.balance))} · ${esc(balanceText(st.totals.balance))}</b>
  </div>

  <div class="note">
    Yukarıdaki ekstrede ${esc(st.to ? fmtDate(st.to) : fmtDate(new Date()))} tarihi itibarıyla hesabınızın
    <b>${esc(fmtBalance(st.totals.balance))}</b> bakiye verdiği görülmektedir. Mutabık olup olmadığınızı aşağıdaki alanı
    imzalayarak bildirmenizi, mutabık değilseniz hesap ekstrenizi tarafımıza iletmenizi rica ederiz.
    (B): Borç bakiyesi, (A): Alacak bakiyesi.
  </div>

  <div class="sign">
    <div class="s">
      <div class="t">Düzenleyen</div>
      <div class="muted">Kaşe / İmza</div>
      <div class="line">Ad Soyad · Tarih</div>
    </div>
    <div class="s">
      <div class="t">Mutabakat — ${esc(a.name)}</div>
      <div class="muted">☐ Mutabıkız &nbsp;&nbsp; ☐ Mutabık değiliz</div>
      <div class="line">Kaşe / İmza · Ad Soyad · Tarih</div>
    </div>
  </div>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Sayfa
// ---------------------------------------------------------------------------

type QuickRange = "month" | "year" | "all";

export default function StatementPage() {
  const { accountId } = useParams<{ accountId?: string }>();
  const navigate = useNavigate();
  const { can } = useAuthContext();
  const canWrite = can("finance.write");
  const { options } = useAccountOptions();

  const [from, setFrom] = useState(yearStartISO);
  const [to, setTo] = useState(todayISO);
  const [statement, setStatement] = useState<Statement | null>(null);
  const [loading, setLoading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [opMode, setOpMode] = useState<"collection" | "payment" | null>(null);

  useEffect(() => {
    if (!accountId) {
      setStatement(null);
      return;
    }
    let alive = true;
    setLoading(true);
    getStatement(accountId, { from: from || undefined, to: to || undefined })
      .then((s) => alive && setStatement(s))
      .catch((err) => {
        if (!alive) return;
        setStatement(null);
        toast.error(errMsg(err, "Ekstre yüklenemedi"));
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [accountId, from, to, reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  const activeRange: QuickRange | null = useMemo(() => {
    if (!from && !to) return "all";
    if (to === todayISO() && from === monthStartISO()) return "month";
    if (to === todayISO() && from === yearStartISO()) return "year";
    return null;
  }, [from, to]);

  const applyRange = (r: QuickRange) => {
    if (r === "all") {
      setFrom("");
      setTo("");
    } else {
      setFrom(r === "month" ? monthStartISO() : yearStartISO());
      setTo(todayISO());
    }
  };

  const handlePrint = () => {
    if (!statement) return;
    const w = window.open("", "_blank");
    if (!w) {
      toast.error("Yazdırma penceresi açılamadı. Lütfen tarayıcı açılır pencerelerine izin verin.");
      return;
    }
    w.document.open();
    w.document.write(buildPrintHtml(statement));
    w.document.close();
  };

  const st = statement && statement.account.id === accountId ? statement : null;
  const a = st?.account;

  const picker = (
    <SearchableSelect
      options={options}
      value={accountId ?? ""}
      onChange={(v) => v && navigate(`/finance/statement/${v}`)}
      onClear={() => navigate("/finance/statement")}
      placeholder="Cari seçin veya arayın..."
    />
  );

  return (
    <Page title={a ? `Cari Ekstre - ${a.name}` : "Finans - Cari Ekstre"}>
      <div className="w-full space-y-4 px-(--margin-x) py-4">
        <FinanceNav
          actions={
            accountId ? (
              <>
                <Button variant="flat" isIcon className="size-8 rounded-lg" onClick={reload} title="Yenile" aria-label="Yenile">
                  <TbRefresh className={clsx("size-4", loading && "animate-spin")} />
                </Button>
                <Button variant="outlined" className="h-8 gap-1.5 rounded-lg px-3 text-xs font-semibold" onClick={handlePrint} disabled={!st}>
                  <TbPrinter className="size-4" />
                  Yazdır / PDF
                </Button>
                {canWrite && (
                  <>
                    <Button
                      color="success"
                      className="h-8 gap-1.5 rounded-lg px-3 text-xs font-semibold"
                      onClick={() => setOpMode("collection")}
                    >
                      <TbArrowDownLeft className="size-4" />
                      Tahsilat Yap
                    </Button>
                    <Button
                      color="error"
                      className="h-8 gap-1.5 rounded-lg px-3 text-xs font-semibold"
                      onClick={() => setOpMode("payment")}
                    >
                      <TbArrowUpRight className="size-4" />
                      Ödeme Yap
                    </Button>
                  </>
                )}
              </>
            ) : undefined
          }
        />

        {/* Filtre çubuğu */}
        <div className="rounded-2xl border border-gray-150 bg-white p-3 shadow-sm dark:border-dark-600 dark:bg-dark-700 sm:p-4">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.6fr)_auto_auto_auto] lg:items-end">
            <div>
              <span className="mb-1 block text-xs font-medium text-gray-700 dark:text-dark-200">Cari</span>
              {picker}
            </div>
            <Input label="Başlangıç" type="date" value={from} onChange={(e) => setFrom(e.target.value)} max={to || undefined} />
            <Input label="Bitiş" type="date" value={to} onChange={(e) => setTo(e.target.value)} min={from || undefined} />
            <div className="flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-dark-800">
              {(
                [
                  ["month", "Bu ay"],
                  ["year", "Bu yıl"],
                  ["all", "Tümü"],
                ] as [QuickRange, string][]
              ).map(([r, label]) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => applyRange(r)}
                  className={clsx(
                    "flex-1 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-semibold transition",
                    activeRange === r
                      ? "bg-white text-primary-600 shadow-sm dark:bg-dark-600 dark:text-primary-400"
                      : "text-gray-500 hover:text-gray-700 dark:text-dark-300 dark:hover:text-dark-100",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {!accountId ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center dark:border-dark-500 dark:bg-dark-700">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-linear-to-br from-primary-500 to-indigo-600 text-white shadow-lg shadow-primary-500/25">
              <TbUserSearch className="size-8" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-gray-800 dark:text-dark-50">Ekstresini görmek istediğiniz cariyi seçin</h3>
            <p className="mt-1 max-w-md text-sm text-gray-500 dark:text-dark-300">
              Faturalar, tahsilatlar, ödemeler ve çek hareketleri yürüyen bakiyeyle tek ekranda listelenir. Ekstreyi yazdırıp mutabakat
              için cariye gönderebilirsiniz.
            </p>
            <div className="mt-5 w-full max-w-sm text-left">{picker}</div>
          </div>
        ) : loading && !st ? (
          <div className="space-y-4">
            <div className="h-40 animate-pulse rounded-2xl bg-gray-150 dark:bg-dark-700" />
            <div className="h-80 animate-pulse rounded-2xl bg-gray-150 dark:bg-dark-700" />
          </div>
        ) : !st || !a ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-14 text-center text-gray-400 dark:border-dark-500 dark:bg-dark-700 dark:text-dark-300">
            Ekstre bulunamadı.
          </div>
        ) : (
          <>
            {/* Başlık kartı */}
            <div className="overflow-hidden rounded-2xl border border-gray-150 bg-white shadow-sm dark:border-dark-600 dark:bg-dark-700">
              <div className="relative bg-linear-to-br from-primary-600 to-indigo-700 px-5 py-4 text-white">
                <TbScale className="pointer-events-none absolute -right-3 -top-3 size-28 text-white/10" />
                <div className="relative flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-tiny font-semibold uppercase tracking-wider text-white/70">Cari Hesap Ekstresi</p>
                    <h2 className="mt-0.5 truncate text-xl font-bold">{a.name}</h2>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/85">
                      {(a.taxNumber || a.tckn) && (
                        <span className="inline-flex items-center gap-1.5">
                          <TbId className="size-4" />
                          {a.taxNumber ? "VKN" : "TCKN"}: {a.taxNumber || a.tckn}
                        </span>
                      )}
                      {a.taxOffice && (
                        <span className="inline-flex items-center gap-1.5">
                          <TbBuildingBank className="size-4" />
                          {a.taxOffice} V.D.
                        </span>
                      )}
                      {a.phone && (
                        <span className="inline-flex items-center gap-1.5">
                          <TbPhone className="size-4" />
                          {a.phone}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {ACCOUNT_TYPE_LABELS[a.type as AccountType] && (
                      <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold">{ACCOUNT_TYPE_LABELS[a.type as AccountType]}</span>
                    )}
                    {a.ledgerCode && (
                      <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold">{LEDGER_LABEL[a.ledgerCode]}</span>
                    )}
                    <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold">
                      {st.from ? fmtDate(st.from) : "Başlangıç"} – {st.to ? fmtDate(st.to) : "Bugün"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 p-4 lg:grid-cols-4">
                <Kpi label="Devir" value={fmtBalance(st.opening)} hint={st.from ? `${fmtDate(st.from)} öncesi` : "Dönem başı yok"} Icon={TbHistory} />
                <Kpi label="Toplam Borç" value={fmtMoney(st.totals.debit)} hint="Cariye borç kaydı" tone="info" Icon={TbArrowUpRight} />
                <Kpi label="Toplam Alacak" value={fmtMoney(st.totals.credit)} hint="Cariye alacak kaydı" tone="warning" Icon={TbArrowDownLeft} />
                <Kpi label="Bakiye" value={fmtBalance(st.totals.balance)} hint={balanceText(st.totals.balance)} tone={balanceTone(st.totals.balance)} Icon={TbScale} />
              </div>
            </div>

            {/* Ekstre tablosu */}
            <div className="overflow-hidden rounded-2xl border border-gray-150 bg-white shadow-sm dark:border-dark-600 dark:bg-dark-700">
              <div className="flex items-center justify-between gap-2 border-b border-gray-150 px-4 py-3 dark:border-dark-600">
                <div className="flex items-center gap-2">
                  <TbFileInvoice className="size-5 text-gray-400 dark:text-dark-300" />
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-dark-50">Hesap Hareketleri</h3>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-tiny font-medium text-gray-600 dark:bg-dark-600 dark:text-dark-200">
                    {st.rows.length} kayıt
                  </span>
                </div>
                <span className="hidden text-xs text-gray-400 dark:text-dark-300 sm:inline">(B): Borç bakiyesi · (A): Alacak bakiyesi</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-tiny font-semibold uppercase tracking-wide text-gray-500 dark:bg-dark-800 dark:text-dark-300">
                      <th className="px-4 py-2.5">Tarih</th>
                      <th className="px-3 py-2.5">Belge No</th>
                      <th className="px-3 py-2.5">Açıklama</th>
                      <th className="px-3 py-2.5 text-right">Borç</th>
                      <th className="px-3 py-2.5 text-right">Alacak</th>
                      <th className="px-4 py-2.5 text-right">Bakiye</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-dark-600">
                    {st.from && (
                      <tr className="bg-gray-50/60 italic text-gray-500 dark:bg-dark-800/40 dark:text-dark-300">
                        <td className="whitespace-nowrap px-4 py-2.5">{fmtDate(st.from)}</td>
                        <td className="px-3 py-2.5">—</td>
                        <td className="px-3 py-2.5 font-medium">Devir (önceki dönem bakiyesi)</td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums">{st.opening > 0 ? fmtMoney(st.opening) : ""}</td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums">{st.opening < 0 ? fmtMoney(-st.opening) : ""}</td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-right font-semibold tabular-nums">{fmtBalance(st.opening)}</td>
                      </tr>
                    )}
                    {st.rows.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-gray-400 dark:text-dark-300">
                          Bu dönemde hareket bulunmuyor.
                        </td>
                      </tr>
                    ) : (
                      st.rows.map((r) => <LedgerRow key={r.id} row={r} accountId={a.id} />)
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-200 bg-gray-50 font-bold text-gray-800 dark:border-dark-500 dark:bg-dark-800 dark:text-dark-50">
                      <td colSpan={3} className="px-4 py-3">
                        Dönem Toplamı
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">{fmtMoney(st.totals.debit)}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">{fmtMoney(st.totals.credit)}</td>
                      <td
                        className={clsx(
                          "whitespace-nowrap px-4 py-3 text-right tabular-nums",
                          st.totals.balance > 0.005 ? "text-success" : st.totals.balance < -0.005 ? "text-error" : "",
                        )}
                      >
                        {fmtBalance(st.totals.balance)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {accountId && (
        <OperationModal
          open={opMode !== null}
          onClose={() => setOpMode(null)}
          onDone={() => {
            setOpMode(null);
            reload();
          }}
          mode={opMode ?? "collection"}
          defaults={{ accountId }}
        />
      )}
    </Page>
  );
}

function LedgerRow({ row: r, accountId }: { row: StatementRow; accountId: string }) {
  const link = rowLink(r, accountId);
  const isMovement = r.kind === "MOVEMENT";
  return (
    <tr className="group transition hover:bg-primary-50/40 dark:hover:bg-dark-600/40">
      <td className="whitespace-nowrap px-4 py-2.5 text-gray-600 dark:text-dark-200">{fmtDate(r.date)}</td>
      <td className="whitespace-nowrap px-3 py-2.5">
        {link ? (
          <Link
            to={link}
            className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-primary-600 hover:underline dark:text-primary-400"
            title={isMovement ? "Finans hareketlerinde aç" : "Belgeyi aç"}
          >
            {r.documentNo || (isMovement ? "Hareket" : "Belge")}
            <TbExternalLink className="size-3 opacity-0 transition group-hover:opacity-100" />
          </Link>
        ) : (
          <span className="font-mono text-xs text-gray-700 dark:text-dark-100">{r.documentNo || "—"}</span>
        )}
      </td>
      <td className="px-3 py-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={clsx("size-1.5 shrink-0 rounded-full", isMovement ? "bg-info" : r.debit > 0 ? "bg-success" : "bg-warning")}
            aria-hidden="true"
          />
          <span className="text-gray-700 dark:text-dark-100">{r.description}</span>
          {r.vehiclePlate && (
            <span className="inline-flex items-center gap-1 rounded border border-gray-300 bg-gray-50 px-1.5 py-0.5 font-mono text-tiny font-semibold text-gray-700 dark:border-dark-450 dark:bg-dark-800 dark:text-dark-100">
              <TbCar className="size-3" />
              {r.vehiclePlate}
            </span>
          )}
        </div>
        {r.foreignAmount != null && r.currency && (
          <p className="mt-0.5 pl-3 text-tiny text-gray-400 dark:text-dark-300">Döviz: {fmtMoney(r.foreignAmount, r.currency)}</p>
        )}
      </td>
      <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-gray-800 dark:text-dark-50">{r.debit ? fmtMoney(r.debit) : ""}</td>
      <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-gray-800 dark:text-dark-50">{r.credit ? fmtMoney(r.credit) : ""}</td>
      <td
        className={clsx(
          "whitespace-nowrap px-4 py-2.5 text-right font-semibold tabular-nums",
          r.balance > 0.005 ? "text-success" : r.balance < -0.005 ? "text-error" : "text-gray-500 dark:text-dark-300",
        )}
      >
        {fmtBalance(r.balance)}
      </td>
    </tr>
  );
}
