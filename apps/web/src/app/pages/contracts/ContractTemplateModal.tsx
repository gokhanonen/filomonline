import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { toast } from "sonner";
import { TbArrowDown, TbArrowUp, TbPlus, TbRefresh, TbTrash, TbWand } from "react-icons/tb";

import { Modal } from "@/components/shared/Modal";
import { Button, Input, NumericInput, Spinner, Switch, Textarea } from "@/components/ui";
import {
  createContractTemplate,
  getDefaultContractLayout,
  parseLayout,
  previewContractLayout,
  updateContractTemplate,
  type ContractLayout,
} from "@/services/contractService";
import type { ContractKind, ContractTemplate } from "@/@types/contract";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  template?: ContractTemplate | null;
}

const TYPES: { id: ContractKind; label: string }[] = [
  { id: "SALES", label: "Satış" },
  { id: "PURCHASE", label: "Alış" },
  { id: "RENTAL", label: "Kiralama" },
];

/** Metinlerde kullanılabilen yer tutucular (API contract-layout.ts LAYOUT_VARIABLES) */
const VARIABLES: { tag: string; desc: string; types?: ContractKind[] }[] = [
  { tag: "{{plaka}}", desc: "Plaka" },
  { tag: "{{marka_model}}", desc: "Marka model" },
  { tag: "{{sozlesme_tarihi}}", desc: "Sözleşme tarihi" },
  { tag: "{{teslim_tarihi}}", desc: "Teslim tarihi", types: ["SALES", "PURCHASE"] },
  { tag: "{{toplam_tutar}}", desc: "Toplam bedel", types: ["SALES", "PURCHASE"] },
  { tag: "{{pesin_odeme}}", desc: "Peşin ödeme", types: ["SALES", "PURCHASE"] },
  { tag: "{{kalan_bakiye}}", desc: "Kalan bakiye", types: ["SALES", "PURCHASE"] },
  { tag: "{{cezai_sart}}", desc: "Cezai şart" },
  { tag: "{{satici_unvan}}", desc: "Satıcı" },
  { tag: "{{alici_unvan}}", desc: "Alıcı" },
  { tag: "{{yetkili_mahkeme}}", desc: "Yetkili mahkeme" },
  { tag: "{{baslangic_tarihi}}", desc: "Kira başlangıcı", types: ["RENTAL"] },
  { tag: "{{kira_suresi_ay}}", desc: "Kira süresi", types: ["RENTAL"] },
  { tag: "{{km_limiti}}", desc: "KM limiti", types: ["RENTAL"] },
  { tag: "{{tutar}}", desc: "Aylık kira", types: ["RENTAL"] },
  { tag: "{{suruculer}}", desc: "Sürücüler", types: ["RENTAL"] },
];

const COLORS = ["#6b6b6b", "#1f2937", "#1e3a8a", "#065f46", "#7f1d1d"];
const A4_WIDTH = 794; // px @96dpi

type FocusTarget = { list: "summaryLines" | "clauses"; index: number } | null;

