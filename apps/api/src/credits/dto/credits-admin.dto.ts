import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";

export class UpsertPlanDto {
  @IsString() @MaxLength(40) code!: string;
  @IsString() @MaxLength(120) name!: string;
  @IsOptional() @IsInt() @Min(0) monthlyFreeCredits?: number;
  @IsOptional() @IsNumber() @Min(0) monthlyPrice?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsBoolean() isDefault?: boolean;
  @IsOptional() @IsInt() sortOrder?: number;
}

export class UpsertCreditPackageDto {
  @IsString() @MaxLength(120) name!: string;
  @IsInt() @Min(1) @Max(10_000_000) credits!: number;
  @IsNumber() @Min(0) price!: number;
  @IsOptional() @IsString() @MaxLength(8) currency?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsInt() sortOrder?: number;
}

export class PurchaseCreditsDto {
  @IsString() packageId!: string;
  @IsOptional() @IsString() @MaxLength(500) returnUrl?: string;
}
