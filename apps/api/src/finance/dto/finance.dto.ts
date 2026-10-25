import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min,
  ValidateNested,
} from "class-validator";
import {
  CashRegisterType,
  ChequeDirection,
  ChequeKind,
  ChequeStatus,
  FinanceInvoiceType,
  FinanceModule,
  FinanceMovementType,
} from "@prisma/client";
import { PaginationDto } from "../../common/dto/pagination.dto";

export const CURRENCIES = ["TRY", "EUR", "USD", "GBP"] as const;

// ---- Finans hesapları (kasa/banka/POS/kredi kartı) ----

export class CreateFinanceAccountDto {
  @IsString() name: string;
  @IsEnum(CashRegisterType) type: CashRegisterType;
  @IsOptional() @IsIn(CURRENCIES) currency?: string;
  @IsOptional() @IsString() locationId?: string;
  @IsOptional() @IsString() erpCode?: string;
  @IsOptional() @IsString() bankName?: string;
  @IsOptional() @IsString() branchName?: string;
  @IsOptional() @IsString() iban?: string;
  @IsOptional() @IsString() accountNumber?: string;
  @IsOptional() @Type(() => Number) @IsNumber() openingBalance?: number;
  @IsOptional() @IsString() linkedBankId?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(100) commissionRate?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(90) valorDays?: number;
  @IsOptional() @IsString() cardLastFour?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) creditLimit?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(31) statementDay?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(31) paymentDueDay?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpdateFinanceAccountDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() locationId?: string;
  @IsOptional() @IsString() erpCode?: string;
  @IsOptional() @IsString() bankName?: string;
  @IsOptional() @IsString() branchName?: string;
  @IsOptional() @IsString() iban?: string;
  @IsOptional() @IsString() accountNumber?: string;
  @IsOptional() @Type(() => Number) @IsNumber() openingBalance?: number;
  @IsOptional() @IsString() linkedBankId?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(100) commissionRate?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(90) valorDays?: number;
  @IsOptional() @IsString() cardLastFour?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) creditLimit?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(31) statementDay?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(31) paymentDueDay?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

// ---- Ortak ----

export class AllocationDto {
  @IsEnum(FinanceInvoiceType) invoiceType: FinanceInvoiceType;
  @IsString() invoiceId: string;
  @Type(() => Number) @IsNumber() @IsPositive() amount: number;
}

class OperationBaseDto {
  @IsDateString() date: string;
  @Type(() => Number) @IsNumber() @IsPositive() amount: number;
  /** Ana kaydın dövizi TRY değilse TL kuru */
  @IsOptional() @Type(() => Number) @IsNumber() @IsPositive() exchangeRate?: number;
  @IsOptional() @IsString() documentNo?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() vehicleId?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(200) @ValidateNested({ each: true }) @Type(() => AllocationDto)
  allocations?: AllocationDto[];
  /** true → açık faturalara en eski vadeden otomatik dağıt (allocations yoksa) */
  @IsOptional() @IsBoolean() autoAllocate?: boolean;
}

export class NewChequeDto {
  @IsOptional() @IsEnum(ChequeKind) kind?: ChequeKind;
  @IsString() serialNo: string;
  @IsOptional() @IsString() bankName?: string;
  @IsOptional() @IsString() branchName?: string;
  @IsOptional() @IsString() drawer?: string;
  @IsOptional() @IsDateString() issueDate?: string;
  @IsDateString() dueDate: string;
  @IsOptional() @IsIn(CURRENCIES) currency?: string;
  /** Verilen çek: ödeneceği banka hesabı */
  @IsOptional() @IsString() bankRegisterId?: string;
}

/** Tahsilat: Kasa / Banka (havale) / POS / Çek-Senet */
export class CollectionDto extends OperationBaseDto {
  @IsString() accountId: string;
  @IsIn(["CASH", "BANK", "POS", "CHEQUE"]) module: FinanceModule;
  @IsOptional() @IsString() cashRegisterId?: string;
  @IsOptional() @ValidateNested() @Type(() => NewChequeDto) cheque?: NewChequeDto;
}

