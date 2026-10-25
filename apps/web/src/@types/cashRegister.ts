export type CashRegisterType = "CASH" | "BANK" | "POS";
export type CashTransactionType = "COLLECTION" | "PAYMENT" | "TRANSFER";

export interface CashRegister {
  id: string;
  companyId: string;
  name: string;
  type: CashRegisterType;
  currency: string;
  locationId?: string | null;
  erpCode?: string | null;
  bankName?: string | null;
  branchName?: string | null;
  iban?: string | null;
  accountNumber?: string | null;
  openingBalance: number;
  totalIn: number;
  totalOut: number;
  balance: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CashTransaction {
  id: string;
  companyId: string;
  cashRegisterId: string;
  type: CashTransactionType;
  amount: number;
  date: string;
  description?: string | null;
  documentNo?: string | null;
  accountId?: string | null;
  invoiceType?: string | null;
  invoiceId?: string | null;
  vehicleId?: string | null;
  targetRegisterId?: string | null;
  createdAt: string;
  cashRegister?: {
    id: string;
    name: string;
    type: CashRegisterType;
    bankName?: string | null;
  };
  targetRegister?: {
    id: string;
    name: string;
    type: CashRegisterType;
    bankName?: string | null;
  } | null;
  account?: {
    id: string;
    name: string;
    type: string;
  } | null;
  vehicle?: {
    id: string;
    plate: string;
    brandName?: string | null;
    modelName?: string | null;
  } | null;
}

export interface CashSummary {
  totalCash: number;
  totalBank: number;
  totalPos: number;
  grandTotal: number;
  monthCollection: number;
  monthPayment: number;
  activeAccountsCount: number;
}
