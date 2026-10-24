import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { SalesContractStatus } from "@prisma/client";
import { PaginationDto } from "../../common/dto/pagination.dto";

export class SalesContractInstallmentDto {
  @IsString()
  date: string;

  @IsNumber()
  amount: number;

  @IsString()
  type: string; // NAKİT, KREDİ KARTI, ÇEK, SENET, HAVALE

  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

export class CreateSalesContractDto {
  @IsString()
  vehicleId: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsString()
  customerName: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsOptional()
  @IsString()
  customerEmail?: string;

  @IsOptional()
  @IsString()
  customerAddress?: string;

  @IsOptional()
  @IsString()
  customerDistrict?: string;

  @IsOptional()
  @IsString()
  customerCity?: string;

  @IsOptional()
  @IsString()
  customerIntegrationCode?: string;

  @IsOptional()
  @IsString()
  customerTaxOffice?: string;

  @IsOptional()
  @IsString()
  customerTaxNumber?: string;

  @IsOptional()
  @IsString()
  customerIdentityNumber?: string;

  @IsString()
  documentNo: string;

  @IsString()
  contractDate: string;

  @IsOptional()
  @IsString()
  validUntil?: string;

  @IsNumber()
  price: number;

  @IsOptional()
  @IsNumber()
  vatRate?: number;

  @IsOptional()
  @IsNumber()
  vatAmount?: number;

  @IsOptional()
  @IsNumber()
  vatBase?: number;

  @IsOptional()
  @IsNumber()
  discount?: number;

  @IsOptional()
  @IsNumber()
  grandTotal?: number;

  @IsOptional()
  @IsNumber()
  notarySalePrice?: number;

  @IsOptional()
  @IsNumber()
  notaryPurchaseAmount?: number;

  @IsOptional()
  @IsBoolean()
  specialBase?: boolean;

  @IsOptional()
  @IsNumber()
  specialBaseAmount?: number;

  @IsOptional()
  @IsEnum(SalesContractStatus)
  status?: SalesContractStatus;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  paymentNotes?: string;

  @IsOptional()
  @IsNumber()
  penaltyClause?: number;

  @IsOptional()
  @IsString()
  saleLocationId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SalesContractInstallmentDto)
  installments?: SalesContractInstallmentDto[];
}

export class UpdateSalesContractDto {
  @IsOptional()
  @IsString()
  vehicleId?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsOptional()
  @IsString()
  customerEmail?: string;

  @IsOptional()
  @IsString()
  customerAddress?: string;

  @IsOptional()
  @IsString()
  customerDistrict?: string;

  @IsOptional()
  @IsString()
  customerCity?: string;

  @IsOptional()
  @IsString()
  customerIntegrationCode?: string;

  @IsOptional()
  @IsString()
  customerTaxOffice?: string;

  @IsOptional()
  @IsString()
  customerTaxNumber?: string;

  @IsOptional()
  @IsString()
  customerIdentityNumber?: string;

  @IsOptional()
  @IsString()
  documentNo?: string;

  @IsOptional()
  @IsString()
  contractDate?: string;

  @IsOptional()
  @IsString()
  validUntil?: string;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsNumber()
  vatRate?: number;

  @IsOptional()
  @IsNumber()
  vatAmount?: number;

  @IsOptional()
  @IsNumber()
  vatBase?: number;

  @IsOptional()
  @IsNumber()
  discount?: number;

  @IsOptional()
  @IsNumber()
  grandTotal?: number;

  @IsOptional()
  @IsNumber()
  notarySalePrice?: number;

  @IsOptional()
  @IsNumber()
  notaryPurchaseAmount?: number;

  @IsOptional()
  @IsBoolean()
  specialBase?: boolean;

  @IsOptional()
  @IsNumber()
  specialBaseAmount?: number;

  @IsOptional()
  @IsEnum(SalesContractStatus)
  status?: SalesContractStatus;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  paymentNotes?: string;

  @IsOptional()
  @IsNumber()
  penaltyClause?: number;

  @IsOptional()
  @IsString()
  saleLocationId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SalesContractInstallmentDto)
  installments?: SalesContractInstallmentDto[];
}

export class QuerySalesContractsDto extends PaginationDto {
  @IsOptional()
  @IsEnum(SalesContractStatus)
  status?: SalesContractStatus;

  @IsOptional()
  @IsString()
  vehicleId?: string;
}
