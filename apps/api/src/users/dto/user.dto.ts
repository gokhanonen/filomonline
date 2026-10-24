import { Type } from "class-transformer";
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from "class-validator";

export class MembershipDto {
  @IsString()
  companyId: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  roleIds?: string[];

  @IsOptional() @IsBoolean() isAdmin?: boolean;
  @IsOptional() @IsBoolean() isDefault?: boolean;
}

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @MinLength(2)
  name: string;

  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() extension?: string;
  @IsOptional() @IsString() avatarUrl?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MembershipDto)
  memberships?: MembershipDto[];
}

export class UpdateUserDto {
  @IsOptional() @IsString() @MinLength(2) name?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() extension?: string;
  @IsOptional() @IsString() avatarUrl?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsString() @MinLength(6) password?: string;
}

export class SetMembershipsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MembershipDto)
  memberships: MembershipDto[];
}
