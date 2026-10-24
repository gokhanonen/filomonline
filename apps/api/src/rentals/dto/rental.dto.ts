import { Type } from "class-transformer";
import {
  IsArray,
  IsDate,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from "class-validator";
import { RentalContractStatus } from "@prisma/client";
import { PaginationDto } from "../../common/dto/pagination.dto";

export class CreateRentalContractDto {
  @IsString() vehicleId: string;
  @IsOptional() @IsString() customerId?: string;
  @IsString() @MinLength(2) customerName: string;
  @IsOptional() @IsString() customerTcTaxNo?: string;
  @IsOptional() @IsString() customerAddress?: string;
  @IsOptional() @IsString() customerPhone?: string;

  @Type(() => Number) @IsInt() @Min(1) durationMonths: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) kmLimit?: number;
  @Type(() => Date) @IsDate() startDate: Date;
  @IsOptional() @Type(() => Date) @IsDate() endDate?: Date;

  @Type(() => Number) @IsNumber() @Min(0) monthlyPrice: number;
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) vatRate?: number;

  @IsOptional() @IsArray() @IsString({ each: true }) drivers?: string[];
  @Type(() => Date) @IsDate() contractDate: Date;
  @IsOptional() @IsString() documentNo?: string;
  @IsOptional() @IsString() salesRegime?: string;
  @IsOptional() @IsEnum(RentalContractStatus) status?: RentalContractStatus;
}

export class UpdateRentalContractDto extends CreateRentalContractDto {}

export class QueryRentalsDto extends PaginationDto {
  @IsOptional() @IsEnum(RentalContractStatus) status?: RentalContractStatus;
  @IsOptional() @IsString() vehicleId?: string;
}
