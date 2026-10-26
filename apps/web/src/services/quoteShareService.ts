import axios from "@/utils/axios";

export type QuoteOptionType = "CASH" | "LOAN" | "TRADE_IN" | "INSTALLMENT";

export interface QuoteOptionInput {
  type: QuoteOptionType;
  label?: string;
  price: number;
  downPayment?: number;
  tradeInValue?: number;
  tradeInNote?: string;
  installmentCount?: number;
  monthlyPayment?: number;
  interestRate?: number;
  note?: string;
}

export interface QuickQuoteInput {
  vehicleId: string;
  leadId?: string;
  newLead?: { fullName: string; phone?: string; email?: string };
  offeredPrice: number;
  validUntil: string;
  terms?: string;
  notes?: string;
  options: QuoteOptionInput[];
  share?: boolean;
}

export interface SharedQuote {
  id: string;
  leadId: string;
  quoteNumber: string;
  status: "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED" | "EXPIRED";
  vehiclePrice: number;
  offeredPrice: number;
  discountAmount: number;
  validUntil: string | null;
  shareToken: string | null;
  sharePath: string | null;
  viewCount: number;
  lastViewedAt: string | null;
  customerResponse: "ACCEPTED" | "CALLBACK" | null;
  lead: { id: string; fullName: string; phone: string | null; email: string | null };
  vehicle: { id: string; plate: string; brandName: string | null; modelName: string | null; year: number | null; listPrice: number | null };
  options: (Required<Pick<QuoteOptionInput, "type">> & {
    id: string;
    label: string;
    price: number;
    downPayment: number | null;
    tradeInValue: number | null;
    tradeInNote: string | null;
    installmentCount: number | null;
    monthlyPayment: number | null;
    interestRate: number | null;
    note: string | null;
  })[];
}

export async function createQuickQuote(input: QuickQuoteInput): Promise<SharedQuote> {
  const { data } = await axios.post<SharedQuote>("/crm/quotes/quick", input);
  return data;
}

export async function shareQuote(id: string): Promise<SharedQuote> {
  const { data } = await axios.post<SharedQuote>(`/crm/quotes/${id}/share`);
  return data;
}

export async function revokeQuoteLink(id: string): Promise<SharedQuote> {
  const { data } = await axios.delete<SharedQuote>(`/crm/quotes/${id}/share`);
  return data;
}

// ---- Herkese açık teklif sayfası ----

export interface PublicQuoteActive {
  status: "active";
  quote: {
    number: string;
    createdAt: string;
    validUntil: string | null;
    vehiclePrice: number;
    offeredPrice: number;
    discountAmount: number;
    terms: string | null;
    customerResponse: "ACCEPTED" | "CALLBACK" | null;
    customerRespondedAt: string | null;
    options: Omit<SharedQuote["options"][number], "id">[];
  };
  customer: { firstName: string };
  vehicle: {
    brandName: string | null;
    modelName: string | null;
    year: number | null;
    plate: string;
    km: number | null;
    fuelType: string | null;
    transmission: string | null;
    colorName: string | null;
    engineVolume: number | null;
    horsePower: number | null;
    listPrice: number | null;
    photos: { id: string; category: string; url: string | null; thumbUrl: string | null }[];
  };
  company: PublicCompany | null;
  salesRep: { name: string; phone: string | null; email: string | null } | null;
}

export interface PublicCompany {
  name: string;
  legalName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  logoUrl: string | null;
}

export interface PublicQuoteDisabled {
  status: "disabled";
  reason: "REVOKED" | "SOLD" | "CLOSED" | "EXPIRED";
  message: string;
  quoteNumber: string;
  vehicle: { brandName: string | null; modelName: string | null; year: number | null };
  company: PublicCompany | null;
}

export async function getPublicQuote(token: string): Promise<PublicQuoteActive | PublicQuoteDisabled> {
  const { data } = await axios.get<PublicQuoteActive | PublicQuoteDisabled>(`/public/quotes/${token}`);
  return data;
}

export async function respondPublicQuote(token: string, response: "ACCEPTED" | "CALLBACK", message?: string) {
  const { data } = await axios.post(`/public/quotes/${token}/respond`, { response, message });
  return data;
}

// ---- Yardımcılar ----

/** Eşit taksit (anüite); backend crm/quote-calc.ts ile aynı formül */
export function monthlyPayment(principal: number, monthlyRatePct: number, months: number) {
  if (principal <= 0 || months <= 0) return 0;
  const r = monthlyRatePct / 100;
  const v = r ? (principal * r) / (1 - Math.pow(1 + r, -months)) : principal / months;
  return Math.round(v * 100) / 100;
}

/** 0532 111 22 33 → 905321112233 (wa.me için) */
export function waPhone(phone?: string | null) {
  const d = (phone ?? "").replace(/\D/g, "");
  if (!d) return null;
  if (d.startsWith("90") && d.length === 12) return d;
  if (d.startsWith("0") && d.length === 11) return `9${d}`;
  if (d.length === 10) return `90${d}`;
  return d;
}

/** Teklif linkini sunucudan (platform SMTP) e-postayla gönderir; `to` boşsa potansiyelin e-postası */
export async function emailQuote(id: string, to?: string): Promise<SharedQuote & { emailedTo: string }> {
  const { data } = await axios.post<SharedQuote & { emailedTo: string }>(`/crm/quotes/${id}/email`, { to: to || undefined });
  return data;
}
