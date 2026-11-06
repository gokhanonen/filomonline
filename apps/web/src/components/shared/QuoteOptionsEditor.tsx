// Teklif ödeme seçenekleri editörü (peşin / kredili / takaslı / senetli).
// Hem CRM potansiyel detayında hem araç kartı hızlı teklifinde kullanılabilsin diye
// paylaşılan bileşen. En çok 4 seçenek; parasal alanlar NumericInput (binlik ayracı zorunlu).
import { useId } from "react";
import clsx from "clsx";
import {
  TbCash,
  TbPlus,
  TbReceipt2,
  TbRefresh,
  TbTrash,
} from "react-icons/tb";

import { Input, NumericInput } from "@/components/ui";
import { monthlyPayment, type QuoteOptionType } from "@/services/quoteShareService";

export interface QuoteOptionDraft {
  key: string;
  type: QuoteOptionType;
  price?: number;
  priceTouched: boolean;
  downPayment?: number;
  tradeInValue?: number;
  tradeInNote: string;
  installmentCount?: number;
  interestRate?: number;
}

const OPTION_META: Record<
  QuoteOptionType,
  { label: string; Icon: React.ElementType; tone: string }
> = {
  CASH: { label: "Peşin", Icon: TbCash, tone: "text-success" },
  LOAN: { label: "Kredili", Icon: TbReceipt2, tone: "text-info" },
  TRADE_IN: { label: "Takaslı", Icon: TbRefresh, tone: "text-warning" },
  INSTALLMENT: { label: "Senetli / Taksitli", Icon: TbReceipt2, tone: "text-secondary" },
};

const fmt = (n?: number | null) =>
  `${Number(n ?? 0).toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ₺`;

export const newOptionKey = () => Math.random().toString(36).slice(2);

/** Verilen tipte, temel fiyatla bir taslak seçenek üretir. */
export function makeOptionDraft(
  type: QuoteOptionType,
  basePrice?: number,
): QuoteOptionDraft {
  return {
    key: newOptionKey(),
    type,
    price: basePrice,
    priceTouched: false,
    tradeInNote: "",
    ...(type === "LOAN"
      ? { installmentCount: 12, interestRate: 3, downPayment: basePrice ? Math.round(basePrice * 0.3) : undefined }
      : {}),
    ...(type === "INSTALLMENT"
      ? { installmentCount: 6, downPayment: basePrice ? Math.round(basePrice * 0.4) : undefined }
      : {}),
  };
}

/** Seçeneğin finanse edilen tutarı ve aylık taksiti (önizleme). */
function preview(o: QuoteOptionDraft) {
  const price = o.price ?? 0;
  const financed = Math.max(0, price - (o.downPayment ?? 0) - (o.tradeInValue ?? 0));
  const n = o.installmentCount ?? 0;
  const monthly =
    o.type === "LOAN"
      ? monthlyPayment(financed, o.interestRate ?? 0, n)
      : o.type === "INSTALLMENT" && n
        ? Math.round((financed / n) * 100) / 100
        : 0;
  return { financed, monthly };
}

/** Taslakları CreateQuoteDto.options yüküne çevirir (boş/fiyatsız olanları atar). */
export function draftsToPayload(options: QuoteOptionDraft[]) {
  return options
    .filter((o) => o.price != null)
    .map((o) => ({
      type: o.type,
      price: o.price!,
      downPayment: o.type !== "CASH" ? o.downPayment : undefined,
      tradeInValue: o.type === "TRADE_IN" ? o.tradeInValue : undefined,
      tradeInNote: o.type === "TRADE_IN" ? o.tradeInNote || undefined : undefined,
      installmentCount:
        o.type === "LOAN" || o.type === "INSTALLMENT" ? o.installmentCount : undefined,
      interestRate: o.type === "LOAN" ? o.interestRate : undefined,
    }));
}

interface Props {
  value: QuoteOptionDraft[];
  onChange: (next: QuoteOptionDraft[]) => void;
  /** Teklif fiyatı; yeni seçenek eklerken ve "elle değişmemiş" fiyatları güncellerken temel alınır. */
  basePrice?: number;
}

