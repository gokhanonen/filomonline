export type FinanceAccountType = "CASH" | "BANK" | "POS" | "CREDIT_CARD";
export type FinanceModule = FinanceAccountType | "CHEQUE";
export type FinanceDirection = "IN" | "OUT";
export type Currency = "TRY" | "EUR" | "USD" | "GBP";

export type FinanceMovementType =
  | "COLLECTION"
  | "PAYMENT"
  | "TRANSFER"
  | "POS_COLLECTION"
  | "POS_SETTLEMENT"
  | "COMMISSION"
  | "CARD_EXPENSE"
  | "CARD_PAYMENT"
  | "CHEQUE_RECEIVED"
  | "CHEQUE_ENDORSED"
  | "CHEQUE_COLLECTED"
  | "CHEQUE_BOUNCED"
  | "CHEQUE_ISSUED"
  | "CHEQUE_PAID";

export type ChequeKind = "CHEQUE" | "NOTE";
export type ChequeDirection = "RECEIVED" | "ISSUED";
export type ChequeStatus =
  | "PORTFOLIO"
  | "IN_COLLECTION"
  | "ENDORSED"
  | "COLLECTED"
  | "BOUNCED"
  | "RETURNED"
  | "ISSUED"
  | "PAID";

export type FinanceInvoiceType = "SALES" | "PURCHASE" | "RENTAL" | "EXPENSE";
export type InvoiceSide = "RECEIVABLE" | "PAYABLE";
export type AgingBucket = "NOT_DUE" | "D0_30" | "D31_60" | "D61_90" | "D90_PLUS";

/** Kasa / Banka / POS / Kredi kartı — bakiyeleriyle */
export interface FinanceAccount {
  id: string;
  name: string;
  type: FinanceAccountType;
  currency: Currency;
  locationId: string | null;
  erpCode: string | null;
  bankName: string | null;
  branchName: string | null;
  iban: string | null;
  accountNumber: string | null;
  openingBalance: number;
  linkedBankId: string | null;
  linkedBank: { id: string; name: string } | null;
  commissionRate: number | null;
  valorDays: number | null;
  cardLastFour: string | null;
  creditLimit: number | null;
  statementDay: number | null;
  paymentDueDay: number | null;
  isActive: boolean;
  totalIn: number;
  totalOut: number;
  /** opening + giriş − çıkış (hesabın dövizinde). KK'da negatif = borç */
  balance: number;
  pendingPos: number;
  cardDebt: number | null;
  availableLimit: number | null;
  period: { start: string; end: string; dueDate: string | null; spend: number } | null;
}

export type FinanceAccountPayload = Partial<
  Pick<
    FinanceAccount,
    | "name"
    | "type"
    | "currency"
    | "locationId"
    | "erpCode"
    | "bankName"
    | "branchName"
    | "iban"
    | "accountNumber"
    | "openingBalance"
    | "linkedBankId"
    | "commissionRate"
    | "valorDays"
    | "cardLastFour"
    | "creditLimit"
    | "statementDay"
    | "paymentDueDay"
    | "isActive"
  >
>;

export interface FinanceMovement {
  id: string;
  groupId: string;
  date: string;
  type: FinanceMovementType;
  module: FinanceModule;
  direction: FinanceDirection;
  cashRegisterId: string | null;
  chequeId: string | null;
  amount: number;
  currency: Currency;
  exchangeRate: number;
  amountTry: number;
  accountId: string | null;
  vehicleId: string | null;
  valueDate: string | null;
  settled: boolean;
  settlementId: string | null;
  documentNo: string | null;
  description: string | null;
  createdAt: string;
  cashRegister: { id: string; name: string; type: FinanceAccountType; bankName: string | null; currency: Currency } | null;
  cheque: { id: string; serialNo: string; kind: ChequeKind; direction: ChequeDirection; status: ChequeStatus; dueDate: string } | null;
  allocations: { invoiceType: FinanceInvoiceType; invoiceId: string; amount: number }[];
  account: { id: string; name: string } | null;
  vehicle: { id: string; plate: string } | null;
}

export interface Cheque {
  id: string;
  kind: ChequeKind;
  direction: ChequeDirection;
  status: ChequeStatus;
  serialNo: string;
  bankName: string | null;
  branchName: string | null;
  drawer: string | null;
  issueDate: string | null;
  dueDate: string;
  amount: number;
  currency: Currency;
  accountId: string | null;
  holderAccountId: string | null;
  bankRegisterId: string | null;
  description: string | null;
  createdAt: string;
  account: { id: string; name: string } | null;
  holder: { id: string; name: string } | null;
  bankRegister: { id: string; name: string } | null;
  /** Açık çeklerde vadeye kalan gün (negatif = vadesi geçmiş) */
  daysToDue: number | null;
}

export interface OpenInvoice {
  invoiceType: FinanceInvoiceType;
  invoiceId: string;
  side: InvoiceSide;
  invoiceNo: string | null;
  date: string;
  dueDate: string;
  total: number;
  paid: number;
  open: number;
  daysOverdue: number;
  bucket: AgingBucket;
  accountId: string;
  accountName: string | null;
  vehicleId: string | null;
  vehiclePlate: string | null;
}

export interface AgingRow {
  accountId: string;
  accountName: string | null;
  total: number;
  overdue: number;
  buckets: Record<AgingBucket, number>;
}

export interface AgingReport {
  side: InvoiceSide;
  totals: { total: number; overdue: number; buckets: Record<AgingBucket, number> };
  accounts: AgingRow[];
}

