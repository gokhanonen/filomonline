import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  UseGuards,
} from "@nestjs/common";
import { ArrayMaxSize, IsArray, IsIn, IsOptional, IsString, IsNumber, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { SuperAdminGuard } from "../tenancy/super-admin.guard";
import { SkipCompany } from "../tenancy/skip-company.decorator";
import { CompanyId } from "../tenancy/company-id.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { AuthUser } from "../auth/auth.types";
import { CreditsService } from "../credits/credits.service";
import { ClaudeService, AiAssistInput, MAX_ASSIST_IMAGES } from "./claude.service";

class UpdateClaudeConfigDto {
  @IsOptional() @IsString() apiKey?: string;
  @IsOptional() @IsString() model?: string;
  @IsOptional() @IsNumber() maxTokens?: number;
}

class TestClaudeDto {
  @IsOptional() @IsString() prompt?: string;
}

class ClaudeQueryDto {
  @IsString() prompt!: string;
  @IsOptional() @IsString() system?: string;
  @IsOptional() @IsString() model?: string;
  @IsOptional() @IsNumber() maxTokens?: number;
}

class AiImageDto {
  @IsIn(["image/jpeg", "image/png", "image/webp", "image/gif"]) mediaType!: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
  @IsString() base64Data!: string;
}

class AiAssistDto implements AiAssistInput {
  @IsOptional() @IsString() prompt?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(MAX_ASSIST_IMAGES) @ValidateNested({ each: true }) @Type(() => AiImageDto)
  images?: AiImageDto[];
}

@Controller()
export class AiController {
  constructor(
    private readonly claude: ClaudeService,
    private readonly credits: CreditsService,
  ) {}

  /** Süper admin: Claude konfigürasyonunu getir */
  @SkipCompany()
  @Get("admin/ai/claude/config")
  @UseGuards(SuperAdminGuard)
  getConfig() {
    return this.claude.getConfigForAdmin();
  }

  /** Süper admin: Claude konfigürasyonunu güncelle */
  @SkipCompany()
  @Put("admin/ai/claude/config")
  @UseGuards(SuperAdminGuard)
  updateConfig(@Body() dto: UpdateClaudeConfigDto) {
    return this.claude.updateConfig(dto);
  }

  /** Süper admin: Canlı Claude bağlantı testi yap (kontör harcanmaz) */
  @SkipCompany()
  @Post("admin/ai/claude/test")
  @UseGuards(SuperAdminGuard)
  testConnection(@Body() dto: TestClaudeDto) {
    return this.claude.testConnection(dto.prompt);
  }

  /**
   * Genel sorgu endpoint'i (yetkili kullanıcılar). İşlem başına 1 kontör harcar;
   * çağrı başarısız olursa kontör iade edilir.
   */
  @Post("ai/claude/query")
  query(
    @CompanyId() companyId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: ClaudeQueryDto,
  ) {
    return this.withCredit(companyId, user.id, "ai.query", () =>
      this.claude.sendMessage({
        prompt: dto.prompt,
        system: dto.system,
        model: dto.model,
        maxTokens: dto.maxTokens,
      }),
    );
  }

  /** Akıllı asistan: metin ya da en fazla 3 fotoğraf (ehliyet/kimlik/ruhsat) → çıkarılan veri + kart önerisi. İşlem başına 1 kontör. */
  @Post("ai/assist")
  assist(
    @CompanyId() companyId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: AiAssistDto,
  ) {
    return this.withCredit(companyId, user.id, "ai.assist", () =>
      this.claude.assist(dto),
    );
  }

  /** Kontör düş → işi yap → hata olursa iade et. */
  private async withCredit<T>(
    companyId: string,
    userId: string,
    operation: string,
    run: () => Promise<T>,
  ): Promise<T> {
    await this.credits.spend(companyId, userId, { operation });
    try {
      return await run();
    } catch (err) {
      await this.credits.refund(companyId, userId, {
        operation,
        note: "AI işlemi başarısız — iade",
      });
      throw err;
    }
  }
}
