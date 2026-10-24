import { Type } from "class-transformer";
import {
  IsBoolean,
  IsOptional,
  IsString,
  MinLength,
} from "class-validator";
import { PaginationDto } from "../../common/dto/pagination.dto";

export class CreateLocationDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  code: string;

  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() workplaceInfo?: string;
  @IsOptional() @IsString() warehouseInfo?: string;
  @IsOptional() @IsBoolean() isExternal?: boolean;
}

export class UpdateLocationDto {
  @IsOptional() @IsString() @MinLength(2) name?: string;
  @IsOptional() @IsString() code?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() workplaceInfo?: string;
  @IsOptional() @IsString() warehouseInfo?: string;
  @IsOptional() @IsBoolean() isExternal?: boolean;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class QueryLocationsDto extends PaginationDto {
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  onlyActive?: boolean;
}

// --- Kasa ---

export class CreateCashRegisterDto {
  @IsString()
  locationId: string;

  @IsString()
  erpCode: string;

  @IsString()
  @MinLength(2)
  name: string;
}

export class UpdateCashRegisterDto {
  @IsOptional() @IsString() locationId?: string;
  @IsOptional() @IsString() erpCode?: string;
  @IsOptional() @IsString() @MinLength(2) name?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