/** Ödeme: Kasa / Banka / Şirket kredi kartı / Çek-Senet (yeni çek ya da portföyden ciro) */
export class PaymentDto extends OperationBaseDto {
  @IsOptional() @IsString() accountId?: string;
  @IsIn(["CASH", "BANK", "CREDIT_CARD", "CHEQUE"]) module: FinanceModule;
  @IsOptional() @IsString() cashRegisterId?: string;
  @IsOptional() @ValidateNested() @Type(() => NewChequeDto) cheque?: NewChequeDto;
  /** Portföydeki alınan çeki ciro et */
  @IsOptional() @IsString() endorseChequeId?: string;
}

/** Virman / kredi kartı borç ödemesi (hedef KK ise) */
export class TransferDto {
  @IsDateString() date: string;
  @IsString() fromId: string;
  @IsString() toId: string;
  @Type(() => Number) @IsNumber() @IsPositive() amount: number;
  /** Dövizler farklıysa hedefe giren tutar */
  @IsOptional() @Type(() => Number) @IsNumber() @IsPositive() toAmount?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @IsPositive() exchangeRate?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @IsPositive() toExchangeRate?: number;
  @IsOptional() @IsString() documentNo?: string;
  @IsOptional() @IsString() description?: string;
}

export class PosSettlementDto {
  @IsString() posId: string;
  @IsArray() @ArrayMaxSize(1000) @IsString({ each: true }) movementIds: string[];
  @IsDateString() date: string;
  /** Bankanın kestiği gerçek toplam komisyon (yoksa orandan hesaplanır) */
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) commission?: number;
  @IsOptional() @IsString() bankId?: string;
  @IsOptional() @IsString() description?: string;
}

export class ChequeDepositDto {
  @IsString() bankRegisterId: string;
}

export class ChequeCollectDto {
  @IsDateString() date: string;
  /** Tahsilatın girdiği kasa/banka (alınan çek) ya da ödendiği banka (verilen çek) */
  @IsOptional() @IsString() cashRegisterId?: string;
  @IsOptional() @IsString() description?: string;
}

export class ChequeBounceDto {
  @IsDateString() date: string;
  @IsIn(["BOUNCED", "RETURNED"]) status: ChequeStatus;
  @IsOptional() @IsString() description?: string;
}

// ---- Sorgular ----

export class QueryMovementsDto extends PaginationDto {
  @IsOptional() @IsString() cashRegisterId?: string;
  @IsOptional() @IsString() chequeId?: string;
  @IsOptional() @IsString() accountId?: string;
  @IsOptional() @IsEnum(FinanceModule) module?: FinanceModule;
  @IsOptional() @IsEnum(FinanceMovementType) type?: FinanceMovementType;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
  /** POS: yalnızca bankaya aktarılmamış tahsilatlar */
  @IsOptional() @IsIn(["true", "false"]) unsettled?: string;
}

export class QueryChequesDto extends PaginationDto {
  @IsOptional() @IsEnum(ChequeDirection) direction?: ChequeDirection;
  @IsOptional() @IsEnum(ChequeStatus) status?: ChequeStatus;
  @IsOptional() @IsString() accountId?: string;
  @IsOptional() @IsDateString() dueFrom?: string;
  @IsOptional() @IsDateString() dueTo?: string;
}

export class QueryStatementDto {
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
}

export class QueryOpenInvoicesDto {
  @IsOptional() @IsString() accountId?: string;
  @IsOptional() @IsIn(["RECEIVABLE", "PAYABLE"]) side?: "RECEIVABLE" | "PAYABLE";
  @IsOptional() @IsIn(["true", "false"]) overdue?: string;
}

export class QueryLedgerDto extends PaginationDto {
  /** Sekme: ALL | IN | OUT | TRANSFER | SALES | PURCHASE | EXPENSE */
  @IsOptional() @IsIn(["ALL", "IN", "OUT", "TRANSFER", "SALES", "PURCHASE", "EXPENSE"]) view?: string;
  @IsOptional() @IsString() accountId?: string;
  @IsOptional() @IsString() cashRegisterId?: string;
  @IsOptional() @IsString() chequeId?: string;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
}