export interface StatementRow {
  id: string;
  date: string;
  kind: "INVOICE" | "MOVEMENT";
  type: string;
  documentNo: string | null;
  description: string;
  vehiclePlate: string | null;
  debit: number;
  credit: number;
  currency: Currency | null;
  foreignAmount: number | null;
  groupId: string | null;
  link: string | null;
  balance: number;
}

export interface Statement {
  account: {
    id: string;
    name: string;
    type: string;
    ledgerCode: "L120" | "L320" | "L329" | null;
    phone: string | null;
    email: string | null;
    taxNumber: string | null;
    tckn: string | null;
    taxOffice: string | null;
  };
  from: string | null;
  to: string | null;
  opening: number;
  totals: { debit: number; credit: number; balance: number };
  rows: StatementRow[];
}

export interface FinanceSummary {
  balances: Record<FinanceAccountType, Partial<Record<Currency, number>>>;
  posPending: number;
  cardDebt: number;
  monthCollection: number;
  monthPayment: number;
  chequesReceived: { count: number; byCurrency: Partial<Record<Currency, number>> };
  chequesIssued: { count: number; byCurrency: Partial<Record<Currency, number>> };
  receivable: { total: number; overdue: number; buckets: Record<AgingBucket, number> };
  payable: { total: number; overdue: number; buckets: Record<AgingBucket, number> };
}

export interface FxRates {
  date: string | null;
  rates: { code: Currency; name: string; buying: number; selling: number }[];
}

export interface AllocationInput {
  invoiceType: FinanceInvoiceType;
  invoiceId: string;
  amount: number;
}

export interface NewChequeInput {
  kind?: ChequeKind;
  serialNo: string;
  bankName?: string;
  branchName?: string;
  drawer?: string;
  issueDate?: string;
  dueDate: string;
  currency?: Currency;
  bankRegisterId?: string;
}

interface OperationBase {
  date: string;
  amount: number;
  exchangeRate?: number;
  documentNo?: string;
  description?: string;
  vehicleId?: string;
  allocations?: AllocationInput[];
  autoAllocate?: boolean;
}

export interface CollectionInput extends OperationBase {
  accountId: string;
  module: "CASH" | "BANK" | "POS" | "CHEQUE";
  cashRegisterId?: string;
  cheque?: NewChequeInput;
}

export interface PaymentInput extends OperationBase {
  accountId?: string;
  module: "CASH" | "BANK" | "CREDIT_CARD" | "CHEQUE";
  cashRegisterId?: string;
  cheque?: NewChequeInput;
  endorseChequeId?: string;
}

export interface TransferInput {
  date: string;
  fromId: string;
  toId: string;
  amount: number;
  toAmount?: number;
  exchangeRate?: number;
  toExchangeRate?: number;
  documentNo?: string;
  description?: string;
}

export interface PosSettlementInput {
  posId: string;
  movementIds: string[];
  date: string;
  commission?: number;
  bankId?: string;
  description?: string;
}

export interface OperationResult {
  groupId: string;
  movements: FinanceMovement[];
}

// ---- Birleşik akış (hareketler + faturalar + masraflar) ----

export type LedgerKind = "MOVEMENT" | "SALES" | "PURCHASE" | "RENTAL" | "EXPENSE";
export type LedgerFlow = "IN" | "OUT" | "TRANSFER" | "RECEIVABLE" | "PAYABLE";
export type LedgerView = "ALL" | "IN" | "OUT" | "TRANSFER" | "SALES" | "PURCHASE" | "EXPENSE";

export interface LedgerRow {
  key: string;
  kind: LedgerKind;
  flow: LedgerFlow;
  date: string;
  /** TL karşılığı */
  amount: number;
  currency: Currency;
  foreignAmount: number | null;
  documentNo: string | null;
  description: string | null;
  accountId: string | null;
  accountName: string | null;
  vehicleId: string | null;
  vehiclePlate: string | null;
  groupId?: string;
  movementType?: FinanceMovementType;
  legs?: { module: FinanceModule; direction: FinanceDirection; name: string; amount: number; currency: Currency }[];
  cheque?: { id: string; serialNo: string; kind: ChequeKind; status: ChequeStatus; dueDate: string } | null;
  recordId?: string;
  dueDate?: string;
  total?: number;
  paid?: number;
  open?: number;
  integrationStatus?: string | null;
  expenseCategory?: string | null;
}

export interface LedgerTotals {
  cashIn: number;
  cashOut: number;
  sales: number;
  purchases: number;
  expenses: number;
}

export interface LedgerPage {
  items: LedgerRow[];
  total: number;
  page: number;
  pageSize: number;
  totals: LedgerTotals;
}

export interface FinanceDashboard {
  summary: FinanceSummary;
  accounts: {
    id: string;
    name: string;
    type: FinanceAccountType;
    currency: Currency;
    bankName: string | null;
    balance: number;
    pendingPos: number;
    cardDebt: number | null;
    availableLimit: number | null;
    creditLimit: number | null;
    dueDate: string | null;
  }[];
  cashflow: { month: string; in: number; out: number }[];
  upcomingCheques: {
    id: string;
    kind: ChequeKind;
    direction: ChequeDirection;
    status: ChequeStatus;
    serialNo: string;
    dueDate: string;
    amount: number;
    currency: Currency;
    accountName: string | null;
  }[];
  topReceivables: AgingRow[];
  topPayables: AgingRow[];
  recent: LedgerRow[];
}
