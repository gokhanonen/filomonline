import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { TbCheck, TbX, TbCrown, TbArrowUp } from "react-icons/tb";

import { Button, Card, Input, Spinner } from "@/components/ui";
import { Modal } from "@/components/shared/Modal";
import { Page } from "@/components/shared/Page";
import {
  getPlans,
  getCurrentSubscription,
  getUsage,
  previewQuote,
  subscribe,
  cancelSubscription,
  type PublicPlan,
  type CurrentSubscription,
  type QuotaStatus,
  type BillingPeriod,
  type DimStatus,
} from "@/services/subscriptionService";
import { mockCompletePayment, type PurchaseIntent } from "@/services/creditsService";

const money = (n: number) =>
  `${Number(n).toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ₺`;

export default function SubscriptionPage() {
  const [plans, setPlans] = useState<PublicPlan[]>([]);
  const [current, setCurrent] = useState<CurrentSubscription | null>(null);
  const [usage, setUsage] = useState<QuotaStatus | null>(null);
  const [period, setPeriod] = useState<BillingPeriod>("MONTHLY");
  const [coupon, setCoupon] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [pending, setPending] = useState<{ intent: PurchaseIntent; planName: string } | null>(null);
  const [completing, setCompleting] = useState(false);

  const load = useCallback(async () => {
    try {
      const [p, c, u] = await Promise.all([getPlans(), getCurrentSubscription(), getUsage()]);
      setPlans(p);
      setCurrent(c);
      setUsage(u);
    } catch {
      toast.error("Abonelik bilgileri yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const choose = async (plan: PublicPlan) => {
    setBusy(plan.code);
    try {
      if (coupon.trim()) {
        try {
          const q = await previewQuote(plan.code, period, coupon.trim());
          toast.success(`Kupon uygulandı: ${money(q.finalPrice)} (${money(q.discount)} indirim)`);
        } catch (e: any) {
          toast.error(e?.response?.data?.message || "Kupon geçersiz.");
          setBusy(null);
          return;
        }
      }
      const res = await subscribe(plan.code, period, coupon.trim() || undefined);
      if ("free" in res) {
        toast.success("Planınız etkinleştirildi.");
        await load();
      } else if (res.payment) {
        setPending({ intent: res, planName: plan.name });
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "İşlem başlatılamadı.");
    } finally {
      setBusy(null);
    }
  };

  const finishMock = async (outcome: "success" | "fail") => {
    if (!pending) return;
    setCompleting(true);
    try {
      await mockCompletePayment(pending.intent.payment.id, outcome);
      toast[outcome === "success" ? "success" : "info"](
        outcome === "success" ? "Aboneliğiniz etkinleşti!" : "Ödeme iptal edildi.",
      );
      setPending(null);
      await load();
    } catch {
      toast.error("Ödeme tamamlanamadı.");
    } finally {
      setCompleting(false);
    }
  };

  const doCancel = async () => {
    try {
      await cancelSubscription();
      toast.success("Abonelik dönem sonunda sonlanacak.");
      await load();
    } catch {
      toast.error("İptal edilemedi.");
    }
  };

  if (loading)
    return (
      <div className="flex h-full items-center justify-center py-20">
        <Spinner className="size-7" />
      </div>
    );

  return (
    <Page title="Abonelik & Planlar">
      <div className="mx-auto max-w-6xl space-y-6 p-4 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-gray-800 dark:text-dark-50">
              Abonelik & Planlar
            </h1>
            <p className="text-sm text-gray-500 dark:text-dark-300">
              Mevcut plan:{" "}
              <b className="text-gray-700 dark:text-dark-100">
                {usage?.plan.name ?? current?.plan.name ?? "Ücretsiz"}
              </b>
              {current?.status ? ` · ${statusLabel(current.status)}` : ""}
              {current?.currentPeriodEnd
                ? ` · ${new Date(current.currentPeriodEnd).toLocaleDateString("tr-TR")} tarihine kadar`
                : ""}
            </p>
          </div>
          {current && current.status === "ACTIVE" && !current.cancelAtPeriodEnd && (
            <Button variant="outlined" onClick={doCancel}>
              Aboneliği iptal et
            </Button>
          )}
        </div>

        {/* Kullanım */}
        {usage && (
          <Card className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-4">
            <UsageBar d={usage.dimensions.users} />
            <UsageBar d={usage.dimensions.locations} />
            <UsageBar d={usage.dimensions.vehicles} />
            {usage.dimensions.transactions && <UsageBar d={usage.dimensions.transactions} />}
          </Card>
        )}

        {/* Dönem + kupon */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-xl bg-gray-100 p-1 dark:bg-dark-800">
            {(["MONTHLY", "ANNUAL"] as BillingPeriod[]).map((pr) => (
              <button
                key={pr}
                type="button"
                onClick={() => setPeriod(pr)}
                className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition ${
                  period === pr
                    ? "bg-white text-gray-900 shadow-xs dark:bg-dark-700 dark:text-white"
                    : "text-gray-600 dark:text-dark-300"
                }`}
              >
                {pr === "MONTHLY" ? "Aylık" : "Yıllık (10 öde 12 kullan)"}
              </button>
            ))}
          </div>
          <Input
            placeholder="Kupon kodu (opsiyonel)"
            value={coupon}
            onChange={(e) => setCoupon(e.target.value.toUpperCase())}
            className="w-56"
          />
        </div>

        {/* Planlar */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => {
            const isCurrent = (usage?.plan.code ?? "free") === plan.code;
            const pr = period === "ANNUAL" ? plan.pricing.annual : plan.pricing.monthly;
            const hasDiscount = pr.list > pr.effective;
            return (
              <Card
                key={plan.id}
                className={`flex flex-col gap-3 p-5 ${isCurrent ? "ring-2 ring-primary-500" : ""}`}
              >
                <div className="flex items-center gap-2">
                  {plan.code === "enterprise" && <TbCrown className="size-5 text-amber-500" />}
                  <h3 className="text-base font-bold text-gray-800 dark:text-dark-50">
                    {plan.name}
                  </h3>
                  {isCurrent && (
                    <span className="rounded-full bg-primary-100 px-2 py-0.5 text-tiny font-semibold text-primary-700 dark:bg-primary-950/40 dark:text-primary-300">
                      Mevcut
                    </span>
                  )}
                </div>
                <div>
                  {hasDiscount && (
                    <span className="mr-1 text-sm text-gray-400 line-through">{money(pr.list)}</span>
                  )}
                  <span className="text-2xl font-bold text-gray-900 dark:text-dark-50">
                    {pr.effective > 0 ? money(pr.effective) : "Ücretsiz"}
                  </span>
                  <span className="text-xs text-gray-400">
                    {pr.effective > 0 ? (period === "ANNUAL" ? " /yıl" : " /ay") : ""}
                  </span>
                </div>
                <ul className="space-y-1.5 text-sm text-gray-600 dark:text-dark-200">
                  <Feat>{plan.includedUsers} kullanıcı</Feat>
                  <Feat>{plan.includedLocations} lokasyon</Feat>
                  <Feat>{plan.includedVehicles} aktif araç</Feat>
                  <Feat>{plan.monthlyFreeCredits.toLocaleString("tr-TR")} AI kontör/ay</Feat>
                </ul>
                <Button
                  color={isCurrent ? "neutral" : "primary"}
                  className="mt-auto gap-1.5"
                  disabled={isCurrent || busy === plan.code}
                  onClick={() => choose(plan)}
                >
                  {busy === plan.code ? (
                    <Spinner className="size-4" />
                  ) : isCurrent ? (
                    "Mevcut planınız"
                  ) : (
                    <>
                      <TbArrowUp className="size-4" /> Bu plana geç
                    </>
                  )}
                </Button>
              </Card>
            );
          })}
        </div>
      </div>

      <Modal
        open={!!pending}
        onClose={() => !completing && setPending(null)}
        title="Ödeme (Test Modu)"
        className="max-w-md"
      >
        <div className="space-y-4">
          <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
            Gerçek kredi kartı tahsilatı henüz bağlı değil; bu ekran akışı denemek içindir.
          </div>
          <p className="text-sm text-gray-600 dark:text-dark-200">
            {pending?.planName} · Tutar:{" "}
            <b>{pending && money(Number(pending.intent.payment.amount))}</b>
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outlined" className="gap-1.5" disabled={completing} onClick={() => finishMock("fail")}>
              <TbX className="size-4" /> Başarısız
            </Button>
            <Button color="primary" className="gap-1.5" disabled={completing} onClick={() => finishMock("success")}>
              {completing ? <Spinner className="size-4" /> : <TbCheck className="size-4" />} Ödemeyi Onayla
            </Button>
          </div>
        </div>
      </Modal>
    </Page>
  );
}

function statusLabel(s: string) {
  return (
    { TRIAL: "Deneme", ACTIVE: "Aktif", PAST_DUE: "Ödeme bekliyor", CANCELED: "İptal (dönem sonu)", EXPIRED: "Süresi doldu" } as Record<string, string>
  )[s] ?? s;
}

function Feat({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2">
      <TbCheck className="size-4 shrink-0 text-success" /> {children}
    </li>
  );
}

function UsageBar({ d }: { d: DimStatus }) {
  const limit = d.limit ?? 0;
  const pct = limit > 0 ? Math.min(100, Math.round((d.usage / limit) * 100)) : 0;
  const color =
    d.state === "BLOCK" ? "bg-error" : d.state === "WARN" ? "bg-warning" : "bg-primary-500";
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500 dark:text-dark-300">{d.label}</span>
        <span className="font-semibold text-gray-700 dark:text-dark-100">
          {d.usage}
          {d.limit != null ? ` / ${d.limit}` : ""}
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-dark-700">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
