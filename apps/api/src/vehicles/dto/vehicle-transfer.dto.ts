import { IsBoolean, IsOptional, IsString, MinLength } from "class-validator";

/** Araç transferi başlatma veya doğrudan taşıma */
export class CreateVehicleTransferDto {
  @IsString()
  @MinLength(1, { message: "Hedef lokasyon seçilmelidir" })
  toLocationId: string;

  @IsOptional()
  @IsString()
  notes?: string;

  /** Doğrudan / anında taşıma (onay beklemeden anında taşır) */
  @IsOptional()
  @IsBoolean()
  isDirect?: boolean;

  /** Dış lokasyon (kaporta, boyacı vs.) ise hangi tedarikçide olduğu */
  @IsOptional()
  @IsString()
  supplierId?: string;

  /** Dış lokasyon ise geri dönüşün yapılacağı iç lokasyon */
  @IsOptional()
  @IsString()
  returnLocationId?: string;
}

/** Dış lokasyondan dönüş tamamlama */
export class ReturnFromExternalDto {
  @IsOptional()
  @IsString()
  returnLocationId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

/** İlk lokasyon ataması */
export class SetInitialLocationDto {
  @IsString()
  @MinLength(1, { message: "Lokasyon seçilmelidir" })
  locationId: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