/** Sözleşme şablonu düzenleyicisi: yapılandırılmış düzen + canlı A4 önizleme (eski HTML şablonlar için ham düzenleme) */
export function ContractTemplateModal({ open, onClose, onSaved, template }: Props) {
  const isEditing = Boolean(template);
  const [name, setName] = useState("");
  const [type, setType] = useState<ContractKind>("SALES");
  const [isDefault, setIsDefault] = useState(false);
  const [layout, setLayout] = useState<ContractLayout | null>(null);
  const [legacyHtml, setLegacyHtml] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewing, setPreviewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scale, setScale] = useState(0.6);
  const focusRef = useRef<FocusTarget>(null);
  const caretRef = useRef<number | null>(null);
  const previewBox = useRef<HTMLDivElement>(null);

  // Açılış: mevcut şablonu yükle ya da varsayılan düzenle başla
  useEffect(() => {
    if (!open) return;
    setPreviewHtml("");
    if (template) {
      setName(template.name);
      setType(template.type);
      setIsDefault(template.isDefault);
      const parsed = parseLayout(template.content);
      setLayout(parsed);
      setLegacyHtml(parsed ? null : template.content);
    } else {
      setName("");
      setType("SALES");
      setIsDefault(false);
      setLegacyHtml(null);
      setLayout(null);
      getDefaultContractLayout("SALES").then(setLayout).catch(() => toast.error("Varsayılan düzen alınamadı"));
    }
  }, [open, template]);

  // Yeni şablonda tür değişince o türün varsayılanı
  const changeType = async (t: ContractKind) => {
    setType(t);
    if (!isEditing) setLayout(await getDefaultContractLayout(t));
  };

  // Canlı önizleme (gecikmeli)
  useEffect(() => {
    if (!open || !layout) return;
    const id = setTimeout(async () => {
      setPreviewing(true);
      try {
        setPreviewHtml(await previewContractLayout(type, layout));
      } catch {
        /* önizleme hatası düzenlemeyi engellemez */
      } finally {
        setPreviewing(false);
      }
    }, 350);
    return () => clearTimeout(id);
  }, [open, layout, type]);

  // Önizleme kutusuna sığdır
  useEffect(() => {
    const el = previewBox.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScale(Math.min(1, (el.clientWidth - 16) / A4_WIDTH)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [open, layout]);

  const set = <K extends keyof ContractLayout>(k: K, v: ContractLayout[K]) => setLayout((l) => (l ? { ...l, [k]: v } : l));
  const setItem = (list: "summaryLines" | "clauses", i: number, v: string) =>
    setLayout((l) => (l ? { ...l, [list]: l[list].map((x, j) => (j === i ? v : x)) } : l));
  const move = (list: "summaryLines" | "clauses", i: number, d: -1 | 1) =>
    setLayout((l) => {
      if (!l) return l;
      const arr = [...l[list]];
      const j = i + d;
      if (j < 0 || j >= arr.length) return l;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return { ...l, [list]: arr };
    });
  const remove = (list: "summaryLines" | "clauses", i: number) => setLayout((l) => (l ? { ...l, [list]: l[list].filter((_, j) => j !== i) } : l));
  const add = (list: "summaryLines" | "clauses") => setLayout((l) => (l ? { ...l, [list]: [...l[list], ""] } : l));

  /** Yer tutucuyu son odaklanan metnin imleç konumuna ekle */
  const insertVar = (tag: string) => {
    const f = focusRef.current;
    if (!f || !layout) return toast.info("Önce bir cümle ya da maddeye tıklayın");
    const text = layout[f.list][f.index] ?? "";
    const at = caretRef.current ?? text.length;
    setItem(f.list, f.index, text.slice(0, at) + tag + text.slice(at));
    caretRef.current = at + tag.length;
  };
  const track = (list: "summaryLines" | "clauses", index: number) => (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    focusRef.current = { list, index };
    caretRef.current = e.currentTarget.selectionStart;
  };

  const resetToDefault = async () => {
    setLayout(await getDefaultContractLayout(type));
    toast.success("Varsayılan düzen yüklendi (kaydedince geçerli olur)");
  };
  const convertLegacy = async () => {
    setLayout(await getDefaultContractLayout(type));
    setLegacyHtml(null);
  };

  const save = async () => {
    if (!name.trim()) return toast.error("Şablon adı giriniz");
    const content = layout ? JSON.stringify(layout) : legacyHtml ?? "";
    if (!content.trim()) return toast.error("Şablon içeriği boş");
    setSaving(true);
    try {
      if (isEditing) await updateContractTemplate(template!.id, { name: name.trim(), type, content, isDefault });
      else await createContractTemplate({ name: name.trim(), type, content, isDefault });
      toast.success("Şablon kaydedildi");
      onSaved();
      onClose();
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? "Kaydedilemedi");
    } finally {
      setSaving(false);
    }
  };

  const vars = VARIABLES.filter((v) => !v.types || v.types.includes(type));

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? `Şablonu Düzenle — ${name}` : "Yeni Sözleşme Şablonu"} className="max-w-[1400px]">
      <div className="space-y-4">
        {/* Üst bilgiler */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-64 flex-1">
            <Input label="Şablon adı" value={name} onChange={(e) => setName(e.target.value)} placeholder="Örn. Standart Araç Satış Sözleşmesi" />
          </div>
          <div>
            <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-dark-100">Tür</span>
            <div className="flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-dark-800">
              {TYPES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  disabled={isEditing}
                  onClick={() => changeType(t.id)}
                  className={clsx(
                    "rounded-md px-3 py-1.5 text-sm font-semibold transition disabled:cursor-not-allowed",
                    type === t.id ? "bg-white shadow-sm dark:bg-dark-600" : "text-gray-500 dark:text-dark-300",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <Switch label="Bu tür için varsayılan" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} />
        </div>

        {legacyHtml !== null ? (
          <LegacyEditor html={legacyHtml} onChange={setLegacyHtml} onConvert={convertLegacy} />
        ) : !layout ? (
          <div className="flex justify-center py-20"><Spinner className="size-8" /></div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
            {/* Düzenleyici */}
            <div className="max-h-[72vh] space-y-5 overflow-y-auto pr-1">
              <Section title="Başlık ve görünüm" action={
                <button type="button" onClick={resetToDefault} className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-primary-600">
                  <TbRefresh className="size-3.5" /> Varsayılana sıfırla
                </button>
              }>
                <Input label="Sözleşme başlığı" value={layout.title} onChange={(e) => set("title", e.target.value.toLocaleUpperCase("tr-TR"))} />
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-gray-600 dark:text-dark-200">Şerit rengi</span>
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => set("accentColor", c)}
                      className={clsx("size-7 rounded-full ring-offset-2 transition dark:ring-offset-dark-700", layout.accentColor === c && "ring-2 ring-primary-500")}
                      style={{ background: c }}
                      aria-label={c}
                    />
                  ))}
                  <input type="color" value={layout.accentColor} onChange={(e) => set("accentColor", e.target.value)} className="size-7 cursor-pointer rounded-full border-0 bg-transparent p-0" />
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <Switch label="Firma logosu" checked={layout.showLogo} onChange={(e) => set("showLogo", e.target.checked)} />
                  <Switch label="Ödemeye ek notlar" checked={layout.showPaymentNotes} onChange={(e) => set("showPaymentNotes", e.target.checked)} />
                  <Switch label="Şahit imza kutusu" checked={layout.showWitness} onChange={(e) => set("showWitness", e.target.checked)} />
                  {type !== "RENTAL" && <Switch label="USD / EURO kolonları" checked={layout.showCurrencyColumns} onChange={(e) => set("showCurrencyColumns", e.target.checked)} />}
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {type !== "RENTAL" && (
                    <NumericInput label="Taksit satırı (en az)" value={layout.installmentRows} onValueChange={(v) => set("installmentRows", Math.min(24, v ?? 0))} numeralDecimalScale={0} suffix="" />
                  )}
                  <Input label="Kullanım amacı" value={layout.usagePurpose} onChange={(e) => set("usagePurpose", e.target.value)} />
                  <Input label="Yetkili mahkeme" value={layout.jurisdiction} onChange={(e) => set("jurisdiction", e.target.value)} />
                </div>
                {type !== "RENTAL" && (
                  <Input
                    label="Boş taksit satırlarının ödeme türleri (virgülle)"
                    value={layout.blankRowTypes.join(", ")}
                    onChange={(e) => set("blankRowTypes", e.target.value.split(",").map((x) => x.trim().toLocaleUpperCase("tr-TR")))}
                  />
                )}
              </Section>

              <VarBar vars={vars} onInsert={insertVar} />

              <Section title="Özet cümleleri" hint="Ödeme tablosunun altında kalın yazılır">
                {layout.summaryLines.map((s, i) => (
                  <ItemRow key={i} n={i + 1} onUp={() => move("summaryLines", i, -1)} onDown={() => move("summaryLines", i, 1)} onRemove={() => remove("summaryLines", i)}>
                    <Textarea rows={2} value={s} onChange={(e) => setItem("summaryLines", i, e.target.value)} onFocus={track("summaryLines", i)} onSelect={track("summaryLines", i)} />
                  </ItemRow>
                ))}
                <AddButton onClick={() => add("summaryLines")}>Cümle ekle</AddButton>
              </Section>

              <Section title="Diğer bilgi ve şartlar" hint={`${layout.clauses.length} madde`}>
                {layout.clauses.map((s, i) => (
                  <ItemRow key={i} n={i + 1} onUp={() => move("clauses", i, -1)} onDown={() => move("clauses", i, 1)} onRemove={() => remove("clauses", i)}>
                    <Textarea rows={3} value={s} onChange={(e) => setItem("clauses", i, e.target.value)} onFocus={track("clauses", i)} onSelect={track("clauses", i)} />
                  </ItemRow>
                ))}
                <AddButton onClick={() => add("clauses")}>Madde ekle</AddButton>
              </Section>
            </div>

            {/* Önizleme */}
            <div ref={previewBox} className="relative max-h-[72vh] overflow-y-auto rounded-xl bg-gray-200 p-2 dark:bg-dark-900">
              <div className="sticky top-0 z-10 mb-2 flex items-center justify-between rounded-lg bg-white/90 px-3 py-1.5 text-xs text-gray-500 backdrop-blur dark:bg-dark-700/90 dark:text-dark-300">
                <span>Önizleme · örnek veri (Skoda Superb satış örneği)</span>
                {previewing && <Spinner className="size-3.5" />}
              </div>
              <div style={{ width: A4_WIDTH * scale, height: 1123 * scale }} className="mx-auto overflow-hidden bg-white shadow">
                <iframe
                  title="Sözleşme önizleme"
                  srcDoc={previewHtml}
                  sandbox=""
                  style={{ width: A4_WIDTH, height: 1123, transform: `scale(${scale})`, transformOrigin: "top left", border: 0 }}
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-gray-150 pt-4 dark:border-dark-500">
          <Button variant="flat" onClick={onClose}>Vazgeç</Button>
          <Button color="primary" onClick={save} disabled={saving || (!layout && legacyHtml === null)}>
            {saving ? "Kaydediliyor…" : "Kaydet"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------

function Section({ title, hint, action, children }: { title: string; hint?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-xl border border-gray-200 p-4 dark:border-dark-500">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-gray-800 dark:text-dark-50">
          {title} {hint && <span className="ml-1 text-xs font-normal text-gray-400">{hint}</span>}
        </h4>
        {action}
      </div>
      {children}
    </section>
  );
}

function ItemRow({ n, onUp, onDown, onRemove, children }: { n: number; onUp: () => void; onDown: () => void; onRemove: () => void; children: React.ReactNode }) {
  const btn = "rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-dark-600";
  return (
    <div className="flex gap-2">
      <span className="mt-2 w-5 shrink-0 text-right text-xs font-bold text-gray-400">{n}</span>
      <div className="min-w-0 flex-1">{children}</div>
      <div className="flex shrink-0 flex-col">
        <button type="button" onClick={onUp} className={btn} aria-label="Yukarı"><TbArrowUp className="size-4" /></button>
        <button type="button" onClick={onDown} className={btn} aria-label="Aşağı"><TbArrowDown className="size-4" /></button>
        <button type="button" onClick={onRemove} className={clsx(btn, "hover:text-error")} aria-label="Kaldır"><TbTrash className="size-4" /></button>
      </div>
    </div>
  );
}

function AddButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="ml-7 flex items-center gap-1 rounded-full border border-dashed border-gray-300 px-3 py-1 text-xs font-semibold text-gray-600 hover:border-primary-500 hover:text-primary-600 dark:border-dark-500 dark:text-dark-200"
    >
      <TbPlus className="size-3.5" /> {children}
    </button>
  );
}

