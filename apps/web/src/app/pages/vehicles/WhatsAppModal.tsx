import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { TbBrandWhatsapp } from "react-icons/tb";

import { Button, Input, Select, Textarea } from "@/components/ui";
import { Modal } from "@/components/shared/Modal";
import type { Account } from "@/@types/account";
import {
  FUEL_LABELS,
  TRANSMISSION_LABELS,
  VEHICLE_STATUS_LABELS,
  type Vehicle,
} from "@/@types/vehicle";
import { listAccounts } from "@/services/accountService";
import { getVehicle } from "@/services/vehicleService";

interface Props {
  open: boolean;
  onClose: () => void;
  vehicle: Vehicle | null;
}

/** "0532 123 45 67" / "532..." / "+90..." → "905321234567" */
export function normalizePhone(raw: string): string {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length === 11 && d.startsWith("0")) d = "90" + d.slice(1);
  if (d.length === 10 && d.startsWith("5")) d = "90" + d;
  return d;
}

/** Eski projedeki WhatsApp paylaşım metninin aynısı (araç bilgileri + ilan linki). */
export function buildWhatsAppMessage(v: Vehicle): string {
  const money = (x?: string | null) =>
    x ? Number(x).toLocaleString("tr-TR", { maximumFractionDigits: 0 }) : "0";
  const tramer =
    v.tramerSet && v.tramerSet.length > 0
      ? `Tramer: ${v.tramerSet.map((t) => `${money(t.amount)} TL`).join(" + ")}`
      : "Tramer: Yok";
  const tech = [
    v.year ? `Yıl: ${v.year}` : null,
    v.fuelType ? `Yakıt: ${FUEL_LABELS[v.fuelType]}` : null,
    v.transmission ? `Vites: ${TRANSMISSION_LABELS[v.transmission]}` : null,
    v.horsePower ? `Motor Gücü: ${v.horsePower} HP` : null,
    v.engineVolume ? `Motor Hacmi: ${v.engineVolume} cc` : null,
  ]
    .filter(Boolean)
    .join("\n");
  const warranty = v.warranty ? "\nGaranti: Garanti Dahilinde" : "";
  const link = v.listingUrls?.[0] ? `\n\nİlan Linki: ${v.listingUrls[0].url}` : "";
  const name = [v.brandName, v.modelName].filter(Boolean).join(" ");

  return `Merhaba, ${name} (${v.plate}) aracı hakkında bilgi vermek isterim.

Fiyat: ${money(v.listPrice)} TL
KM: ${v.km != null ? v.km.toLocaleString("tr-TR") : "—"}
Durum: ${VEHICLE_STATUS_LABELS[v.status]}
${tramer}

${tech}
Yedek Anahtar: ${v.spareKey ? "Var" : "Yok"}${warranty}${link}`;
}

/** Araç bilgisini WhatsApp üzerinden müşteriye gönderir (wa.me). */
export function WhatsAppModal({ open, onClose, vehicle }: Props) {
  const [full, setFull] = useState<Vehicle | null>(null);
  const [customers, setCustomers] = useState<Account[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!open || !vehicle) return;
    setCustomerId("");
    setPhone("");
    setFull(vehicle);
    setMessage(buildWhatsAppMessage(vehicle));
    // Tramer + güncel ilan linkleri için tam kaydı çek
    getVehicle(vehicle.id)
      .then((v) => {
        setFull(v);
        setMessage(buildWhatsAppMessage(v));
      })
      .catch(() => void 0);
    listAccounts({ type: "CUSTOMER", onlyActive: true, pageSize: 300 })
      .then((r) => setCustomers(r.items.filter((a) => !!a.phone)))
      .catch(() => void 0);
  }, [open, vehicle]);

  const customerOpts = useMemo(
    () => [
      { value: "", label: "Müşteri seç (telefonu olanlar)" },
      ...customers.map((c) => ({ value: c.id, label: `${c.name} — ${c.phone}` })),
    ],
    [customers],
  );

  const pickCustomer = (id: string) => {
    setCustomerId(id);
    const c = customers.find((x) => x.id === id);
    if (c?.phone) setPhone(c.phone);
  };

  const number = normalizePhone(phone);
  const valid = number.length >= 11;

  const send = () => {
    if (!valid) {
      toast.error("Geçerli bir telefon numarası girin (örn. 0532 123 45 67)");
      return;
    }
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(message)}`, "_blank", "noopener");
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <TbBrandWhatsapp className="size-5 text-green-500" />
          WhatsApp ile Paylaş
          {full && <span className="text-sm font-normal text-gray-400">— {full.plate}</span>}
        </span>
      }
      className="max-w-xl"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select label="Müşteri" data={customerOpts} value={customerId} onChange={(e) => pickCustomer(e.target.value)} />
          <Input
            label="Telefon *"
            placeholder="0532 123 45 67"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
          />
        </div>

        <Textarea
          label="Mesaj"
          rows={12}
          value={message}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMessage(e.target.value)}
          classNames={{ input: "font-mono text-xs" }}
        />

        <div className="flex items-center justify-between gap-3 pt-1">
          <span className="text-xs text-gray-400">
            {valid ? `+${number} numarasına gönderilecek` : "Numara girin veya müşteri seçin"}
          </span>
          <div className="flex gap-3">
            <Button variant="outlined" onClick={onClose}>Vazgeç</Button>
            <Button color="success" onClick={send} disabled={!valid} className="gap-2">
              <TbBrandWhatsapp className="size-5" /> WhatsApp'ta Aç
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
