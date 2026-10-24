import axios from "@/utils/axios";
import type { Paginated } from "@/@types/common";
import type {
  IntegrationStatus,
  InvoiceRow,
  InvoiceType,
  PurchaseInvoiceForm,
  SalesInvoiceForm,
} from "@/@types/invoice";

export interface ListInvoicesParams {
  page?: number;
  pageSize?: number;
  type?: InvoiceType;
  vehicleId?: string;
}

export async function listInvoices(
  params: ListInvoicesParams = {},
): Promise<Paginated<InvoiceRow>> {
  const { data } = await axios.get<Paginated<InvoiceRow>>("/invoices", { params });
  return data;
}

function clean(v: object) {
  const out: Record<string, unknown> = {};
  for (const [k, val] of Object.entries(v)) {
    if (val === "" || val === undefined || val === null) continue;
    if (typeof val === "number" && Number.isNaN(val)) continue;
    out[k] = val;
  }
  return out;
}

export async function createPurchaseInvoice(form: PurchaseInvoiceForm) {
  const { data } = await axios.post("/invoices/purchase", clean(form));
  return data;
}

export async function createSalesInvoice(form: SalesInvoiceForm) {
  const { data } = await axios.post("/invoices/sales", clean(form));
  return data;
}

export async function updateInvoiceStatus(
  type: InvoiceType,
  id: string,
  integrationStatus: IntegrationStatus,
) {
  await axios.patch(`/invoices/${type}/${id}/status`, { integrationStatus });
}
