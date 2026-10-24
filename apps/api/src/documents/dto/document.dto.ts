import { Type } from "class-transformer";
import {
  IsDate,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
} from "class-validator";
import { DocumentReferenceType } from "@prisma/client";

export class CreateDocumentDto {
  @IsString() categoryId: string;
  @IsString() typeId: string;
  @IsEnum(DocumentReferenceType) referenceType: DocumentReferenceType;
  @IsString() referenceId: string;
  @IsString() fileName: string;
  @IsString() fileKey: string;
  @IsOptional() @IsString() thumbKey?: string;
  @IsString() fileType: string;
  @Type(() => Number) @IsInt() fileSize: number;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @Type(() => Date) @IsDate() expiryDate?: Date;
}

export class QueryDocumentsDto {
  @IsEnum(DocumentReferenceType) referenceType: DocumentReferenceType;
  @IsString() referenceId: string;
}
