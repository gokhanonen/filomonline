import { useState, useEffect, useMemo } from "react";
import {
  DocumentTextIcon,
  BanknotesIcon,
  CalendarDaysIcon,
  UserIcon,
  PhoneIcon,
  ChatBubbleBottomCenterTextIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";

import { Modal } from "@/components/shared/Modal";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import { Button, Input, Select, Spinner } from "@/components/ui";
import {
  type Lead,
  createQuote,
  updateLead,
} from "@/services/crmService";
import { listVehicles } from "@/services/vehicleService";
import type { Vehicle } from "@/@types/vehicle";

interface Props {
  open: boolean;
  lead: Lead | null;
  onClose: () => void;
  onSuccess: () => void;
}

const getDefaultValidUntil = () => {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().split("T")[0];
};

export function KanbanQuoteModal({ open, lead, onClose, onSuccess }: Props) {
  const [stockVehicles, setStockVehicles] = useState<Vehicle[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);

  const [vehicleId, setVehicleId] = useState("");
  const [vehiclePrice, setVehiclePrice] = useState("");
  const [offeredPrice, setOfferedPrice] = useState("");
  const [paymentType, setPaymentType] = useState("Nakit");
  const [validUntil, setValidUntil] = useState(getDefaultValidUntil());
  const [terms, setTerms] = useState("Teklif 7 gün süreyle geçerlidir. Ekspertiz garantilidir.");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !lead) return;

    setPaymentType("Nakit");
    setValidUntil(getDefaultValidUntil());
    setTerms("Teklif 7 gün süreyle geçerlidir. Ekspertiz garantilidir.");
    setNotes("");

    const initialVehicleId = lead.interestedVehicles?.[0]?.vehicleId || "";
    setVehicleId(initialVehicleId);

    if (lead.budget) {
      setOfferedPrice(String(lead.budget));
    } else {
      setOfferedPrice("");
    }
    setVehiclePrice("");

    setLoadingVehicles(true);
    listVehicles({ status: "STOKTA", pageSize: 100 })
      .then((res) => {
        const items = res.items || [];
        setStockVehicles(items);
        
        const targetVId = initialVehicleId || (items.length > 0 ? items[0].id : "");
        if (targetVId) {
          setVehicleId(targetVId);
          const found = items.find((v) => v.id === targetVId);
          const pr = found?.saleAmount ?? found?.listPrice;
          if (pr) {
            setVehiclePrice(String(pr));
            if (!lead.budget) setOfferedPrice(String(pr));
          }
        }
      })
      .catch(() => {
        setStockVehicles([]);
      })
      .finally(() => {
        setLoadingVehicles(false);
      });
  }, [open, lead]);

  const vehicleOptions = useMemo(() => {
    const interestedIds = new Set(lead?.interestedVehicles?.map((iv) => iv.vehicleId) || []);
    const options: { value: string; label: string; subLabel?: string }[] = [];

    lead?.interestedVehicles?.forEach((iv) => {
      if (iv.vehicle) {
        options.push({
          value: iv.vehicleId,
          label: `⭐ ${iv.vehicle.plate || "Plakasız"} · ${iv.vehicle.brandName || ""} ${iv.vehicle.modelName || ""}`,
          subLabel: "Müşterinin İlgilendiği Araç",
        });
      }
    });

    stockVehicles.forEach((v) => {
      if (!interestedIds.has(v.id)) {
        options.push({
          value: v.id,
          label: `${v.plate || "Plakasız"} · ${v.brandName || ""} ${v.modelName || ""}`,
          subLabel: v.saleAmount ? `${Number(v.saleAmount).toLocaleString("tr-TR")} TL` : undefined,
        });
      }
    });

    return options;
  }, [lead, stockVehicles]);

  const handleVehicleSelect = (vId: string) => {
    setVehicleId(vId);
    const found = stockVehicles.find((v) => v.id === vId);
    const price = found?.saleAmount ?? found?.listPrice;
    if (price) {
      setVehiclePrice(String(price));
      if (!offeredPrice || offeredPrice === vehiclePrice) {
        setOfferedPrice(String(price));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead) return;

    if (!vehicleId) {
      toast.error("Lütfen teklif verilecek aracı seçin.");
      return;
    }
    if (!offeredPrice || Number(offeredPrice) <= 0) {
      toast.error("Lütfen geçerli bir teklif tutarı girin.");
      return;
    }

    setSaving(true);
    try {
      await createQuote({
        leadId: lead.id,
        vehicleId,
        vehiclePrice: Number(vehiclePrice) || Number(offeredPrice),
        offeredPrice: Number(offeredPrice),
        paymentType,
        validUntil: validUntil ? new Date(validUntil).toISOString() : undefined,
        terms: terms.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      await updateLead(lead.id, { status: "QUOTE_SENT" });

      toast.success(
        `${lead.fullName} için teklif hazırlandı ve "Teklif Verildi" aşamasına taşındı.`,
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ||
          "Teklif kaydedilemedi. Lütfen bilgileri kontrol edin.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (!open || !lead) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
            <DocumentTextIcon className="size-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-gray-900 dark:text-dark-50">
              Teklif Hazırla & Aşamaya Taşı
            </div>
            <div className="text-xs text-gray-500 dark:text-dark-300">
              Formu kaydettiğinizde müşteri otomatik olarak &quot;Teklif Verildi&quot; aşamasına taşınacaktır.
            </div>
          </div>
        </div>
      }
      className="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Potansiyel Müşteri Özeti */}
        <div className="flex items-center justify-between rounded-xl border border-gray-200/80 bg-gray-50/70 p-3 dark:border-dark-600 dark:bg-dark-800/80">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-full bg-purple-100 font-bold text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
              <UserIcon className="size-4.5" />
            </div>
            <div>
              <div className="text-xs font-bold text-gray-900 dark:text-dark-50">
                {lead.fullName}
              </div>
              <div className="flex items-center gap-2 text-tiny text-gray-500 dark:text-dark-300">
                {lead.phone && (
                  <span className="flex items-center gap-1 font-mono">
                    <PhoneIcon className="size-3" />
                    {lead.phone}
                  </span>
                )}
                {lead.budget && (
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    Bütçe: {Number(lead.budget).toLocaleString("tr-TR")} TL
                  </span>
                )}
              </div>
            </div>
          </div>
          <span className="rounded-full bg-purple-500/15 px-2.5 py-0.5 text-tiny font-bold text-purple-700 dark:bg-purple-500/20 dark:text-purple-300">
            Hedef: Teklif Verildi
          </span>
        </div>

        {/* Araç Seçimi & Liste Fiyatı */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SearchableSelect
            label="Teklif Verilecek Araç *"
            options={vehicleOptions}
            value={vehicleId}
            onChange={handleVehicleSelect}
            onClear={() => {
              setVehicleId("");
              setVehiclePrice("");
            }}
            placeholder={loadingVehicles ? "Araçlar yükleniyor..." : "Araç arayıp seçin..."}
            disabled={loadingVehicles}
          />
          <Input
            label="Liste Fiyatı (TL)"
            type="number"
            placeholder="Araç liste fiyatı"
            value={vehiclePrice}
            onChange={(e) => setVehiclePrice(e.target.value)}
            prefix={<BanknotesIcon className="size-4 text-gray-400" />}
          />
        </div>

        {/* Teklif Edilen Fiyat & Ödeme Türü */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            label="Teklif Edilen Fiyat (TL) *"
            type="number"
            placeholder="Örn: 1850000"
            value={offeredPrice}
            onChange={(e) => setOfferedPrice(e.target.value)}
            required
            prefix={<BanknotesIcon className="size-4 text-emerald-500" />}
          />
          <Select
            label="Ödeme Türü"
            value={paymentType}
            onChange={(e) => setPaymentType(e.target.value)}
            data={[
              { value: "Nakit", label: "Nakit Havale / EFT" },
              { value: "Banka Kredisi", label: "Banka Kredisi" },
              { value: "Takas + Nakit", label: "Takas + Nakit" },
              { value: "Kısmi Senet / Vadeli", label: "Kısmi Senet / Vadeli" },
            ]}
          />
        </div>

        {/* Geçerlilik Tarihi & Şartlar */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            label="Teklif Geçerlilik Tarihi"
            type="date"
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
            prefix={<CalendarDaysIcon className="size-4 text-gray-400" />}
          />
          <Input
            label="Özel Not (Opsiyonel)"
            placeholder="Müşteri talepleri vb."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            prefix={<ChatBubbleBottomCenterTextIcon className="size-4 text-gray-400" />}
          />
        </div>

        <div>
          <Input
            label="Şartlar & Koşullar"
            value={terms}
            onChange={(e) => setTerms(e.target.value)}
          />
        </div>

        {/* Aksiyon Butonları */}
        <div className="flex items-center justify-end gap-2.5 border-t border-gray-150 pt-3 dark:border-dark-600">
          <Button
            type="button"
            variant="outlined"
            onClick={onClose}
            disabled={saving}
            className="cursor-pointer"
          >
            Vazgeç
          </Button>
          <Button
            type="submit"
            color="primary"
            disabled={saving || !vehicleId || !offeredPrice}
            className="cursor-pointer min-w-36"
          >
            {saving ? (
              <span className="flex items-center gap-1.5">
                <Spinner className="size-4" />
                Kaydediliyor...
              </span>
            ) : (
              "Teklifi Kaydet & Taşı"
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
