import { Link } from "react-router";
import clsx from "clsx";
import {
  TbArrowBackUp,
  TbBuildingBank,
  TbCalendarDue,
  TbCash,
  TbHistory,
  TbReceiptOff,
  TbSignature,
  TbTransfer,
  TbUser,
} from "react-icons/tb";

import type { Cheque } from "@/@types/finance";
import { ChequeStatusBadge, currencySymbol, fmtDate } from "../shared";
import type { ChequeAction } from "./ChequeActionModal";

interface Props {
  cheque: Cheque;
  canWrite: boolean;
  onAction: (action: ChequeAction) => void;
  onEndorse: () => void;
}

function dueInfo(c: Cheque) {
  const d = c.daysToDue;
  if (d === null || d === undefined) return { text: null as string | null, tone: "muted" as const };
  if (d < 0) return { text: `${Math.abs(d)} gün geçti`, tone: "error" as const };
  if (d === 0) return { text: "Bugün", tone: "warning" as const };
  if (d <= 7) return { text: `${d} gün kaldı`, tone: "warning" as const };
  return { text: `${d} gün kaldı`, tone: "ok" as const };
}

const TONE_CLS = {
  error: "bg-error/15 text-error",
  warning: "bg-warning/15 text-warning",
  ok: "bg-success/15 text-success",
  muted: "",
};

const STRIPE: Record<string, string> = {
  PORTFOLIO: "from-sky-400 via-indigo-400 to-sky-500",
  IN_COLLECTION: "from-violet-400 via-fuchsia-400 to-violet-500",
  ISSUED: "from-amber-400 via-orange-400 to-amber-500",
  COLLECTED: "from-emerald-400 via-teal-400 to-emerald-500",
  PAID: "from-emerald-400 via-teal-400 to-emerald-500",
  ENDORSED: "from-gray-300 via-gray-400 to-gray-300",
  BOUNCED: "from-rose-400 via-red-500 to-rose-500",
  RETURNED: "from-amber-300 via-yellow-400 to-amber-400",
};

