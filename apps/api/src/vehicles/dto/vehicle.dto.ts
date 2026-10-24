import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsDate,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";
import {
  DriveType,
  FuelType,
  IntegrationStatus,
  TransmissionType,
  VehiclePhotoKind,
  VehicleStatus,
} from "@prisma/client";
import { PaginationDto } from "../../common/dto/pagination.dto";

export class VehiclePhotoDto {
  @IsEnum(VehiclePhotoKind) category: VehiclePhotoKind;
  @IsString() fileKey: string;
  @IsOptional() @IsString() thumbKey?: string;
  @IsOptional() @IsString() url?: string;
  @IsOptional() @IsString() thumbUrl?: string;
  @IsOptional() @Type(() => Number) @IsInt() sortOrder?: number;
}

export class TramerRecordDto {
  @Type(() => Date) @IsDate() date: Date;
  @Type(() => Number) @IsNumber() amount: number;
  @IsString() description: string;
  @IsOptional() @IsString() photoUrl?: string;
}

export class ListingUrlDto {
  @IsString() url: string;
  @IsOptional() @IsString() listingSourceId?: string;
}

export class InstallmentDto {
  @Type(() => Date) @IsDate() date: Date;
  @Type(() => Number) @IsNumber() amount: number;
  @IsString() type: string; // NAKİT, KREDİ KARTI, ÇEK, SENET, HAVALE
}

export class CreateVehicleDto {
  // Kimlik / katalog
  @IsString() @MinLength(1) plate: string;
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsString() vehicleTypeId?: string;
  @IsOptional() @IsString() brandId?: string;
  @IsOptional() @IsString() modelId?: string;
  @IsOptional() @IsString() brandName?: string;
  @IsOptional() @IsString() modelName?: string;
  @IsOptional() @Type(() => Number) @IsInt() year?: number;
  @IsOptional() @IsString() chassisNo?: string;
  @IsOptional() @IsString() engineNo?: string;
  @IsOptional() @IsString() registrationModel?: string;
  @IsOptional() @IsEnum(VehicleStatus) status?: VehicleStatus;

  // Teknik
  @IsOptional() @IsEnum(FuelType) fuelType?: FuelType;
  @IsOptional() @IsEnum(TransmissionType) transmission?: TransmissionType;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) km?: number;
  @IsOptional() @IsString() bodyTypeId?: string;
  @IsOptional() @IsString() colorId?: string;
  @IsOptional() @IsString() colorName?: string;
  @IsOptional() @Type(() => Number) @IsInt() horsePower?: number;
  @IsOptional() @Type(() => Number) @IsInt() enginePower?: number;
  @IsOptional() @Type(() => Number) @IsInt() engineVolume?: number;
  @IsOptional() @IsEnum(DriveType) driveType?: DriveType;
  @IsOptional() @IsBoolean() warranty?: boolean;
  @IsOptional() @IsBoolean() heavyDamage?: boolean;
  @IsOptional() @IsBoolean() spareKey?: boolean;
  @IsOptional() @IsString() notes?: string;

  // Fiyatlandırma
  @IsOptional() @Type(() => Number) @IsNumber() listPrice?: number;
  @IsOptional() @Type(() => Number) @IsNumber() tensf?: number;
  @IsOptional() @Type(() => Number) @IsNumber() tenListPrice?: number;
  @IsOptional() @IsString() purchaseRegime?: string;
  @IsOptional() @IsBoolean() specialBase?: boolean;
  @IsOptional() @Type(() => Number) @IsNumber() specialBaseAmount?: number;
  @IsOptional() @Type(() => Number) @IsNumber() profitVatRate?: number;
  @IsOptional() @Type(() => Number) @IsNumber() vatRate?: number;
  @IsOptional() @IsString() erpCode?: string;

  // Alış
  @IsOptional() @Type(() => Number) @IsNumber() purchasePrice?: number;
  @IsOptional() @Type(() => Number) @IsNumber() purchaseNotaryPrice?: number;
  @IsOptional() @Type(() => Date) @IsDate() purchaseDate?: Date;
  @IsOptional() @Type(() => Number) @IsNumber() purchaseVatRate?: number;
  @IsOptional() @Type(() => Number) @IsNumber() purchaseInterestRate?: number;
  @IsOptional() @IsString() purchaseType?: string;
  @IsOptional() @Type(() => Number) @IsNumber() purchaseOtherAmount?: number;
  @IsOptional() @Type(() => Number) @IsNumber() purchaseDownPayment?: number;
  @IsOptional() @IsString() purchasePaymentNotes?: string;
  @IsOptional() @IsString() purchasedFrom?: string;
  @IsOptional() @IsString() supplierId?: string;
  @IsOptional() @IsString() purchaseLocationId?: string;
  @IsOptional() @IsString() purchaseInvoiceNo?: string;
  @IsOptional() @Type(() => Date) @IsDate() purchaseInvoiceDate?: Date;
  @IsOptional() @IsString() purchaseInvoiceDescription?: string;
  @IsOptional() @IsString() purchaseNotaryName?: string;
  @IsOptional() @IsString() purchaseNotaryJournalNo?: string;
  @IsOptional() @Type(() => Number) @IsNumber() purchaseNotaryAmount?: number;

  // Satış
  @IsOptional() @Type(() => Number) @IsNumber() saleAmount?: number;
  @IsOptional() @Type(() => Date) @IsDate() saleDate?: Date;
  @IsOptional() @Type(() => Number) @IsNumber() saleVatRate?: number;
  @IsOptional() @IsString() saleType?: string;
  @IsOptional() @Type(() => Number) @IsNumber() saleOtherAmount?: number;
  @IsOptional() @IsString() customerId?: string;
  @IsOptional() @IsString() saleLocationId?: string;
  @IsOptional() @IsString() saleInvoiceNo?: string;
  @IsOptional() @Type(() => Date) @IsDate() saleInvoiceDate?: Date;
  @IsOptional() @IsString() saleInvoiceDescription?: string;
  @IsOptional() @IsString() saleNotaryName?: string;
  @IsOptional() @IsString() saleNotaryJournalNo?: string;
  @IsOptional() @Type(() => Number) @IsNumber() saleNotaryAmount?: number;
  @IsOptional() @IsEnum(IntegrationStatus) salesIntegrationStatus?: IntegrationStatus;
  @IsOptional() @IsString() salesIntegrationRefNo?: string;
  @IsOptional() @IsString() salesRepId?: string;

  // İç içe koleksiyonlar
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => VehiclePhotoDto)
  photos?: VehiclePhotoDto[];

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => TramerRecordDto)
  tramerSet?: TramerRecordDto[];

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ListingUrlDto)
  listingUrls?: ListingUrlDto[];

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => InstallmentDto)
  installments?: InstallmentDto[];
}

// Güncellemede tüm alanlar opsiyonel; iç içe koleksiyonlar ayrı endpoint'lerle yönetilir.
export class UpdateVehicleDto extends CreateVehicleDto {
  @IsOptional() @IsString() @MinLength(1) declare plate: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class QueryVehiclesDto extends PaginationDto {
  @IsOptional() @IsEnum(VehicleStatus) status?: VehicleStatus;
  @IsOptional() @IsString() vehicleTypeId?: string;

  @IsOptional() @Type(() => Boolean) @IsBoolean() onlyActive?: boolean;
}
