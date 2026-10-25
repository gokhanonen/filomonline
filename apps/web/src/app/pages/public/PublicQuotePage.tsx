import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router";
import clsx from "clsx";
import {
  TbBrandWhatsapp,
  TbCalendar,
  TbCarOff,
  TbCircleCheck,
  TbClock,
  TbEngine,
  TbGasStation,
  TbManualGearbox,
  TbPalette,
  TbPhone,
  TbPrinter,
  TbRoad,
} from "react-icons/tb";

import { Spinner } from "@/components/ui";
import { FUEL_LABELS, TRANSMISSION_LABELS, type FuelType, type TransmissionType } from "@/@types/vehicle";
import {
  getPublicQuote,
  respondPublicQuote,
  waPhone,
  type PublicCompany,
  type PublicQuoteActive,
  type PublicQuoteDisabled,
} from "@/services/quoteShareService";

const tl = (n?: number | null) => `${Number(n ?? 0).toLocaleString("tr-TR", { maximumFractionDigits: 0 })} ₺`;
const day = (d?: string | null) => (d ? new Date(d).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" }) : "—");

/** Müşteriye özel teklif sayfası (giriş gerektirmez). ?print=1 → otomatik yazdır / PDF */
export default function PublicQuotePage() {
  const { token = "" } = useParams();
  const [params] = useSearchParams();
  const [data, setData] = useState<PublicQuoteActive | PublicQuoteDisabled | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    getPublicQuote(token)
      .then(setData)
      .catch(() => setNotFound(true));
  }, [token]);

  useEffect(() => {
    if (data?.status === "active") document.title = `Teklif ${data.quote.number} · ${data.company?.name ?? ""}`;
    if (data && params.get("print") === "1") {
      const t = setTimeout(() => window.print(), 900); // görseller yüklensin
      return () => clearTimeout(t);
    }
  }, [data, params]);

  if (notFound) return <Shell><DeadCard title="Teklif bulunamadı" message="Bağlantı hatalı ya da kaldırılmış olabilir." company={null} /></Shell>;
  if (!data) return <Shell><div className="flex justify-center py-32"><Spinner className="size-8" /></div></Shell>;
  if (data.status === "disabled") {
    return (
      <Shell>
        <DeadCard
          title={data.reason === "SOLD" ? "Bu araç satıldı" : data.reason === "EXPIRED" ? "Teklif süresi doldu" : "Teklif kapatıldı"}
          message={data.message}
          company={data.company}
          sub={[data.vehicle.brandName, data.vehicle.modelName, data.vehicle.year].filter(Boolean).join(" ")}
        />
      </Shell>
    );
  }
  return <Shell><ActiveQuote data={data} token={token} /></Shell>;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-100 text-gray-800 print:bg-white">
      <style>{"@page { size: A4; margin: 12mm; } @media print { .no-print { display: none !important; } }"}</style>
      <div className="mx-auto max-w-3xl px-4 py-6 sm:py-10 print:max-w-none print:p-0">{children}</div>
    </div>
  );
}

function CompanyHeader({ company }: { company: PublicCompany | null }) {
  if (!company) return null;
  return (
    <div className="flex items-center gap-3">
      {company.logoUrl ? (
        <img src={company.logoUrl} alt={company.name} className="h-11 w-auto max-w-32 object-contain" />
      ) : (
        <span className="flex size-11 items-center justify-center rounded-xl bg-gray-900 text-lg font-bold text-white">{company.name[0]}</span>
      )}
      <div className="min-w-0">
        <p className="truncate font-bold">{company.name}</p>
        {company.phone && <p className="text-xs text-gray-500">{company.phone}</p>}
      </div>
    </div>
  );
}

function DeadCard({ title, message, company, sub }: { title: string; message: string; company: PublicCompany | null; sub?: string }) {
  return (
    <div className="rounded-3xl bg-white p-8 text-center shadow-sm">
      <div className="mb-6 flex justify-center"><CompanyHeader company={company} /></div>
      <TbCarOff className="mx-auto size-14 text-gray-300" />
      <h1 className="mt-3 text-xl font-bold">{title}</h1>
      {sub && <p className="mt-1 text-sm text-gray-500">{sub}</p>}
      <p className="mx-auto mt-2 max-w-sm text-sm text-gray-500">{message}</p>
      {company?.phone && (
        <a href={`tel:${company.phone}`} className="mt-5 inline-flex items-center gap-2 rounded-full bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white">
          <TbPhone className="size-4" /> Benzer araçlar için arayın
        </a>
      )}
    </div>
  );
}

