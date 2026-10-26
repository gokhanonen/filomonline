import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
import { QuoteOptionType } from "@prisma/client";

export class QuickQuoteNewLeadDto {
  @IsString() @MaxLength(120) fullName: string;
  @IsOptional() @IsString() @MaxLength(30) phone?: string;
  @IsOptional() @IsEmail() email?: string;
}

export class QuoteOptionDto {
  @IsEnum(QuoteOptionType) type: QuoteOptionType;
  @IsOptional() @IsString() @MaxLength(60) label?: string;
  @Type(() => Number) @IsNumber() @Min(0) price: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) downPayment?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) tradeInValue?: number;
  @IsOptional() @IsString() @MaxLength(120) tradeInNote?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(120) installmentCount?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) monthlyPayment?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(100) interestRate?: number;
  @IsOptional() @IsString() @MaxLength(500) note?: string;
}

/** Araç kartından tek adımda teklif: mevcut potansiyel ya da yeni potansiyel + seçenekler + paylaşım linki */
export class QuickQuoteDto {
  @IsString() vehicleId: string;
  @IsOptional() @IsString() leadId?: string;
  @IsOptional() @ValidateNested() @Type(() => QuickQuoteNewLeadDto) newLead?: QuickQuoteNewLeadDto;
  @Type(() => Number) @IsNumber() @Min(0) offeredPrice: number;
  @IsDateString() validUntil: string;
  @IsOptional() @IsString() @MaxLength(4000) terms?: string;
  @IsOptional() @IsString() @MaxLength(4000) notes?: string;
  @IsArray() @ArrayMaxSize(4) @ValidateNested({ each: true }) @Type(() => QuoteOptionDto) options: QuoteOptionDto[];
  /** true → müşteriye özel link hemen oluşturulur ve teklif "Gönderildi" olur */
  @IsOptional() @IsBoolean() share?: boolean;
}

export class QuoteEmailDto {
  /** Boşsa potansiyelin kayıtlı e-postası */
  @IsOptional() @IsEmail() to?: string;
}

export class QuoteRespondDto {
  @IsIn(["ACCEPTED", "CALLBACK"]) response: "ACCEPTED" | "CALLBACK";
  @IsOptional() @IsString() @MaxLength(500) message?: string;
}
