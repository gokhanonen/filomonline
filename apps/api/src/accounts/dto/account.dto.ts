import { Type } from "class-transformer";
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from "class-validator";
import { AccountType, EntityType } from "@prisma/client";
import { PaginationDto } from "../../common/dto/pagination.dto";

export class CreateAccountDto {
  @IsEnum(AccountType)
  type: AccountType;

  @IsEnum(EntityType)
  entityType: EntityType;

  @IsString()
  @MinLength(2)
  name: string;

  @IsOptional() @IsString() contactPerson?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() neighborhood?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() district?: string;
  @IsOptional() @IsString() postalCode?: string;
  @IsOptional() @IsString() taxOffice?: string;
  @IsOptional() @IsString() taxNumber?: string;
  @IsOptional() @IsString() tckn?: string;
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsString() integrationCode?: string;
  @IsOptional() @IsBoolean() isPotential?: boolean;
}

export class UpdateAccountDto {
  @IsOptional() @IsEnum(AccountType) type?: AccountType;
  @IsOptional() @IsEnum(EntityType) entityType?: EntityType;
  @IsOptional() @IsString() @MinLength(2) name?: string;
  @IsOptional() @IsString() contactPerson?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() neighborhood?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() district?: string;
  @IsOptional() @IsString() postalCode?: string;
  @IsOptional() @IsString() taxOffice?: string;
  @IsOptional() @IsString() taxNumber?: string;
  @IsOptional() @IsString() tckn?: string;
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsString() integrationCode?: string;
  @IsOptional() @IsBoolean() isPotential?: boolean;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class QueryAccountsDto extends PaginationDto {
  @IsOptional() @IsEnum(AccountType) type?: AccountType;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  onlyActive?: boolean;

  @IsOptional() @Type(() => Boolean) @IsBoolean() isPotential?: boolean;
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsString() city?: string;
}

export class AccountCategoryDto {
  @IsString() @MinLength(1) name: string;
  @IsEnum(AccountType) type: AccountType;
}

export class UpdateAccountCategoryDto {
  @IsOptional() @IsString() @MinLength(1) name?: string;
  @IsOptional() @IsEnum(AccountType) type?: AccountType;
}
