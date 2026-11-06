import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  TbBolt,
  TbGift,
  TbWallet,
  TbShoppingCart,
  TbCheck,
  TbX,
  TbHistory,
} from "react-icons/tb";

import { Button, Card, Spinner } from "@/components/ui";
import { Modal } from "@/components/shared/Modal";
import { Page } from "@/components/shared/Page";
import {
  getWallet,
  getCreditPackages,
  getCreditTransactions,
  purchaseCredits,
  mockCompletePayment,
  type CreditWallet,
  type CreditPackage,
  type CreditTransaction,
  type PurchaseIntent,
} from "@/services/creditsService";

const money = (n: number | string, currency = "TRY") =>
  `${Number(n).toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ${currency === "TRY" ? "₺" : currency}`;
const num = (n: number) => Number(n).toLocaleString("tr-TR");

const TXN_META: Record<string, { label: string; cls: string }> = {
  GRANT: { label: "Aylık hediye", cls: "text-success" },
  PURCHASE: { label: "Satın alma", cls: "text-primary-600 dark:text-primary-400" },
  SPEND: { label: "Harcama", cls: "text-gray-700 dark:text-dark-100" },
  REFUND: { label: "İade", cls: "text-info" },
  EXPIRE: { label: "Süre doldu", cls: "text-warning" },
  ADJUST: { label: "Düzeltme", cls: "text-gray-500" },
};

