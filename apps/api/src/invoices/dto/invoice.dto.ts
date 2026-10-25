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
import { EntityType, IntegrationStatus } from "@prisma/client";
import { PaginationDto } from "../../common/dto/pagination.dto";

export class CreatePurchaseInvoiceDto {
  @IsString() vehicleId: string;
  @IsString() accountId: string; // satıcı cari
  @IsString() invoiceNo: string;
  @Type(() => Date) @IsDate() invoiceDate: Date;
  @IsOptional() @Type(() => Date) @IsDate() dueDate?: Date; // vade (boşsa fatura tarihi)

  @Type(() => Number) @IsNumber() @Min(0) notaryAmount: number; // araç alış (noter)
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) otherAmount?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) vatRate?: number;

  @IsOptional() @IsBoolean() specialBase?: boolean; // özel matrah
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) specialBaseAmount?: number;

  @IsOptional() @IsString() locationId?: string;
  @IsOptional() @IsString() notaryJournalNo?: string;
  @IsOptional() @IsString() description?: string;
}

export class CreateSalesInvoiceDto {
  @IsString() vehicleId: string;
  @IsString() accountId: string; // alıcı cari
  @IsString() invoiceNo: string;
  @Type(() => Date) @IsDate() invoiceDate: Date;
  @IsOptional() @Type(() => Date) @IsDate() dueDate?: Date; // vade (boşsa fatura tarihi)
  @IsOptional() @IsEnum(EntityType) entityType?: EntityType;

  @IsOptional() @IsString() purchaseRegime?: string; // 'sahis' | 'sirket_1' | 'sirket_20' | 'galeri_ozel'
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) saleAmount?: number; // Satış Tutarı
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) notarySalePrice?: number; // Satış Noter Fiyatı
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) notaryPurchasePrice?: number; // Alış Noter Fiyatı

  // Firma / Genel KDV
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) totalWithVat?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) vatRate?: number; // %0, %1, %20

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) otherAmountExclNotary?: number;
  @IsOptional() @IsString() locationId?: string;
  @IsOptional() @IsString() saleType?: string;
  @IsOptional() @IsString() notaryJournalNo?: string;
  @IsOptional() @IsString() description?: string;
}

export class UpdateSalesInvoiceDto {
  @IsOptional() @IsString() accountId?: string;
  @IsOptional() @IsString() invoiceNo?: string;
  @IsOptional() @Type(() => Date) @IsDate() invoiceDate?: Date;
  @IsOptional() @Type(() => Date) @IsDate() dueDate?: Date;
  @IsOptional() @IsEnum(EntityType) entityType?: EntityType;

  @IsOptional() @IsString() purchaseRegime?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) saleAmount?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) notarySalePrice?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) notaryPurchasePrice?: number;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) otherAmountExclNotary?: number;
  @IsOptional() @IsString() locationId?: string;
  @IsOptional() @IsString() saleType?: string;
  @IsOptional() @IsString() notaryJournalNo?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() erpCode?: string;
}

export class UpdateIntegrationStatusDto {
  @IsEnum(IntegrationStatus) integrationStatus: IntegrationStatus;
  @IsOptional() @IsString() integrationRefNo?: string;
}

export class QueryInvoicesDto extends PaginationDto {
  @IsOptional() @IsString() vehicleId?: string;
  @IsOptional() @IsEnum(["purchase", "sales", "rental"] as never) type?: string;
}