function VarBar({ vars, onInsert }: { vars: typeof VARIABLES; onInsert: (tag: string) => void }) {
  return (
    <div className="sticky top-0 z-10 rounded-xl bg-primary-500/5 p-3 backdrop-blur dark:bg-primary-500/10">
      <p className="mb-1.5 text-xs text-gray-500 dark:text-dark-300">Değişken eklemek için bir cümle/maddeye tıklayın, sonra değişkeni seçin:</p>
      <div className="flex flex-wrap gap-1">
        {vars.map((v) => (
          <button
            key={v.tag}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onInsert(v.tag)}
            title={v.tag}
            className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-primary-700 shadow-xs hover:bg-primary-500 hover:text-white dark:bg-dark-700 dark:text-primary-300"
          >
            {v.desc}
          </button>
        ))}
      </div>
    </div>
  );
}

function LegacyEditor({ html, onChange, onConvert }: { html: string; onChange: (v: string) => void; onConvert: () => void }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-warning/10 px-4 py-3 text-sm text-warning">
        <span>Bu şablon eski HTML biçiminde. Yeni düzende başlık, maddeler ve görünüm formdan düzenlenir ve canlı önizlenir.</span>
        <Button color="warning" className="h-8 gap-1 px-3 text-xs" onClick={onConvert}>
          <TbWand className="size-4" /> Yeni düzene dönüştür
        </Button>
      </div>
      <Textarea rows={22} value={html} onChange={(e) => onChange(e.target.value)} className="font-mono text-xs" />
    </div>
  );
}
