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

@SkipCompany()
@Controller()
export class AiController {
  constructor(private readonly claude: ClaudeService) {}

  /** Süper admin: Claude konfigürasyonunu getir */
  @Get("admin/ai/claude/config")
  @UseGuards(SuperAdminGuard)
  getConfig() {
    return this.claude.getConfigForAdmin();
  }

  /** Süper admin: Claude konfigürasyonunu güncelle */
  @Put("admin/ai/claude/config")
  @UseGuards(SuperAdminGuard)
  updateConfig(@Body() dto: UpdateClaudeConfigDto) {
    return this.claude.updateConfig(dto);
  }

  /** Süper admin: Canlı Claude bağlantı testi yap */
  @Post("admin/ai/claude/test")
  @UseGuards(SuperAdminGuard)
  testConnection(@Body() dto: TestClaudeDto) {
    return this.claude.testConnection(dto.prompt);
  }

  /** Genel sorgu endpoint'i (sistem içi servisler veya yetkili kullanıcılar için) */
  @Post("ai/claude/query")
  query(@Body() dto: ClaudeQueryDto) {
    return this.claude.sendMessage({
      prompt: dto.prompt,
      system: dto.system,
      model: dto.model,
      maxTokens: dto.maxTokens,
    });
  }

  /** Akıllı asistan: metin ya da en fazla 3 fotoğraf (ehliyet/kimlik/ruhsat) → çıkarılan veri + kart önerisi */
  @Post("ai/assist")
  assist(@Body() dto: AiAssistDto) {
    return this.claude.assist(dto);
  }
}
