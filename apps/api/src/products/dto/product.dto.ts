import { Type } from "class-transformer";
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from "class-validator";
import { ProductType } from "@prisma/client";
import { PaginationDto } from "../../common/dto/pagination.dto";

export class CreateProductDto {
  @IsEnum(ProductType)
  type: ProductType;

  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  code: string;

  @IsString()
  unit: string;

  @IsOptional() @IsString() integrationCode?: string;
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsString() description?: string;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) buyingPrice?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) sellingPrice?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) taxRate?: number;
}

export class UpdateProductDto {
  @IsOptional() @IsEnum(ProductType) type?: ProductType;
  @IsOptional() @IsString() @MinLength(2) name?: string;
  @IsOptional() @IsString() code?: string;
  @IsOptional() @IsString() unit?: string;
  @IsOptional() @IsString() integrationCode?: string;
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) buyingPrice?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) sellingPrice?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) taxRate?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class QueryProductsDto extends PaginationDto {
  @IsOptional() @IsEnum(ProductType) type?: ProductType;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  onlyActive?: boolean;

  @IsOptional() @IsString() categoryId?: string;
}

/** Ürün kategorisi: type = MATERIAL | RECEIVED_SERVICE | PROVIDED_SERVICE | VEHICLE | BOTH */
export class ProductCategoryDto {
  @IsString() @MinLength(1) name: string;
  @IsOptional() @IsString() type?: string;
}

export class UpdateProductCategoryDto {
  @IsOptional() @IsString() @MinLength(1) name?: string;
  @IsOptional() @IsString() type?: string;
}