export default function BillingPage() {
  const [wallet, setWallet] = useState<CreditWallet | null>(null);
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [txns, setTxns] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);
  const [pendingPayment, setPendingPayment] = useState<PurchaseIntent | null>(null);
  const [completing, setCompleting] = useState(false);

  const load = useCallback(async () => {
    try {
      const [w, p, t] = await Promise.all([
        getWallet(),
        getCreditPackages(),
        getCreditTransactions(),
      ]);
      setWallet(w);
      setPackages(p);
      setTxns(t);
    } catch {
      toast.error("Kontör bilgileri yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const startPurchase = async (pkg: CreditPackage) => {
    setBuying(pkg.id);
    try {
      const intent = await purchaseCredits(pkg.id);
      // Gerçek sağlayıcıda intent.redirectUrl'e yönlenirdik. Mock'ta onay modalı açıyoruz.
      setPendingPayment(intent);
    } catch {
      toast.error("Satın alma başlatılamadı.");
    } finally {
      setBuying(null);
    }
  };

  const finishMock = async (outcome: "success" | "fail") => {
    if (!pendingPayment) return;
    setCompleting(true);
    try {
      await mockCompletePayment(pendingPayment.payment.id, outcome);
      if (outcome === "success") toast.success("Kontör hesabınıza yüklendi!");
      else toast.info("Ödeme iptal edildi.");
      setPendingPayment(null);
      await load();
    } catch {
      toast.error("Ödeme tamamlanamadı.");
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center py-20">
        <Spinner className="size-7" />
      </div>
    );
  }

  return (
    <Page title="Kontör & Faturalandırma">
      <div className="mx-auto max-w-5xl space-y-6 p-4 sm:px-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-800 dark:text-dark-50">
            Kontör & Faturalandırma
          </h1>
          <p className="text-sm text-gray-500 dark:text-dark-300">
            AI işlemleri (ehliyet/ruhsat okuma, teklif mesajı, akıllı asistan) kontör harcar.
          </p>
        </div>

        {/* Bakiye */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="relative overflow-hidden p-5">
            <div className="absolute right-3 top-3 text-primary-500/20">
              <TbWallet className="size-12" />
            </div>
            <p className="text-xs font-medium uppercase text-gray-400">Toplam Kontör</p>
            <p className="mt-1 text-3xl font-bold text-gray-800 dark:text-dark-50">
              {num(wallet?.balance ?? 0)}
            </p>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-2 text-success">
              <TbGift className="size-5" />
              <p className="text-xs font-medium uppercase">Aylık Hediye (kalan)</p>
            </div>
            <p className="mt-1 text-2xl font-bold text-gray-800 dark:text-dark-50">
              {num(wallet?.freeBalance ?? 0)}
            </p>
            <p className="text-tiny text-gray-400">Ay sonunda sıfırlanır</p>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-2 text-primary-600 dark:text-primary-400">
              <TbBolt className="size-5" />
              <p className="text-xs font-medium uppercase">Satın Alınan (kalan)</p>
            </div>
            <p className="mt-1 text-2xl font-bold text-gray-800 dark:text-dark-50">
              {num(wallet?.paidBalance ?? 0)}
            </p>
            <p className="text-tiny text-gray-400">Süresiz — sıfırlanmaz</p>
          </Card>
        </div>

        {/* Paketler */}
        <div>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-dark-100">
            <TbShoppingCart className="size-4.5" /> Kontör Satın Al
          </h2>
          {packages.length === 0 ? (
            <Card className="p-6 text-center text-sm text-gray-400">
              Henüz satın alınabilir paket tanımlanmamış.
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {packages.map((pkg) => (
                <Card
                  key={pkg.id}
                  className="flex flex-col gap-3 p-5 transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div>
                    <p className="text-sm font-semibold text-gray-800 dark:text-dark-50">
                      {pkg.name}
                    </p>
                    <p className="mt-1 text-3xl font-bold text-primary-600 dark:text-primary-400">
                      {num(pkg.credits)}
                      <span className="ml-1 text-sm font-medium text-gray-400">kontör</span>
                    </p>
                  </div>
                  <div className="mt-auto flex items-center justify-between">
                    <span className="text-lg font-bold text-gray-800 dark:text-dark-50">
                      {money(pkg.price, pkg.currency)}
                    </span>
                    <Button
                      color="primary"
                      className="gap-1.5"
                      disabled={buying === pkg.id}
                      onClick={() => startPurchase(pkg)}
                    >
                      {buying === pkg.id ? (
                        <Spinner className="size-4" />
                      ) : (
                        <TbShoppingCart className="size-4" />
                      )}
                      Satın Al
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Hareketler */}
        <div>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-dark-100">
            <TbHistory className="size-4.5" /> Son Hareketler
          </h2>
          <Card className="divide-y divide-gray-100 dark:divide-dark-600">
            {txns.length === 0 ? (
              <p className="p-6 text-center text-sm text-gray-400">Henüz hareket yok.</p>
            ) : (
              txns.slice(0, 30).map((t) => {
                const meta = TXN_META[t.type] ?? { label: t.type, cls: "" };
                return (
                  <div key={t.id} className="flex items-center justify-between px-4 py-2.5">
                    <div className="min-w-0">
                      <p className={`text-sm font-medium ${meta.cls}`}>{meta.label}</p>
                      <p className="truncate text-tiny text-gray-400">
                        {t.operation || t.note || "—"} ·{" "}
                        {new Date(t.createdAt).toLocaleString("tr-TR")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-sm font-bold ${t.amount >= 0 ? "text-success" : "text-gray-700 dark:text-dark-100"}`}
                      >
                        {t.amount >= 0 ? "+" : ""}
                        {num(t.amount)}
                      </p>
                      <p className="text-tiny text-gray-400">bakiye {num(t.balanceAfter)}</p>
                    </div>
                  </div>
                );
              })
            )}
          </Card>
        </div>
      </div>

      {/* Mock ödeme onay modalı (gerçek sağlayıcıda 3DS sayfasına yönlenir) */}
      <Modal
        open={!!pendingPayment}
        onClose={() => !completing && setPendingPayment(null)}
        title="Ödeme (Test Modu)"
        className="max-w-md"
      >
        <div className="space-y-4">
          <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
            Gerçek kredi kartı tahsilat sağlayıcısı henüz bağlı değil. Bu ekran akışı
            denemek içindir; gerçek çekim yapılmaz.
          </div>
          <p className="text-sm text-gray-600 dark:text-dark-200">
            Tutar: <b>{pendingPayment && money(pendingPayment.payment.amount)}</b>
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="outlined"
              className="gap-1.5"
              disabled={completing}
              onClick={() => finishMock("fail")}
            >
              <TbX className="size-4" /> Başarısız
            </Button>
            <Button
              color="primary"
              className="gap-1.5"
              disabled={completing}
              onClick={() => finishMock("success")}
            >
              {completing ? <Spinner className="size-4" /> : <TbCheck className="size-4" />}
              Ödemeyi Onayla
            </Button>
          </div>
        </div>
      </Modal>
    </Page>
  );
}
