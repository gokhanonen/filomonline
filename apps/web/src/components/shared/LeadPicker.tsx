import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { TbUserPlus, TbUsers } from "react-icons/tb";

import { Input } from "@/components/ui";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import { listLeads, type Lead } from "@/services/crmService";

export type LeadChoice =
  | { mode: "existing"; leadId: string }
  | { mode: "new"; fullName: string; phone: string; email: string };

export const emptyLeadChoice: LeadChoice = { mode: "existing", leadId: "" };

export const leadChoiceValid = (c: LeadChoice) => (c.mode === "existing" ? Boolean(c.leadId) : c.fullName.trim().length >= 2);

/** Potansiyel seçimi: kayıtlı potansiyellerden ara ya da yerinde yeni ekle (teklif, deneme sürüşü) */
export function LeadPicker({ value, onChange, open }: { value: LeadChoice; onChange: (c: LeadChoice) => void; open: boolean }) {
  const [leads, setLeads] = useState<Lead[]>([]);

  useEffect(() => {
    if (!open) return;
    listLeads().then(setLeads).catch(() => void 0);
  }, [open]);

  const options = useMemo(
    () =>
      leads
        .filter((l) => l.status !== "CONVERTED" && l.status !== "LOST")
        .map((l) => ({ value: l.id, label: l.fullName, subLabel: [l.phone, l.email].filter(Boolean).join(" · ") || undefined })),
    [leads],
  );

  return (
    <div className="space-y-2.5">
      <div className="flex gap-1.5">
        {(
          [
            ["existing", "Kayıtlı potansiyel", TbUsers],
            ["new", "Yeni potansiyel", TbUserPlus],
          ] as const
        ).map(([mode, label, Icon]) => (
          <button
            key={mode}
            type="button"
            onClick={() => onChange(mode === "existing" ? emptyLeadChoice : { mode: "new", fullName: "", phone: "", email: "" })}
            className={clsx(
              "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition",
              value.mode === mode ? "border-primary-500 bg-primary-500 text-white" : "border-gray-200 text-gray-600 hover:border-gray-300 dark:border-dark-500 dark:text-dark-200",
            )}
          >
            <Icon className="size-4" /> {label}
          </button>
        ))}
      </div>
      {value.mode === "existing" ? (
        <SearchableSelect
          placeholder="Ad, telefon ya da e-posta ile ara…"
          options={options}
          value={value.leadId}
          onChange={(leadId) => onChange({ mode: "existing", leadId })}
          onClear={() => onChange(emptyLeadChoice)}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label="Ad Soyad *" value={value.fullName} onChange={(e) => onChange({ ...value, fullName: e.target.value })} />
          <Input label="Telefon" type="tel" placeholder="05xx xxx xx xx" value={value.phone} onChange={(e) => onChange({ ...value, phone: e.target.value })} />
          <Input label="E-posta" type="email" value={value.email} onChange={(e) => onChange({ ...value, email: e.target.value })} />
        </div>
      )}
    </div>
  );
}
