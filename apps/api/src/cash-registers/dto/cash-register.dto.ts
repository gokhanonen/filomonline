import { Type } from "class-transformer";
import {
  IsBoolean,
  IsDate,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from "class-validator";
import { CashRegisterType, CashTransactionType } from "@prisma/client";
import { PaginationDto } from "../../common/dto/pagination.dto";

export class CreateCashRegisterDto {
  @IsString()
  name: string;

  @IsEnum(CashRegisterType)
  type: CashRegisterType;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  locationId?: string;

  @IsOptional()
  @IsString()
  erpCode?: string;

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  branchName?: string;

  @IsOptional()
  @IsString()
  iban?: string;

  @IsOptional()
  @IsString()
  accountNumber?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  openingBalance?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateCashRegisterDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(CashRegisterType)
  type?: CashRegisterType;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  locationId?: string;

  @IsOptional()
  @IsString()
  erpCode?: string;

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  branchName?: string;

  @IsOptional()
  @IsString()
  iban?: string;

  @IsOptional()
  @IsString()
  accountNumber?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  openingBalance?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateCashTransactionDto {
  @IsString()
  cashRegisterId: string;

  @IsEnum(CashTransactionType)
  type: CashTransactionType;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  date?: Date;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  documentNo?: string;

  @IsOptional()
  @IsString()
  accountId?: string;

  @IsOptional()
  @IsString()
  invoiceType?: string; // "sales" | "purchase" | "rental" | "expense"

  @IsOptional()
  @IsString()
  invoiceId?: string;

  @IsOptional()
  @IsString()
  vehicleId?: string;

  @IsOptional()
  @IsString()
  targetRegisterId?: string;
}

export class QueryTransactionsDto extends PaginationDto {
  @IsOptional()
  @IsString()
  cashRegisterId?: string;

  @IsOptional()
  @IsEnum(CashTransactionType)
  type?: CashTransactionType;

  @IsOptional()
  @IsString()
  accountId?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;
}
