import { Type } from "class-transformer";
import {
  IsDate,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Min,
  MinLength,
} from "class-validator";

/** İlan linki ekleme (Sahibinden, Arabam, DOD ...) */
export class AddListingUrlDto {
  @IsUrl({ require_protocol: true }, { message: "Geçerli bir URL girin (https://...)" })
  url: string;

  @IsOptional() @IsString() listingSourceId?: string;
}

/** Opsiyon (kapora/rezervasyon) oluşturma — güncelleme eskiyi SUPERSEDED yapıp yenisini açar */
export class CreateVehicleOptionDto {
  @IsString() @MinLength(1) customerId: string;

  @Type(() => Date) @IsDate() validUntil: Date;

  @Type(() => Number) @IsNumber() @Min(0) amount: number;

  @IsOptional() @IsString() note?: string;
}
