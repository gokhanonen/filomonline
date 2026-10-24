import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  TbBrandWhatsapp,
  TbCheck,
  TbCopy,
  TbExternalLink,
  TbLink,
  TbShieldCheck,
} from "react-icons/tb";

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
import {
  getOrCreateShareLink,
  getVehicle,
  listListingUrls,
} from "@/services/vehicleService";

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
  const [hidePlate, setHidePlate] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open || !vehicle) return;
    setCustomerId("");
    setPhone("");
    setHidePlate(false);
    setCopied(false);
    setFull(vehicle);

    // 1. FilomOnline dış paylaşım linkini çek / oluştur
    getOrCreateShareLink(vehicle.id, { hidePlate: false })
      .then((link) => {
        const pubUrl = `${window.location.origin}/v/${link.token}`;
        setListingUrl(pubUrl);
        setMessage(buildWhatsAppMessage(vehicle, pubUrl));
      })
      .catch(() => {
        const fallbackUrl = findFirstListingUrl(vehicle) ?? "";
        setListingUrl(fallbackUrl);
        setMessage(buildWhatsAppMessage(vehicle, fallbackUrl || undefined));
      });

    // Tramer + güncel ilan linklerini çek
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

  const handleToggleHidePlate = async (checked: boolean) => {
    setHidePlate(checked);
    if (!vehicle) return;
    try {
      const link = await getOrCreateShareLink(vehicle.id, { hidePlate: checked });
      const pubUrl = `${window.location.origin}/v/${link.token}`;
      setListingUrl(pubUrl);
      const cur = full ?? vehicle;
      if (cur) setMessage(buildWhatsAppMessage(cur, pubUrl));
    } catch {
      //
    }
  };

  const copyLink = () => {
    if (!listingUrl) return;
    navigator.clipboard.writeText(listingUrl);
    setCopied(true);
    toast.success("Dış paylaşım linki kopyalandı!");
    setTimeout(() => setCopied(false), 2000);
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
        {/* FilomOnline Dış Paylaşım Bağlantısı Kartı */}
        <div className="p-3.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/40">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
              <TbLink className="size-4 text-emerald-600" />
              FilomOnline Dış Paylaşım Linki (Login Gerektirmez)
            </span>
            <button
              type="button"
              onClick={copyLink}
              className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-900 dark:text-emerald-300 transition"
            >
              {copied ? <TbCheck className="size-3.5 text-emerald-600" /> : <TbCopy className="size-3.5" />}
              {copied ? "Kopyalandı" : "Linki Kopyala"}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={listingUrl}
              className="flex-1 text-xs font-mono py-1.5 px-3 rounded-lg border border-emerald-300/80 dark:border-emerald-700 bg-white dark:bg-dark-800 text-gray-800 dark:text-dark-100 select-all"
            />
            {listingUrl && (
              <a
                href={listingUrl}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 rounded-lg border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-dark-700 transition"
                title="Yeni Sekmede Aç"
              >
                <TbExternalLink className="size-4" />
              </a>
            )}
          </div>

          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-500 dark:text-dark-400">
            <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={hidePlate}
                onChange={(e) => handleToggleHidePlate(e.target.checked)}
                className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 size-3.5"
              />
              <span>Plakayı ilanda gizle/maskele (Örn. 34 *** 123)</span>
            </label>

            <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1 font-medium">
              <TbShieldCheck className="size-3.5" /> Araç satılınca link otomatik kapanır
            </span>
          </div>
        </div>

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
          label="İlan Linki (Harici ilan veya özel link)"
          placeholder="https://..."
          value={listingUrl}
          onChange={(e) => handleUrlChange(e.target.value)}
          prefix={<TbLink className="size-4 text-gray-400" />}
        />

        <Textarea
          label="Mesaj Metni"
          rows={9}
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
