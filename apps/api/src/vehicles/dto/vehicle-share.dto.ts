import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsNumber, IsOptional, IsString, MaxLength, Min } from "class-validator";
import { Type } from "class-transformer";

export class CreateVehicleShareLinkDto {
  @ApiPropertyOptional({ description: "Paylaşım başlığı veya müşteri notu (örn. Ahmet Bey Özel)" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;

  @ApiPropertyOptional({ description: "Plakayı ilanda gizle/maskele (örn. 34 *** 123)" })
  @IsOptional()
  @IsBoolean()
  hidePlate?: boolean;

  @ApiPropertyOptional({ description: "İlana özel liste fiyatı (belirtilmezse aracın liste fiyatı geçerlidir)" })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  customPrice?: number;

  @ApiPropertyOptional({ description: "İlan altına eklenecek özel satıcı mesajı/açıklaması" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  customNote?: string;
}
