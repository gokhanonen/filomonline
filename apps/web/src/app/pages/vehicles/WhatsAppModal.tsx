import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { TbBrandWhatsapp, TbLink } from "react-icons/tb";

import { Button, Input, Textarea } from "@/components/ui";
import { Modal } from "@/components/shared/Modal";
import { SearchableSelect, type SearchableOption } from "@/components/shared/SearchableSelect";
import type { Account } from "@/@types/account";
import {
  FUEL_LABELS,
  TRANSMISSION_LABELS,
  VEHICLE_STATUS_LABELS,
  type Vehicle,
} from "@/@types/vehicle";
import { listAccounts } from "@/services/accountService";
import { getVehicle, listListingUrls } from "@/services/vehicleService";

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

/** Araca ait ilk geçerli ilan linkini bulur (listingUrls dizisi veya doğrudan alanlar). */
export function findFirstListingUrl(v?: Partial<Vehicle> | null): string | null {
  if (!v) return null;
  // 1. listingUrls dizisi içinden ilk dolu URL
  if (Array.isArray(v.listingUrls) && v.listingUrls.length > 0) {
    for (const item of v.listingUrls) {
      if (typeof item === "string") {
        const s = (item as string).trim();
        if (s) return s;
      } else if (item && typeof item === "object") {
        const u = (item as { url?: string }).url;
        if (typeof u === "string" && u.trim()) return u.trim();
      }
    }
  }
  // 2. Olası doğrudan string alanlar
  const rec = v as Record<string, unknown>;
  for (const key of ["listingUrl", "ilanLinki", "ilanUrl", "link", "url"]) {
    const val = rec[key];
    if (typeof val === "string" && val.trim().startsWith("http")) {
      return val.trim();
    }
  }
  return null;
}

/** Eski projedeki WhatsApp paylaşım metninin aynısı (araç bilgileri + ilk bulunan ilan linki). */
export function buildWhatsAppMessage(v: Vehicle, overrideUrl?: string | null): string {
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
  const firstUrl = overrideUrl !== undefined ? overrideUrl : findFirstListingUrl(v);
  const link = firstUrl ? `\n\nİlan Linki: ${firstUrl}` : "";
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
  const [listingUrl, setListingUrl] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!open || !vehicle) return;
    setCustomerId("");
    setPhone("");
    setFull(vehicle);

    const initialUrl = findFirstListingUrl(vehicle) ?? "";
    setListingUrl(initialUrl);
    setMessage(buildWhatsAppMessage(vehicle, initialUrl || undefined));

    // Tramer + güncel ilan linklerini çek (aracın ilk ilan linkini garantiye al)
    Promise.all([
      getVehicle(vehicle.id).catch(() => null),
      listListingUrls(vehicle.id).catch(() => []),
    ]).then(([fullV, urls]) => {
      const mergedUrls =
        urls && urls.length > 0
          ? urls
          : fullV?.listingUrls ?? vehicle.listingUrls ?? [];
      const updatedVehicle: Vehicle = {
        ...(fullV ?? vehicle),
        listingUrls: mergedUrls,
      };
      setFull(updatedVehicle);

      const foundUrl = findFirstListingUrl(updatedVehicle) || initialUrl;
      setListingUrl(foundUrl);
      setMessage(buildWhatsAppMessage(updatedVehicle, foundUrl || undefined));
    });

    listAccounts({ type: "CUSTOMER", onlyActive: true, pageSize: 300 })
      .then((r) => setCustomers(r.items.filter((a) => !!a.phone)))
      .catch(() => void 0);
  }, [open, vehicle]);

  const customerOptions: SearchableOption[] = useMemo(
    () =>
      customers.map((c) => ({
        value: c.id,
        label: c.name,
        subLabel: c.phone ?? undefined,
        badge: c.entityType === "CORPORATE" ? "Firma" : undefined,
      })),
    [customers],
  );

  const pickCustomer = (id: string) => {
    setCustomerId(id);
    const c = customers.find((x) => x.id === id);
    if (c?.phone) setPhone(c.phone);
  };

  const handleUrlChange = (newUrl: string) => {
    setListingUrl(newUrl);
    const cur = full ?? vehicle;
    if (cur) {
      setMessage(buildWhatsAppMessage(cur, newUrl.trim() || null));
    }
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
          <SearchableSelect
            label="Müşteri"
            placeholder="Müşteri ara (isim veya tel)..."
            options={customerOptions}
            value={customerId}
            onChange={(val) => pickCustomer(val)}
            onClear={() => {
              setCustomerId("");
              setPhone("");
            }}
          />
          <Input
            label="Telefon *"
            placeholder="0532 123 45 67"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
          />
        </div>

        <Input
          label="İlan Linki (İlk link otomatik eklenir)"
          placeholder="https://www.sahibinden.com/ilan/..."
          value={listingUrl}
          onChange={(e) => handleUrlChange(e.target.value)}
          prefix={<TbLink className="size-4 text-gray-400" />}
        />

        <Textarea
          label="Mesaj"
          rows={11}
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
