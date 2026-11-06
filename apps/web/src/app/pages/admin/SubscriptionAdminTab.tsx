import { useEffect, useState } from "react";
import { toast } from "sonner";
import { TbPlus, TbEdit, TbCheck } from "react-icons/tb";

import { Button, Card, Input, NumericInput, Select, Spinner, Switch } from "@/components/ui";
import { Modal } from "@/components/shared/Modal";
import {
  adminListPlans,
  adminUpsertPlan,
  adminListCoupons,
  adminUpsertCoupon,
  adminListTenants,
  adminAssignPlan,
  type AdminPlan,
  type AdminCoupon,
  type AdminTenantRow,
  type BillingPeriod,
  type CouponType,
} from "@/services/subscriptionService";

type Section = "plans" | "coupons" | "tenants";

export function SubscriptionAdminTab() {
  const [section, setSection] = useState<Section>("plans");
  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-xl bg-gray-100 p-1 dark:bg-dark-800">
        {(
          [
            ["plans", "Planlar"],
            ["coupons", "Kuponlar"],
            ["tenants", "Firmalar"],
          ] as [Section, string][]
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setSection(k)}
            className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition ${
              section === k
                ? "bg-white text-gray-900 shadow-xs dark:bg-dark-700 dark:text-white"
                : "text-gray-600 dark:text-dark-300"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {section === "plans" && <PlansSection />}
      {section === "coupons" && <CouponsSection />}
      {section === "tenants" && <TenantsSection />}
    </div>
  );
}

// --- Planlar ---------------------------------------------------------------

const emptyPlan: Partial<AdminPlan> = {
  code: "",
  name: "",
  monthlyFreeCredits: 0,
  includedUsers: 1,
  includedLocations: 1,
  includedVehicles: 10,
  freeTransactionLimit: null,
  monthlyListPrice: 0,
  annualMonthsCharged: 10,
  trialDays: 0,
  graceOveragePct: 10,
  isPublic: true,
  isActive: true,
  isDefault: false,
  sortOrder: 0,
};

function PlansSection() {
  const [plans, setPlans] = useState<AdminPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<Partial<AdminPlan> | null>(null);

  const load = async () => {
    try {
      setPlans(await adminListPlans());
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  if (loading) return <Loader />;

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <Button color="primary" className="gap-1.5" onClick={() => setEdit({ ...emptyPlan })}>
          <TbPlus className="size-4" /> Yeni Plan
        </Button>
      </div>
      {plans.map((p) => (
        <Card key={p.id} className="flex flex-wrap items-center gap-3 p-3">
          <div className="min-w-40 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-800 dark:text-dark-50">{p.name}</span>
              <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-tiny text-gray-500 dark:bg-dark-700">
                {p.code}
              </span>
              {p.isDefault && <span className="text-tiny text-amber-600">varsayılan</span>}
              {!p.isPublic && <span className="text-tiny text-gray-400">gizli</span>}
              {!p.isActive && <span className="text-tiny text-error">pasif</span>}
            </div>
            <p className="text-tiny text-gray-500 dark:text-dark-300">
              {p.includedUsers}k / {p.includedLocations}lok / {p.includedVehicles}araç ·{" "}
              {Number(p.monthlyFreeCredits).toLocaleString("tr-TR")} kontör/ay
              {p.freeTransactionLimit != null ? ` · ${p.freeTransactionLimit} işlem limiti` : ""}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-gray-800 dark:text-dark-50">
              {Number(p.monthlyListPrice ?? 0).toLocaleString("tr-TR")} ₺/ay
            </p>
            {p.annualMonthsCharged ? (
              <p className="text-tiny text-gray-400">yıllık {p.annualMonthsCharged} ay</p>
            ) : null}
          </div>
          <Button variant="outlined" className="gap-1.5" onClick={() => setEdit(p)}>
            <TbEdit className="size-4" /> Düzenle
          </Button>
        </Card>
      ))}
      {edit && <PlanModal plan={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />}
    </div>
  );
}

function PlanModal({
  plan,
  onClose,
  onSaved,
}: {
  plan: Partial<AdminPlan>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [f, setF] = useState<Partial<AdminPlan>>(plan);
  const [saving, setSaving] = useState(false);
  const set = (k: keyof AdminPlan, v: unknown) => setF((p) => ({ ...p, [k]: v }));
  const numStr = (v: unknown) => (v == null ? undefined : Number(v));

  const save = async () => {
    if (!f.code?.trim() || !f.name?.trim()) {
      toast.error("Kod ve ad zorunlu.");
      return;
    }
    setSaving(true);
    try {
      await adminUpsertPlan(
        {
          code: f.code.trim(),
          name: f.name.trim(),
          monthlyFreeCredits: Number(f.monthlyFreeCredits ?? 0),
          includedUsers: Number(f.includedUsers ?? 0),
          includedLocations: Number(f.includedLocations ?? 0),
          includedVehicles: Number(f.includedVehicles ?? 0),
          freeTransactionLimit: f.freeTransactionLimit == null ? null : Number(f.freeTransactionLimit),
          monthlyListPrice: numStr(f.monthlyListPrice),
          monthlyCampaignPrice: numStr(f.monthlyCampaignPrice),
          annualMonthsCharged: f.annualMonthsCharged == null ? undefined : Number(f.annualMonthsCharged),
          trialDays: Number(f.trialDays ?? 0),
          graceOveragePct: Number(f.graceOveragePct ?? 10),
          isPublic: f.isPublic ?? true,
          isActive: f.isActive ?? true,
          isDefault: f.isDefault ?? false,
          sortOrder: Number(f.sortOrder ?? 0),
        },
        f.id,
      );
      toast.success("Plan kaydedildi.");
      onSaved();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={f.id ? "Planı Düzenle" : "Yeni Plan"} className="max-w-2xl">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Input label="Kod *" value={f.code ?? ""} onChange={(e) => set("code", e.target.value)} />
          <Input label="Ad *" value={f.name ?? ""} onChange={(e) => set("name", e.target.value)} />
          <NumericInput label="Sıra" value={Number(f.sortOrder ?? 0)} onValueChange={(v) => set("sortOrder", v)} numeralDecimalScale={0} />
        </div>
        <p className="text-xs font-semibold text-gray-500">Dahil kotalar</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <NumericInput label="Kullanıcı" value={Number(f.includedUsers ?? 0)} onValueChange={(v) => set("includedUsers", v)} numeralDecimalScale={0} />
          <NumericInput label="Lokasyon" value={Number(f.includedLocations ?? 0)} onValueChange={(v) => set("includedLocations", v)} numeralDecimalScale={0} />
          <NumericInput label="Aktif araç" value={Number(f.includedVehicles ?? 0)} onValueChange={(v) => set("includedVehicles", v)} numeralDecimalScale={0} />
          <NumericInput label="AI kontör/ay" value={Number(f.monthlyFreeCredits ?? 0)} onValueChange={(v) => set("monthlyFreeCredits", v)} numeralDecimalScale={0} />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <NumericInput
            label="Free işlem limiti (boş = sınırsız)"
            value={f.freeTransactionLimit ?? null}
            onValueChange={(v) => set("freeTransactionLimit", v ?? null)}
            numeralDecimalScale={0}
          />
          <NumericInput label="Kota aşım toleransı %" value={Number(f.graceOveragePct ?? 10)} onValueChange={(v) => set("graceOveragePct", v)} numeralDecimalScale={0} suffix="%" />
          <NumericInput label="Deneme (gün)" value={Number(f.trialDays ?? 0)} onValueChange={(v) => set("trialDays", v)} numeralDecimalScale={0} />
        </div>
        <p className="text-xs font-semibold text-gray-500">Fiyatlandırma</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <NumericInput label="Aylık liste (₺)" value={numStr(f.monthlyListPrice) ?? null} onValueChange={(v) => set("monthlyListPrice", v)} />
          <NumericInput label="Aylık kampanya (₺)" value={numStr(f.monthlyCampaignPrice) ?? null} onValueChange={(v) => set("monthlyCampaignPrice", v)} />
          <NumericInput label="Yıllık çekilen ay (10 = indirim)" value={f.annualMonthsCharged ?? null} onValueChange={(v) => set("annualMonthsCharged", v)} numeralDecimalScale={0} />
        </div>
        <div className="flex flex-wrap gap-5">
          <Switch label="Herkese açık" checked={f.isPublic ?? true} onChange={(e) => set("isPublic", e.target.checked)} />
          <Switch label="Aktif" checked={f.isActive ?? true} onChange={(e) => set("isActive", e.target.checked)} />
          <Switch label="Varsayılan (Free)" checked={f.isDefault ?? false} onChange={(e) => set("isDefault", e.target.checked)} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outlined" onClick={onClose}>Vazgeç</Button>
          <Button color="primary" disabled={saving} onClick={save}>
            {saving ? <Spinner className="size-4" /> : "Kaydet"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// --- Kuponlar --------------------------------------------------------------

function CouponsSection() {
  const [coupons, setCoupons] = useState<AdminCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<{ code: string; type: CouponType; value?: number }>({
    code: "",
    type: "PERCENT",
  });

  const load = async () => {
    try {
      setCoupons(await adminListCoupons());
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const add = async () => {
    if (!draft.code.trim() || draft.value == null) {
      toast.error("Kod ve değer zorunlu.");
      return;
    }
    try {
      await adminUpsertCoupon({ code: draft.code.trim().toUpperCase(), type: draft.type, value: draft.value });
      toast.success("Kupon eklendi.");
      setDraft({ code: "", type: "PERCENT" });
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Eklenemedi.");
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="space-y-2">
      {coupons.map((c) => (
        <Card key={c.id} className="flex items-center justify-between p-3">
          <div>
            <span className="font-mono font-bold text-gray-800 dark:text-dark-50">{c.code}</span>
            <span className="ml-2 text-sm text-gray-500">
              {c.type === "PERCENT" ? `%${c.value}` : c.type === "FIXED" ? `${c.value} ₺` : `${c.value} ay ücretsiz`}
            </span>
            {c.description && <span className="ml-2 text-tiny text-gray-400">{c.description}</span>}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-tiny text-gray-400">
              {c.redeemedCount}{c.maxRedemptions != null ? `/${c.maxRedemptions}` : ""} kullanım
            </span>
            <Switch
              checked={c.isActive}
              onChange={() => adminUpsertCoupon({ code: c.code, type: c.type, value: Number(c.value), isActive: !c.isActive } as any, c.id).then(load)}
            />
          </div>
        </Card>
      ))}
      <Card className="flex flex-wrap items-end gap-3 p-4">
        <Input label="Kod" value={draft.code} onChange={(e) => setDraft((d) => ({ ...d, code: e.target.value.toUpperCase() }))} className="w-36" />
        <Select
          label="Tür"
          value={draft.type}
          onChange={(e) => setDraft((d) => ({ ...d, type: e.target.value as CouponType }))}
          data={[
            { value: "PERCENT", label: "Yüzde (%)" },
            { value: "FIXED", label: "Sabit (₺)" },
            { value: "MONTHS_FREE", label: "Ücretsiz ay" },
          ]}
          className="w-40"
        />
        <NumericInput label="Değer" value={draft.value ?? null} onValueChange={(v) => setDraft((d) => ({ ...d, value: v }))} className="w-32" />
        <Button color="primary" className="gap-1.5" onClick={add}>
          <TbPlus className="size-4" /> Kupon Ekle
        </Button>
      </Card>
    </div>
  );
}

// --- Firmalar (tenant aboneliği) -------------------------------------------

function TenantsSection() {
  const [rows, setRows] = useState<AdminTenantRow[]>([]);
  const [plans, setPlans] = useState<AdminPlan[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const [t, p] = await Promise.all([adminListTenants(), adminListPlans()]);
      setRows(t);
      setPlans(p);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  if (loading) return <Loader />;

  return (
    <div className="space-y-2">
      {rows.map((t) => (
        <TenantRow key={t.id} row={t} plans={plans} onChanged={load} />
      ))}
    </div>
  );
}

function TenantRow({
  row,
  plans,
  onChanged,
}: {
  row: AdminTenantRow;
  plans: AdminPlan[];
  onChanged: () => void;
}) {
  const [planCode, setPlanCode] = useState(row.subscription?.planCode ?? plans[0]?.code ?? "");
  const [period, setPeriod] = useState<BillingPeriod>(row.subscription?.period ?? "MONTHLY");
  const [saving, setSaving] = useState(false);

  const assign = async () => {
    setSaving(true);
    try {
      await adminAssignPlan(row.id, { planCode, period });
      toast.success(`${row.name} → ${planCode}`);
      onChanged();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Atanamadı.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="flex flex-wrap items-end gap-3 p-3">
      <div className="min-w-40 flex-1">
        <p className="font-semibold text-gray-800 dark:text-dark-50">{row.name}</p>
        <p className="text-tiny text-gray-500 dark:text-dark-300">
          {row.subscription ? `${row.subscription.planName} · ${row.subscription.status}` : "Abonelik yok (Free)"} ·{" "}
          {row.usage.users}k / {row.usage.locations}lok / {row.usage.activeVehicles}araç / {row.usage.completedTransactions}işlem
        </p>
      </div>
      <Select
        label="Plan"
        value={planCode}
        onChange={(e) => setPlanCode(e.target.value)}
        data={plans.map((p) => ({ value: p.code, label: p.name }))}
        className="w-40"
      />
      <Select
        label="Dönem"
        value={period}
        onChange={(e) => setPeriod(e.target.value as BillingPeriod)}
        data={[
          { value: "MONTHLY", label: "Aylık" },
          { value: "ANNUAL", label: "Yıllık" },
        ]}
        className="w-28"
      />
      <Button color="primary" className="gap-1.5" disabled={saving} onClick={assign}>
        <TbCheck className="size-4" /> Ata
      </Button>
    </Card>
  );
}

function Loader() {
  return (
    <div className="flex justify-center py-12">
      <Spinner className="size-6" />
    </div>
  );
}
