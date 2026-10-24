import { IsOptional, IsString, MinLength } from "class-validator";

export class SimpleCatalogDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsString()
  hex?: string; // sadece renk için
}

export class UpdateSimpleCatalogDto {
  @IsOptional() @IsString() @MinLength(1) name?: string;
  @IsOptional() @IsString() hex?: string;
}

export class CreateBrandDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsString()
  categoryId?: string;
}

export class ListingSourceDto {
  @IsString() @MinLength(1) label: string;
  @IsOptional() @IsString() domainLink?: string;
  @IsOptional() @IsString() iconUrl?: string;
}

export class UpdateListingSourceDto {
  @IsOptional() @IsString() @MinLength(1) label?: string;
  @IsOptional() @IsString() domainLink?: string;
  @IsOptional() @IsString() iconUrl?: string;
}

export class CreateModelDto {
  @IsString()
  brandId: string;

  @IsString()
  @MinLength(1)
  name: string;
}
