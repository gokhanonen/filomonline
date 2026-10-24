import { IsBoolean, IsEnum, IsOptional, IsString } from "class-validator";
import { ContractKind } from "@prisma/client";

export class CreateContractTemplateDto {
  @IsEnum(ContractKind)
  type: ContractKind;

  @IsString()
  name: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateContractTemplateDto {
  @IsOptional()
  @IsEnum(ContractKind)
  type?: ContractKind;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class RenderContractDto {
  @IsEnum(ContractKind)
  contractType: ContractKind;

  @IsString()
  contractId: string;

  @IsOptional()
  @IsString()
  templateId?: string;
}
