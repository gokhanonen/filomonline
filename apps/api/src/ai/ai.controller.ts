import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  UseGuards,
} from "@nestjs/common";
import { SuperAdminGuard } from "../tenancy/super-admin.guard";
import { ClaudeService, AiAssistInput } from "./claude.service";

class UpdateClaudeConfigDto {
  apiKey?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

class TestClaudeDto {
  prompt?: string;
}

class ClaudeQueryDto {
  prompt!: string;
  system?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

class AiAssistDto implements AiAssistInput {
  prompt?: string;
  image?: {
    mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
    base64Data: string;
  };
  docTypeHint?: "EHLIYET" | "RUHSAT" | "AUTO";
}

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
      temperature: dto.temperature,
    });
  }

  /** Filomonline Akıllı Asistan: Metin, Ses veya Görseli (Ehliyet, Ruhsat) analiz edip aksiyon üretir */
  @Post("ai/assist")
  assist(@Body() dto: AiAssistDto) {
    return this.claude.assist(dto);
  }
}
