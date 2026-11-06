import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import { BillingPeriod, CouponType } from "@prisma/client";

// --- Kullanıcı tarafı -------------------------------------------------------

export class SubscribeDto {
  @IsString() planCode!: string;
  @IsEnum(BillingPeriod) period!: BillingPeriod;
  @IsOptional() @IsString() @MaxLength(60) couponCode?: string;
}

export class PreviewQuoteDto {
  @IsString() planCode!: string;
  @IsEnum(BillingPeriod) period!: BillingPeriod;
  @IsOptional() @IsString() @MaxLength(60) couponCode?: string;
}

// --- Süper admin: plan (tüm alanlar) ---------------------------------------

export class UpsertPlanDto {
  @IsString() @MaxLength(40) code!: string;
  @IsString() @MaxLength(120) name!: string;
  @IsOptional() @IsInt() @Min(0) monthlyFreeCredits?: number;

  @IsOptional() @IsInt() @Min(0) includedUsers?: number;
  @IsOptional() @IsInt() @Min(0) includedLocations?: number;
  @IsOptional() @IsInt() @Min(0) includedVehicles?: number;
  @IsOptional() @IsInt() @Min(0) freeTransactionLimit?: number | null;

  @IsOptional() @IsNumber() @Min(0) monthlyListPrice?: number;
  @IsOptional() @IsNumber() @Min(0) monthlyCampaignPrice?: number;
  @IsOptional() @IsInt() @Min(1) @Max(12) annualMonthsCharged?: number;
  @IsOptional() @IsNumber() @Min(0) annualListPrice?: number;
  @IsOptional() @IsNumber() @Min(0) annualCampaignPrice?: number;
  @IsOptional() @IsDateString() campaignEndsAt?: string;

  @IsOptional() @IsInt() @Min(0) trialDays?: number;
  @IsOptional() @IsInt() @Min(0) @Max(100) graceOveragePct?: number;
  @IsOptional() @IsBoolean() isPublic?: boolean;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsBoolean() isDefault?: boolean;
  @IsOptional() @IsInt() sortOrder?: number;
}

// --- Süper admin: kupon -----------------------------------------------------

export class UpsertCouponDto {
  @IsString() @MaxLength(60) code!: string;
  @IsEnum(CouponType) type!: CouponType;
  @IsNumber() @Min(0) value!: number;
  @IsOptional() @IsString() @MaxLength(200) description?: string;
  @IsOptional() @IsString() @MaxLength(400) appliesToPlanCodes?: string;
  @IsOptional() @IsInt() @Min(1) maxRedemptions?: number;
  @IsOptional() @IsDateString() validFrom?: string;
  @IsOptional() @IsDateString() validUntil?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

// --- Süper admin: tenant aboneliği atama -----------------------------------

export class AssignSubscriptionDto {
  @IsString() planCode!: string;
  @IsOptional() @IsEnum(BillingPeriod) period?: BillingPeriod;
  @IsOptional() @IsNumber() @Min(0) customPrice?: number;
  @IsOptional() @IsInt() @Min(0) trialDays?: number;
  @IsOptional() @IsString() @MaxLength(400) note?: string;
}