function ActiveQuote({ data, token }: { data: PublicQuoteActive; token: string }) {
  const { quote: q, vehicle: v, company, salesRep, customer } = data;
  const [photo, setPhoto] = useState(0);
  const [response, setResponse] = useState(q.customerResponse);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const photos = v.photos.filter((p) => p.url || p.thumbUrl);
  const title = [v.brandName, v.modelName].filter(Boolean).join(" ");
  const daysLeft = q.validUntil ? Math.ceil((new Date(q.validUntil).getTime() - Date.now()) / 86_400_000) : null;
  const contactPhone = salesRep?.phone || company?.phone;
  const wa = waPhone(contactPhone);

  const respond = async (r: "ACCEPTED" | "CALLBACK") => {
    setSending(true);
    try {
      await respondPublicQuote(token, r, message || undefined);
      setResponse(r);
    } catch (err) {
      alert((err as { message?: string })?.message ?? "Gönderilemedi, lütfen bizi arayın.");
    } finally {
      setSending(false);
    }
  };

  const specs: [React.ElementType, string, string | null][] = [
    [TbCalendar, "Model yılı", v.year ? String(v.year) : null],
    [TbRoad, "Kilometre", v.km != null ? `${v.km.toLocaleString("tr-TR")} km` : null],
    [TbGasStation, "Yakıt", v.fuelType ? FUEL_LABELS[v.fuelType as FuelType] ?? v.fuelType : null],
    [TbManualGearbox, "Vites", v.transmission ? TRANSMISSION_LABELS[v.transmission as TransmissionType] ?? v.transmission : null],
    [TbEngine, "Motor", [v.engineVolume ? `${v.engineVolume} cc` : null, v.horsePower ? `${v.horsePower} HP` : null].filter(Boolean).join(" · ") || null],
    [TbPalette, "Renk", v.colorName],
  ];

  return (
    <div className="space-y-4">
      {/* Başlık */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-white p-4 shadow-sm print:shadow-none">
        <CompanyHeader company={company} />
        <div className="text-right">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Size Özel Teklif</p>
          <p className="font-mono text-sm font-bold">{q.number}</p>
          <p className="text-xs text-gray-500">{day(q.createdAt)}</p>
        </div>
      </div>

      {/* Araç */}
      <div className="overflow-hidden rounded-3xl bg-white shadow-sm print:shadow-none">
        {photos.length > 0 && (
          <div>
            <img src={photos[photo].url ?? photos[photo].thumbUrl ?? ""} alt={title} className="aspect-[16/9] w-full object-cover print:aspect-[2/1]" />
            {photos.length > 1 && (
              <div className="no-print flex gap-1.5 overflow-x-auto p-2">
                {photos.map((p, i) => (
                  <button key={p.id} type="button" onClick={() => setPhoto(i)} className={clsx("shrink-0 overflow-hidden rounded-lg ring-2", i === photo ? "ring-gray-900" : "ring-transparent")}>
                    <img src={p.thumbUrl ?? p.url ?? ""} alt="" className="h-14 w-20 object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <div className="p-5">
          <p className="text-sm text-gray-500">Merhaba {customer.firstName},</p>
          <h1 className="mt-0.5 text-2xl font-bold">{title} {v.year ?? ""}</h1>
          <p className="font-mono text-sm text-gray-500">{v.plate}</p>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {specs.filter(([, , val]) => val).map(([Icon, label, val]) => (
              <div key={label} className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2">
                <Icon className="size-5 shrink-0 text-gray-400" />
                <div className="min-w-0">
                  <p className="text-[11px] text-gray-400">{label}</p>
                  <p className="truncate text-sm font-semibold">{val}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Fiyat */}
      <div className="rounded-3xl bg-gray-900 p-5 text-white print:border print:border-gray-300 print:bg-white print:text-gray-900">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-white/60 print:text-gray-500">Size özel fiyat</p>
            {q.discountAmount > 0 && <p className="text-sm text-white/50 line-through print:text-gray-400">{tl(q.vehiclePrice)}</p>}
            <p className="text-4xl font-bold tracking-tight">{tl(q.offeredPrice)}</p>
            {q.discountAmount > 0 && <p className="mt-1 text-sm font-semibold text-emerald-400 print:text-emerald-700">{tl(q.discountAmount)} indirim</p>}
          </div>
          {daysLeft !== null && (
            <div className={clsx("flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold", daysLeft <= 2 ? "bg-amber-400 text-gray-900" : "bg-white/10 print:bg-gray-100")}>
              <TbClock className="size-4" />
              {daysLeft <= 0 ? "Bugün son gün" : `${daysLeft} gün geçerli`} · {day(q.validUntil)}
            </div>
          )}
        </div>
      </div>

      {/* Ödeme seçenekleri */}
      <div className={clsx("grid gap-3", q.options.length > 1 && "sm:grid-cols-2")}>
        {q.options.map((o, i) => (
          <div key={i} className="rounded-3xl bg-white p-5 shadow-sm print:break-inside-avoid print:border print:border-gray-200 print:shadow-none">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{o.label}</p>
            <p className="mt-1 text-2xl font-bold">{tl(o.price)}</p>
            <dl className="mt-3 space-y-1.5 text-sm">
              {o.tradeInValue ? <Row k={`Takas${o.tradeInNote ? ` (${o.tradeInNote})` : ""}`} v={`− ${tl(o.tradeInValue)}`} /> : null}
              {o.downPayment ? <Row k="Peşinat" v={tl(o.downPayment)} /> : null}
              {o.installmentCount && o.monthlyPayment ? (
                <Row k={o.type === "LOAN" ? "Kredi" : "Taksit"} v={`${o.installmentCount} × ${tl(o.monthlyPayment)}`} strong />
              ) : null}
              {o.type === "LOAN" && o.interestRate ? <Row k="Aylık faiz" v={`%${o.interestRate.toLocaleString("tr-TR")}`} /> : null}
              {o.type === "TRADE_IN" && o.tradeInValue && !o.installmentCount ? (
                <Row k="Kalan ödeme" v={tl(o.price - o.tradeInValue - (o.downPayment ?? 0))} strong />
              ) : null}
            </dl>
            {o.note && <p className="mt-2 text-xs text-gray-500">{o.note}</p>}
          </div>
        ))}
      </div>

      {q.terms && (
        <div className="rounded-3xl bg-white p-5 shadow-sm print:shadow-none">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Koşullar</p>
          <p className="whitespace-pre-line text-sm text-gray-600">{q.terms}</p>
        </div>
      )}

      {/* Yanıt */}
      <div className="no-print rounded-3xl bg-white p-5 shadow-sm">
        {response ? (
          <div className="flex flex-col items-center gap-2 py-2 text-center">
            <TbCircleCheck className="size-10 text-emerald-500" />
            <p className="font-semibold">{response === "ACCEPTED" ? "Teklifi kabul ettiniz, teşekkürler!" : "Talebiniz alındı, sizi en kısa sürede arayacağız."}</p>
            <p className="text-sm text-gray-500">Satış danışmanınız sizinle iletişime geçecek.</p>
          </div>
        ) : (
          <>
            <p className="font-semibold">Teklif hakkında ne düşünüyorsunuz?</p>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={2}
              maxLength={500}
              placeholder="Notunuz (isteğe bağlı) — ör. uygun olduğunuz saat"
              className="mt-2 w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-900"
            />
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <button type="button" disabled={sending} onClick={() => respond("ACCEPTED")} className="rounded-full bg-emerald-600 px-5 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50">
                Teklifi kabul ediyorum
              </button>
              <button type="button" disabled={sending} onClick={() => respond("CALLBACK")} className="rounded-full border border-gray-300 px-5 py-3 font-semibold transition hover:bg-gray-50 disabled:opacity-50">
                Beni arayın
              </button>
            </div>
          </>
        )}
      </div>

      {/* İletişim */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-white p-4 shadow-sm print:shadow-none">
        <div className="text-sm">
          <p className="font-semibold">{salesRep?.name ?? company?.name}</p>
          <p className="text-gray-500">{[contactPhone, salesRep?.email ?? company?.email].filter(Boolean).join(" · ")}</p>
          {company?.address && <p className="text-xs text-gray-400">{company.address}</p>}
        </div>
        <div className="no-print flex gap-2">
          {contactPhone && (
            <a href={`tel:${contactPhone}`} className="flex size-11 items-center justify-center rounded-full bg-gray-100" aria-label="Ara">
              <TbPhone className="size-5" />
            </a>
          )}
          {wa && (
            <a href={`https://wa.me/${wa}?text=${encodeURIComponent(`Merhaba, ${q.number} numaralı teklif hakkında bilgi almak istiyorum.`)}`} target="_blank" rel="noopener noreferrer" className="flex size-11 items-center justify-center rounded-full bg-green-500 text-white" aria-label="WhatsApp">
              <TbBrandWhatsapp className="size-5" />
            </a>
          )}
          <button type="button" onClick={() => window.print()} className="flex size-11 items-center justify-center rounded-full bg-gray-100" aria-label="Yazdır / PDF">
            <TbPrinter className="size-5" />
          </button>
        </div>
      </div>

      <p className="pb-6 text-center text-[11px] text-gray-400">
        Bu teklif yalnızca size özeldir. Araç satıldığında ya da geçerlilik süresi dolduğunda bağlantı kapanır.
      </p>
    </div>
  );
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-gray-500">{k}</dt>
      <dd className={clsx("text-right", strong ? "font-bold" : "font-medium")}>{v}</dd>
    </div>
  );
}
