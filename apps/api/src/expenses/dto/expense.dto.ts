import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsDate,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from "class-validator";
import {
  ExpenseInvoiceType,
  ExpenseTargetType,
  IntegrationStatus,
  ProductType,
} from "@prisma/client";
import { PaginationDto } from "../../common/dto/pagination.dto";

export class ExpenseLineDto {
  @IsEnum(ProductType) type: ProductType;
  @IsOptional() @IsString() productId?: string;
  @IsString() code: string;
  @IsString() name: string;
  @Type(() => Number) @IsNumber() @Min(0) quantity: number;
  @Type(() => Number) @IsNumber() @Min(0) unitPrice: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) vatRate?: number;
  @IsOptional() @IsString() description?: string;
}

export class CreateExpenseDto {
  @IsOptional() @IsEnum(ExpenseInvoiceType) invoiceType?: ExpenseInvoiceType;
  @IsOptional() @IsEnum(ExpenseTargetType) expenseType?: ExpenseTargetType;
  @IsOptional() @IsString() vehicleId?: string;
  @IsOptional() @IsString() locationId?: string;
  @IsOptional() @IsString() documentType?: string;
  @IsOptional() @IsString() documentNo?: string;
  @Type(() => Date) @IsDate() documentDate: Date;
  @IsOptional() @Type(() => Date) @IsDate() dueDate?: Date; // vade (boşsa belge tarihi)
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() supplierId?: string;
  @IsOptional() @IsString() cashRegisterId?: string;
  @IsOptional() @IsEnum(IntegrationStatus) integrationStatus?: IntegrationStatus;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ExpenseLineDto)
  lines: ExpenseLineDto[];
}

export class UpdateExpenseDto extends CreateExpenseDto {}

export class QueryExpensesDto extends PaginationDto {
  @IsOptional() @IsEnum(ExpenseInvoiceType) invoiceType?: ExpenseInvoiceType;
  @IsOptional() @IsString() vehicleId?: string;
}