export function ChequeCard({ cheque: c, canWrite, onAction, onEndorse }: Props) {
  const due = dueInfo(c);
  const isNote = c.kind === "NOTE";
  const received = c.direction === "RECEIVED";
  const closed = !["PORTFOLIO", "IN_COLLECTION", "ISSUED"].includes(c.status);
  const [intPart, decPart] = Number(c.amount || 0)
    .toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    .split(",");

  const actions: { key: string; label: string; Icon: React.ElementType; onClick: () => void; tone?: "primary" | "error" | "neutral" }[] = [];
  if (canWrite && received && c.status === "PORTFOLIO") {
    actions.push({ key: "deposit", label: "Tahsile Ver", Icon: TbBuildingBank, onClick: () => onAction("deposit") });
    actions.push({ key: "collect", label: "Tahsil Et", Icon: TbCash, onClick: () => onAction("collect"), tone: "primary" });
    actions.push({ key: "endorse", label: "Ciro Et", Icon: TbTransfer, onClick: onEndorse });
    actions.push({ key: "bounce", label: "Karşılıksız / İade", Icon: TbReceiptOff, onClick: () => onAction("bounce"), tone: "error" });
  }
  if (canWrite && received && c.status === "IN_COLLECTION") {
    actions.push({ key: "collect", label: "Tahsil Et", Icon: TbCash, onClick: () => onAction("collect"), tone: "primary" });
    actions.push({ key: "withdraw", label: "Tahsilden Geri Al", Icon: TbArrowBackUp, onClick: () => onAction("withdraw") });
    actions.push({ key: "bounce", label: "Karşılıksız / İade", Icon: TbReceiptOff, onClick: () => onAction("bounce"), tone: "error" });
  }
  if (canWrite && !received && c.status === "ISSUED") {
    actions.push({ key: "pay", label: "Öde", Icon: TbCash, onClick: () => onAction("pay"), tone: "primary" });
  }

  return (
    <div
      className={clsx(
        "group relative flex flex-col overflow-hidden rounded-2xl border border-gray-150 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:border-dark-600 dark:bg-dark-700",
        closed && "opacity-80 hover:opacity-100",
      )}
    >
      {/* Üst renk şeridi */}
      <div className={clsx("h-1.5 w-full bg-gradient-to-r", STRIPE[c.status] ?? STRIPE.PORTFOLIO)} />

      {/* Slip gövdesi: hafif güvenlik deseni */}
      <div
        className="relative flex-1 p-4"
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg, rgba(148,163,184,0.06) 0 2px, transparent 2px 9px), repeating-linear-gradient(45deg, rgba(148,163,184,0.05) 0 1px, transparent 1px 11px)",
        }}
      >
        {/* Başlık */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span
                className={clsx(
                  "rounded-md px-1.5 py-0.5 text-tiny font-extrabold tracking-[0.2em]",
                  isNote ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" : "bg-amber-500/15 text-amber-700 dark:text-amber-400",
                )}
              >
                {isNote ? "SENET" : "ÇEK"}
              </span>
              <span className="font-mono text-sm font-bold text-gray-800 dark:text-dark-50">No {c.serialNo}</span>
            </div>
            <p className="mt-1 flex items-center gap-1 truncate text-xs text-gray-500 dark:text-dark-300">
              <TbBuildingBank className="size-3.5 shrink-0" />
              <span className="truncate">
                {c.bankName || (isNote ? "Senet" : "Banka belirtilmemiş")}
                {c.branchName ? ` · ${c.branchName}` : ""}
              </span>
            </p>
          </div>
          <ChequeStatusBadge status={c.status} />
        </div>

        {/* Taraflar */}
        <div className="mt-3 space-y-1.5 text-xs">
          <Party Icon={TbSignature} label="Keşideci" value={c.drawer} />
          <Party Icon={TbUser} label={received ? "Alınan Cari" : "Verilen Cari"} value={c.account?.name} strong />
          {c.holder && <Party Icon={TbTransfer} label="Ciro Edilen" value={c.holder.name} />}
          {c.bankRegister && (
            <Party Icon={TbBuildingBank} label={c.status === "IN_COLLECTION" ? "Tahsilde" : "Banka Hesabı"} value={c.bankRegister.name} />
          )}
        </div>

        {/* Vade + tutar */}
        <div className="mt-4 flex items-end justify-between gap-3 border-t border-dashed border-gray-200 pt-3 dark:border-dark-500">
          <div className="min-w-0">
            <p className="text-tiny font-semibold uppercase tracking-wide text-gray-400 dark:text-dark-300">Vade</p>
            <p className="flex items-center gap-1 text-sm font-semibold text-gray-700 dark:text-dark-100">
              <TbCalendarDue className="size-4 text-gray-400" />
              {fmtDate(c.dueDate)}
            </p>
            {due.text && (
              <span className={clsx("mt-1 inline-block rounded px-1.5 py-0.5 text-tiny font-bold", TONE_CLS[due.tone])}>{due.text}</span>
            )}
          </div>
          <div className="text-right">
            <p className="text-tiny font-semibold uppercase tracking-wide text-gray-400 dark:text-dark-300">Tutar</p>
            <p className="whitespace-nowrap font-mono tabular-nums text-gray-900 dark:text-white">
              <span className="text-2xl font-extrabold">{intPart}</span>
              <span className="text-sm font-bold text-gray-500 dark:text-dark-300">,{decPart}</span>
              <span className="ml-1 text-lg font-bold text-gray-500 dark:text-dark-300">{currencySymbol(c.currency)}</span>
            </p>
            {c.currency !== "TRY" && <p className="text-tiny font-semibold text-gray-400">{c.currency}</p>}
          </div>
        </div>

        {c.description && <p className="mt-2 line-clamp-2 text-xs italic text-gray-400 dark:text-dark-300">{c.description}</p>}
      </div>

      {/* Eylemler (kesik çizgili koçan) */}
      <div className="relative border-t-2 border-dashed border-gray-200 bg-gray-50/80 px-3 py-2.5 dark:border-dark-500 dark:bg-dark-800/50">
        <span className="absolute -left-2 -top-2 size-4 rounded-full border border-gray-150 bg-gray-50 dark:border-dark-600 dark:bg-dark-900" />
        <span className="absolute -right-2 -top-2 size-4 rounded-full border border-gray-150 bg-gray-50 dark:border-dark-600 dark:bg-dark-900" />
        <div className="flex flex-wrap items-center gap-1.5">
          {actions.map((a) => (
            <button
              key={a.key}
              type="button"
              onClick={a.onClick}
              className={clsx(
                "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold transition",
                a.tone === "primary"
                  ? "bg-primary-500 text-white shadow-xs hover:bg-primary-600"
                  : a.tone === "error"
                    ? "bg-error/10 text-error hover:bg-error/20"
                    : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-100 dark:border-dark-500 dark:bg-dark-700 dark:text-dark-100 dark:hover:bg-dark-600",
              )}
            >
              <a.Icon className="size-3.5" />
              {a.label}
            </button>
          ))}
          <Link
            to={`/finance/movements?chequeId=${c.id}`}
            className="ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-gray-500 hover:bg-gray-100 hover:text-primary-600 dark:text-dark-300 dark:hover:bg-dark-600 dark:hover:text-primary-400"
          >
            <TbHistory className="size-3.5" />
            Hareketler
          </Link>
        </div>
      </div>
    </div>
  );
}

function Party({ Icon, label, value, strong }: { Icon: React.ElementType; label: string; value?: string | null; strong?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="size-3.5 shrink-0 text-gray-400" />
      <span className="w-20 shrink-0 text-gray-400 dark:text-dark-300">{label}</span>
      <span className={clsx("truncate", strong ? "font-semibold text-gray-800 dark:text-dark-50" : "text-gray-600 dark:text-dark-200")}>
        {value || "—"}
      </span>
    </div>
  );
}
