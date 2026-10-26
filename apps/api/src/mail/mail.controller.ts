import { Body, Controller, Get, Post, Put, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { IsBoolean, IsEmail, IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { SuperAdminGuard } from "../tenancy/super-admin.guard";
import { SkipCompany } from "../tenancy/skip-company.decorator";
import { MailService } from "./mail.service";

class UpdateSmtpConfigDto {
  @IsOptional() @IsString() host?: string;
  @IsOptional() @IsInt() @Min(1) @Max(65535) port?: number;
  @IsOptional() @IsBoolean() secure?: boolean;
  @IsOptional() @IsString() username?: string;
  @IsOptional() @IsString() password?: string;
  @IsOptional() @IsString() fromEmail?: string;
  @IsOptional() @IsString() fromName?: string;
}

class TestSmtpDto {
  @IsOptional() @IsEmail() to?: string;
}

/** Platform e-posta (SMTP) ayarları — yalnız süper admin */
@ApiTags("admin")
@ApiBearerAuth()
@SkipCompany()
@UseGuards(SuperAdminGuard)
@Controller("admin/mail")
export class MailController {
  constructor(private readonly mail: MailService) {}

  @Get("config")
  getConfig() {
    return this.mail.getConfigForAdmin();
  }

  @Put("config")
  updateConfig(@Body() dto: UpdateSmtpConfigDto) {
    return this.mail.updateConfig(dto);
  }

  @Post("test")
  test(@Body() dto: TestSmtpDto) {
    return this.mail.test(dto.to);
  }
}