export function QuoteOptionsEditor({ value, onChange, basePrice }: Props) {
  const groupId = useId();

  const addOption = (type: QuoteOptionType) =>
    onChange([...value, makeOptionDraft(type, basePrice)]);
  const patch = (key: string, p: Partial<QuoteOptionDraft>) =>
    onChange(value.map((o) => (o.key === key ? { ...o, ...p } : o)));
  const remove = (key: string) => onChange(value.filter((o) => o.key !== key));

  return (
    <div className="space-y-3">
      {value.map((o) => {
        const { label, Icon, tone } = OPTION_META[o.type];
        const { financed, monthly } = preview(o);
        return (
          <div
            key={o.key}
            className="rounded-xl border border-gray-200 p-3 dark:border-dark-500"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className={clsx("flex items-center gap-1.5 text-sm font-semibold", tone)}>
                <Icon className="size-4.5" /> {label}
              </span>
              <button
                type="button"
                onClick={() => remove(o.key)}
                className="rounded p-1 text-gray-400 hover:text-error"
                aria-label="Seçeneği kaldır"
              >
                <TbTrash className="size-4" />
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-4">
              <NumericInput
                label="Fiyat"
                value={o.price ?? null}
                onValueChange={(v) => patch(o.key, { price: v, priceTouched: true })}
              />
              {o.type === "TRADE_IN" && (
                <>
                  <Input
                    label="Takas aracı"
                    placeholder="Plaka / model"
                    value={o.tradeInNote}
                    onChange={(e) => patch(o.key, { tradeInNote: e.target.value })}
                  />
                  <NumericInput
                    label="Takas bedeli"
                    value={o.tradeInValue ?? null}
                    onValueChange={(v) => patch(o.key, { tradeInValue: v })}
                  />
                </>
              )}
              {o.type !== "CASH" && (
                <NumericInput
                  label="Peşinat"
                  value={o.downPayment ?? null}
                  onValueChange={(v) => patch(o.key, { downPayment: v })}
                />
              )}
              {(o.type === "LOAN" || o.type === "INSTALLMENT") && (
                <NumericInput
                  label={o.type === "LOAN" ? "Vade" : "Taksit sayısı"}
                  value={o.installmentCount ?? null}
                  onValueChange={(v) => patch(o.key, { installmentCount: v })}
                  numeralDecimalScale={0}
                  suffix="ay"
                />
              )}
              {o.type === "LOAN" && (
                <NumericInput
                  label="Aylık faiz"
                  value={o.interestRate ?? null}
                  onValueChange={(v) => patch(o.key, { interestRate: v })}
                  suffix="%"
                />
              )}
            </div>
            {o.type !== "CASH" && (
              <p className="mt-2 text-xs text-gray-500 dark:text-dark-300">
                {o.type === "TRADE_IN" ? "Kalan ödeme" : "Finanse edilen"}{" "}
                <b className="text-gray-700 dark:text-dark-100">{fmt(financed)}</b>
                {monthly > 0 && (
                  <>
                    {" "}· {o.installmentCount} ×{" "}
                    <b className="text-gray-700 dark:text-dark-100">{fmt(monthly)}</b>
                  </>
                )}
              </p>
            )}
          </div>
        );
      })}
      {value.length < 4 && (
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(OPTION_META) as QuoteOptionType[]).map((t) => (
            <button
              key={`${groupId}-${t}`}
              type="button"
              onClick={() => addOption(t)}
              className="flex items-center gap-1 rounded-full border border-dashed border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:border-primary-500 hover:text-primary-600 dark:border-dark-500 dark:text-dark-200"
            >
              <TbPlus className="size-3.5" /> {OPTION_META[t].label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Teklif kartında kayıtlı seçenekleri salt-okunur gösterir. */
export function QuoteOptionsSummary({
  options,
}: {
  options: { type: QuoteOptionType; label?: string; price: number | string; downPayment?: number | string | null; tradeInValue?: number | string | null; installmentCount?: number | null; monthlyPayment?: number | string | null; interestRate?: number | string | null }[];
}) {
  if (!options?.length) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {options.map((o, i) => {
        const meta = OPTION_META[o.type];
        const Icon = meta?.Icon ?? TbCash;
        return (
          <div
            key={i}
            className="flex items-center gap-1.5 rounded-lg border border-gray-150 bg-gray-50 px-2.5 py-1 text-tiny dark:border-dark-600 dark:bg-dark-700"
          >
            <Icon className={clsx("size-3.5", meta?.tone)} />
            <span className="font-semibold text-gray-700 dark:text-dark-100">
              {o.label ?? meta?.label ?? o.type}
            </span>
            <span className="text-gray-500 dark:text-dark-300">{fmt(Number(o.price))}</span>
            {Number(o.monthlyPayment) > 0 && o.installmentCount ? (
              <span className="text-gray-400">
                · {o.installmentCount}×{fmt(Number(o.monthlyPayment))}
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
