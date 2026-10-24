import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Matches, MinLength } from "class-validator";

const SLUG = /^[a-z0-9_]+$/;

export class CreateDocumentCategoryDto {
  @IsString() @Matches(SLUG, { message: "value: küçük harf, rakam ve _ kullanın" }) value: string;
  @IsString() @MinLength(1) label: string;
  @IsOptional() @IsString() module?: string;
  @IsOptional() @Type(() => Number) @IsInt() sortOrder?: number;
}

export class UpdateDocumentCategoryDto {
  @IsOptional() @IsString() @MinLength(1) label?: string;
  @IsOptional() @IsString() module?: string;
  @IsOptional() @Type(() => Number) @IsInt() sortOrder?: number;
}

export class CreateDocumentTypeDto {
  @IsString() categoryId: string;
  @IsString() @Matches(SLUG, { message: "value: küçük harf, rakam ve _ kullanın" }) value: string;
  @IsString() @MinLength(1) label: string;
  @IsOptional() @Type(() => Number) @IsInt() sortOrder?: number;
}

export class UpdateDocumentTypeDto {
  @IsOptional() @IsString() @MinLength(1) label?: string;
  @IsOptional() @Type(() => Number) @IsInt() sortOrder?: number;
}
