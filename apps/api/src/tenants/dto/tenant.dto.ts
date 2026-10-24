import { IsBoolean, IsOptional, IsString, Matches, MinLength } from "class-validator";

export class CreateTenantDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-]+$/, { message: "slug yalnızca küçük harf, rakam ve tire içerebilir" })
  slug?: string;

  @IsOptional()
  @IsString()
  plan?: string;
}

export class UpdateTenantDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  plan?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
