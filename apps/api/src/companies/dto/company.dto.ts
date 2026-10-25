import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
} from "class-validator";

export class CreateCompanyDto {
  @IsString()
  tenantId: string;

  @IsString()
  @MinLength(2)
  name: string;

  @IsOptional() @IsString() legalName?: string;
  @IsOptional() @IsString() taxOffice?: string;
  @IsOptional() @IsString() taxNumber?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() logoUrl?: string;
  @IsOptional() @IsString() website?: string;
  @IsOptional() @IsString() mersisNo?: string;
  @IsOptional() @IsString() tradeRegistryNo?: string;
}

export class UpdateCompanyDto {
  @IsOptional() @IsString() @MinLength(2) name?: string;
  @IsOptional() @IsString() legalName?: string;
  @IsOptional() @IsString() taxOffice?: string;
  @IsOptional() @IsString() taxNumber?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() logoUrl?: string;
  @IsOptional() @IsString() website?: string;
  @IsOptional() @IsString() mersisNo?: string;
  @IsOptional() @IsString() tradeRegistryNo?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
