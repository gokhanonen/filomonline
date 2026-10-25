import { useEffect, useState } from "react";
import clsx from "clsx";
import { toast } from "sonner";
import {
  TbBrandWhatsapp,
  TbCar,
  TbCash,
  TbCheck,
  TbCircleCheck,
  TbCopy,
  TbExternalLink,
  TbFileTypePdf,
  TbLinkOff,
  TbPlus,
  TbReceipt2,
  TbRefresh,
  TbTrash,
} from "react-icons/tb";

import { Button, Input, NumericInput, Textarea } from "@/components/ui";
import { Modal } from "@/components/shared/Modal";
import { LeadPicker, emptyLeadChoice, leadChoiceValid, type LeadChoice } from "@/components/shared/LeadPicker";
import type { Vehicle } from "@/@types/vehicle";
import {
  createQuickQuote,
  monthlyPayment,
  revokeQuoteLink,
  shareQuote,
  waPhone,
  type QuoteOptionType,
  type SharedQuote,
} from "@/services/quoteShareService";

interface Props {
  open: boolean;
  onClose: () => void;
  vehicle: Vehicle | null;
}

interface OptionDraft {
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

const OPTION_META: Record<QuoteOptionType, { label: string; Icon: React.ElementType; tone: string }> = {
  CASH: { label: "Peşin", Icon: TbCash, tone: "text-success" },
  LOAN: { label: "Kredili", Icon: TbReceipt2, tone: "text-info" },
  TRADE_IN: { label: "Takaslı", Icon: TbRefresh, tone: "text-warning" },
  INSTALLMENT: { label: "Senetli / Taksitli", Icon: TbReceipt2, tone: "text-secondary" },
};

const VALIDITY_DAYS = [3, 7, 15, 30];
const DEFAULT_TERMS = [
  "Fiyatlarımıza KDV dahildir.",
  "Noter ve tescil masrafları alıcıya aittir.",
  "Teklif, belirtilen tarihe kadar ve araç satılmadığı sürece geçerlidir.",
].map((t) => `• ${t}`).join("\n");
const TERM_CHIPS = ["Ekspertiz raporu verilir.", "1 yıl kasko hediye.", "Takas bedeli ekspertiz sonrası netleşir.", "Kredi onayı bankaya tabidir."];

const fmt = (n?: number | null) => `${Number(n ?? 0).toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ₺`;
const isoDay = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const newKey = () => Math.random().toString(36).slice(2);

/** Seçeneğin finanse edilen tutarı ve aylık taksiti (önizleme) */
function preview(o: OptionDraft) {
  const price = o.price ?? 0;
  const financed = Math.max(0, price - (o.downPayment ?? 0) - (o.tradeInValue ?? 0));
  const n = o.installmentCount ?? 0;
  const monthly = o.type === "LOAN" ? monthlyPayment(financed, o.interestRate ?? 0, n) : o.type === "INSTALLMENT" && n ? Math.round((financed / n) * 100) / 100 : 0;
  return { financed, monthly };
}

/** Araç kartından tek adımda müşteriye özel teklif + paylaşım linki */
export function QuickQuoteModal({ open, onClose, vehicle }: Props) {
  const listPrice = Number(vehicle?.listPrice ?? 0);
  const [lead, setLead] = useState<LeadChoice>(emptyLeadChoice);
  const [price, setPrice] = useState<number | undefined>();
  const [validUntil, setValidUntil] = useState(isoDay(7));
  const [options, setOptions] = useState<OptionDraft[]>([]);
  const [terms, setTerms] = useState(DEFAULT_TERMS);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<SharedQuote | null>(null);

  useEffect(() => {
    if (!open) return;
    setLead(emptyLeadChoice);
    setPrice(listPrice || undefined);
    setValidUntil(isoDay(7));
    setOptions([{ key: newKey(), type: "CASH", price: listPrice || undefined, priceTouched: false, tradeInNote: "" }]);
    setTerms(DEFAULT_TERMS);
    setNotes("");
    setResult(null);
  }, [open, listPrice]);

  // Teklif fiyatı değişince elle değiştirilmemiş seçenek fiyatları da güncellenir
  useEffect(() => {
    setOptions((os) => os.map((o) => (o.priceTouched ? o : { ...o, price })));
  }, [price]);

  const discount = listPrice && price ? listPrice - price : 0;
  const shareUrl = result?.sharePath ? `${window.location.origin}${result.sharePath}` : null;

  const addOption = (type: QuoteOptionType) =>
    setOptions((os) => [
      ...os,
      {
        key: newKey(),
        type,
        price,
        priceTouched: false,
        tradeInNote: "",
        ...(type === "LOAN" ? { installmentCount: 12, interestRate: 3, downPayment: price ? Math.round(price * 0.3) : undefined } : {}),
        ...(type === "INSTALLMENT" ? { installmentCount: 6, downPayment: price ? Math.round(price * 0.4) : undefined } : {}),
      },
    ]);
  const patch = (key: string, p: Partial<OptionDraft>) => setOptions((os) => os.map((o) => (o.key === key ? { ...o, ...p } : o)));

  const canSave = leadChoiceValid(lead) && Boolean(price) && options.length > 0 && options.every((o) => o.price) && Boolean(validUntil);

  const save = async (share: boolean) => {
    if (!vehicle || !canSave) return;
    setSaving(true);
    try {
      const q = await createQuickQuote({
        vehicleId: vehicle.id,
        ...(lead.mode === "existing"
          ? { leadId: lead.leadId }
          : { newLead: { fullName: lead.fullName.trim(), phone: lead.phone || undefined, email: lead.email || undefined } }),
        offeredPrice: price!,
        validUntil,
        terms: terms.trim() || undefined,
        notes: notes.trim() || undefined,
        share,
        options: options.map((o) => ({
          type: o.type,
          price: o.price!,
          downPayment: o.downPayment,
          tradeInValue: o.type === "TRADE_IN" ? o.tradeInValue : undefined,
          tradeInNote: o.type === "TRADE_IN" ? o.tradeInNote || undefined : undefined,
          installmentCount: o.type === "LOAN" || o.type === "INSTALLMENT" ? o.installmentCount : undefined,
          interestRate: o.type === "LOAN" ? o.interestRate : undefined,
        })),
      });
      setResult(q);
      toast.success(`${q.quoteNumber} teklifi oluşturuldu`);
    } catch (err) {
      toast.error([(err as { message?: string | string[] })?.message ?? "Teklif oluşturulamadı"].flat().join(", "));
    } finally {
      setSaving(false);
    }
  };

  const copy = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    toast.success("Link kopyalandı");
  };
  const whatsapp = () => {
    if (!shareUrl || !result || !vehicle) return;
    const title = [vehicle.brandName, vehicle.modelName, vehicle.year].filter(Boolean).join(" ");
    const text = `Merhaba ${result.lead.fullName.split(" ")[0]}, ${title} için size özel hazırladığımız teklifi aşağıdaki bağlantıdan inceleyebilirsiniz:\n${shareUrl}\n\nTeklif ${result.validUntil ? new Date(result.validUntil).toLocaleDateString("tr-TR") : ""} tarihine kadar geçerlidir.`;
    const phone = waPhone(result.lead.phone);
    window.open(`https://wa.me/${phone ?? ""}?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  };
  const runLink = async (fn: () => Promise<SharedQuote>, msg: string) => {
    try {
      setResult(await fn());
      toast.success(msg);
    } catch (err) {
      toast.error([(err as { message?: string | string[] })?.message ?? "İşlem başarısız"].flat().join(", "));
    }
  };

  if (!vehicle) return null;

  return (
    <Modal open={open} onClose={onClose} title="Hızlı Teklif" className="max-w-3xl">
      {/* Araç */}
      <div className="mb-5 flex items-center gap-3 rounded-2xl bg-gray-50 p-3 dark:bg-dark-800">
        {vehicle.coverUrl ? (
          <img src={vehicle.coverUrl} alt={vehicle.plate} className="size-16 rounded-xl object-cover" />
        ) : (
          <span className="flex size-16 items-center justify-center rounded-xl bg-gray-200 text-gray-400 dark:bg-dark-600">
            <TbCar className="size-7" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-mono text-sm font-bold text-gray-800 dark:text-dark-50">{vehicle.plate}</p>
          <p className="truncate text-sm text-gray-600 dark:text-dark-200">
            {[vehicle.brandName, vehicle.modelName, vehicle.year].filter(Boolean).join(" ")}
            {vehicle.km != null ? ` · ${vehicle.km.toLocaleString("tr-TR")} km` : ""}
          </p>
        </div>
        <div className="text-right">
          <p className="text-tiny uppercase text-gray-400">Liste Fiyatı</p>
          <p className="font-bold text-gray-800 dark:text-dark-50">{listPrice ? fmt(listPrice) : "—"}</p>
        </div>
      </div>

      {result ? (
        <ResultPanel
          quote={result}
          shareUrl={shareUrl}
          onCopy={copy}
          onWhatsApp={whatsapp}
          onShare={() => runLink(() => shareQuote(result.id), "Müşteriye özel link oluşturuldu")}
          onRevoke={() => runLink(() => revokeQuoteLink(result.id), "Link kapatıldı; müşteri artık açamaz")}
          onClose={onClose}
        />
      ) : (
        <div className="space-y-5">
          <Section n={1} title="Müşteri">
            <LeadPicker value={lead} onChange={setLead} open={open} />
          </Section>

          <Section n={2} title="Fiyat ve geçerlilik">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <NumericInput label="Müşteriye Özel Fiyat *" value={price ?? null} onValueChange={setPrice} />
                {discount !== 0 && price ? (
                  <p className={clsx("mt-1 text-xs font-semibold", discount > 0 ? "text-success" : "text-warning")}>
                    {discount > 0 ? `Liste fiyatından ${fmt(discount)} indirim (%${((discount / listPrice) * 100).toFixed(1)})` : `Liste fiyatının ${fmt(-discount)} üzerinde`}
                  </p>
                ) : null}
              </div>
              <div>
                <Input label="Geçerlilik *" type="date" min={isoDay(0)} value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
                <div className="mt-1.5 flex gap-1">
                  {VALIDITY_DAYS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setValidUntil(isoDay(d))}
                      className={clsx(
                        "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                        validUntil === isoDay(d) ? "bg-primary-500 text-white" : "bg-gray-100 text-gray-600 dark:bg-dark-600 dark:text-dark-200",
                      )}
                    >
                      {d} gün
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Section>

          <Section n={3} title="Ödeme seçenekleri" hint="Müşteri teklifte tüm seçenekleri yan yana görür">
            <div className="space-y-3">
              {options.map((o) => (
                <OptionCard key={o.key} o={o} onPatch={(p) => patch(o.key, p)} onRemove={options.length > 1 ? () => setOptions((os) => os.filter((x) => x.key !== o.key)) : undefined} />
              ))}
              {options.length < 4 && (
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(OPTION_META) as QuoteOptionType[]).map((t) => (
                    <button
                      key={t}
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
          </Section>

          <Section n={4} title="Koşullar" hint="Müşteri görür">
            <Textarea rows={4} value={terms} onChange={(e) => setTerms(e.target.value)} />
            <div className="mt-1.5 flex flex-wrap gap-1">
              {TERM_CHIPS.filter((c) => !terms.includes(c)).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setTerms((t) => `${t.trimEnd()}\n• ${c}`)}
                  className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600 hover:bg-primary-500/10 hover:text-primary-600 dark:bg-dark-600 dark:text-dark-200"
                >
                  + {c}
                </button>
              ))}
            </div>
            <div className="mt-3">
              <Textarea label="İç not (müşteri görmez)" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </Section>

          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-gray-150 pt-4 dark:border-dark-500">
            <Button variant="flat" onClick={onClose}>Vazgeç</Button>
            <Button variant="outlined" onClick={() => save(false)} disabled={!canSave || saving}>Taslak Kaydet</Button>
            <Button color="primary" onClick={() => save(true)} disabled={!canSave || saving}>
              {saving ? "Hazırlanıyor…" : "Teklifi Oluştur ve Link Al"}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ---------------------------------------------------------------------------

function Section({ n, title, hint, children }: { n: number; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-2 flex items-baseline gap-2">
        <span className="flex size-5 items-center justify-center rounded-full bg-primary-500 text-[11px] font-bold text-white">{n}</span>
        <h4 className="text-sm font-semibold text-gray-800 dark:text-dark-50">{title}</h4>
        {hint && <span className="text-xs text-gray-400">{hint}</span>}
      </div>
      {children}
    </section>
  );
}

function OptionCard({ o, onPatch, onRemove }: { o: OptionDraft; onPatch: (p: Partial<OptionDraft>) => void; onRemove?: () => void }) {
  const { label, Icon, tone } = OPTION_META[o.type];
  const { financed, monthly } = preview(o);
  return (
    <div className="rounded-xl border border-gray-200 p-3 dark:border-dark-500">
      <div className="mb-2 flex items-center justify-between">
        <span className={clsx("flex items-center gap-1.5 text-sm font-semibold", tone)}>
          <Icon className="size-4.5" /> {label}
        </span>
        {onRemove && (
          <button type="button" onClick={onRemove} className="rounded p-1 text-gray-400 hover:text-error" aria-label="Seçeneği kaldır">
            <TbTrash className="size-4" />
          </button>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        <NumericInput label="Fiyat" value={o.price ?? null} onValueChange={(v) => onPatch({ price: v, priceTouched: true })} />
        {o.type === "TRADE_IN" && (
          <>
            <Input label="Takas aracı" placeholder="Plaka / model" value={o.tradeInNote} onChange={(e) => onPatch({ tradeInNote: e.target.value })} />
            <NumericInput label="Takas bedeli" value={o.tradeInValue ?? null} onValueChange={(v) => onPatch({ tradeInValue: v })} />
          </>
        )}
        {o.type !== "CASH" && <NumericInput label="Peşinat" value={o.downPayment ?? null} onValueChange={(v) => onPatch({ downPayment: v })} />}
        {(o.type === "LOAN" || o.type === "INSTALLMENT") && (
          <NumericInput label={o.type === "LOAN" ? "Vade (ay)" : "Taksit sayısı"} value={o.installmentCount ?? null} onValueChange={(v) => onPatch({ installmentCount: v })} numeralDecimalScale={0} suffix="ay" />
        )}
        {o.type === "LOAN" && <NumericInput label="Aylık faiz" value={o.interestRate ?? null} onValueChange={(v) => onPatch({ interestRate: v })} suffix="%" />}
      </div>
      {o.type !== "CASH" && (
        <p className="mt-2 text-xs text-gray-500 dark:text-dark-300">
          {o.type === "TRADE_IN" ? "Kalan ödeme" : "Finanse edilen"} <b className="text-gray-700 dark:text-dark-100">{fmt(financed)}</b>
          {monthly > 0 && (
            <>
              {" "}· {o.installmentCount} × <b className="text-gray-700 dark:text-dark-100">{fmt(monthly)}</b>
            </>
          )}
        </p>
      )}
    </div>
  );
}

function ResultPanel({
  quote,
  shareUrl,
  onCopy,
  onWhatsApp,
  onShare,
  onRevoke,
  onClose,
}: {
  quote: SharedQuote;
  shareUrl: string | null;
  onCopy: () => void;
  onWhatsApp: () => void;
  onShare: () => void;
  onRevoke: () => void;
  onClose: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-1 text-center">
        <TbCircleCheck className="size-11 text-success" />
        <p className="text-lg font-semibold text-gray-800 dark:text-dark-50">{quote.quoteNumber} hazır</p>
        <p className="text-sm text-gray-500 dark:text-dark-300">
          {quote.lead.fullName} · {fmt(quote.offeredPrice)} · {quote.options.length} ödeme seçeneği
          {quote.validUntil ? ` · ${new Date(quote.validUntil).toLocaleDateString("tr-TR")} tarihine kadar` : ""}
        </p>
      </div>

      {shareUrl ? (
        <>
          <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 p-2 pl-3 dark:border-dark-500 dark:bg-dark-800">
            <span className="min-w-0 flex-1 truncate font-mono text-xs text-gray-600 dark:text-dark-200">{shareUrl}</span>
            <Button variant="flat" className="h-8 gap-1 px-2.5 text-xs" onClick={onCopy}>
              <TbCopy className="size-4" /> Kopyala
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Action Icon={TbBrandWhatsapp} label="WhatsApp ile gönder" tone="text-green-600" onClick={onWhatsApp} />
            <Action Icon={TbFileTypePdf} label="PDF indir" tone="text-error" onClick={() => window.open(`${shareUrl}?print=1`, "_blank", "noopener")} />
            <Action Icon={TbExternalLink} label="Müşteri gözüyle aç" tone="text-info" onClick={() => window.open(shareUrl, "_blank", "noopener")} />
            <Action Icon={TbLinkOff} label="Linki kapat" tone="text-gray-500" onClick={onRevoke} />
          </div>
          <p className="text-center text-xs text-gray-400">
            Link müşteriye özeldir; araç satılınca, teklif süresi dolunca ya da siz kapatınca çalışmaz. Müşteri açtığında ve yanıt verdiğinde bildirim alırsınız.
          </p>
        </>
      ) : (
        <div className="flex flex-col items-center gap-2 rounded-xl bg-gray-50 p-4 text-sm text-gray-500 dark:bg-dark-800 dark:text-dark-300">
          Teklif taslak olarak kaydedildi; müşteri linki yok.
          <Button color="primary" className="gap-1" onClick={onShare}>
            <TbCheck className="size-4" /> Link oluştur
          </Button>
        </div>
      )}

      <div className="flex justify-end">
        <Button variant="flat" onClick={onClose}>Kapat</Button>
      </div>
    </div>
  );
}

function Action({ Icon, label, tone, onClick }: { Icon: React.ElementType; label: string; tone: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 rounded-xl border border-gray-200 px-2 py-3 text-xs font-semibold text-gray-700 transition hover:-translate-y-0.5 hover:shadow-sm dark:border-dark-500 dark:text-dark-100"
    >
      <Icon className={clsx("size-6", tone)} />
      {label}
    </button>
  );
}
