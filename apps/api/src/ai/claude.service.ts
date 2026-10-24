import {
  BadRequestException,
  Injectable,
  Logger,
} from "@nestjs/common";
import { SettingsService } from "../settings/settings.service";
import { maskValue, isMasked } from "../settings/secrets";

export interface ClaudeConfig {
  apiKey?: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
}

export interface ClaudeMessageParams {
  prompt: string;
  system?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface ClaudeResponse {
  text: string;
  model: string;
  latencyMs: number;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

export const CLAUDE_MODELS = [
  {
    id: "claude-3-5-haiku-20241022",
    name: "Claude 3.5 Haiku (Önerilen)",
    description: "Hızlı, maliyet etkin ve yüksek zeka performansı.",
    default: true,
  },
  {
    id: "claude-3-haiku-20240307",
    name: "Claude 3 Haiku",
    description: "Ultra hafif ve ekonomik temel model.",
    default: false,
  },
  {
    id: "claude-3-5-sonnet-20241022",
    name: "Claude 3.5 Sonnet",
    description: "Karmaşık analiz, kodlama ve ileri düzey akıl yürütme.",
    default: false,
  },
  {
    id: "claude-3-opus-20240229",
    name: "Claude 3 Opus",
    description: "En kapsamlı ve detaylı akıl yürütme modeli.",
    default: false,
  },
];

const SETTING_KEY = "integrations.claude";
const SYSTEM_COMPANY_ID = "system";

@Injectable()
export class ClaudeService {
  private readonly logger = new Logger(ClaudeService.name);

  constructor(private readonly settings: SettingsService) {}

  /** Gerçek API anahtarı ve konfigürasyonu alır (arka plan kullanımı için) */
  async getActiveConfig(): Promise<{ apiKey: string; model: string; maxTokens: number; temperature: number }> {
    const raw = (await this.settings.getRaw<ClaudeConfig>(SYSTEM_COMPANY_ID, SETTING_KEY)) ?? null;

    let apiKey = raw?.apiKey || "";
    // DB'de yoksa veya maskeli ise ortam değişkenlerine bak
    if (!apiKey || isMasked(apiKey)) {
      apiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY || "";
    }

    const model = raw?.model || process.env.CLAUDE_MODEL || "claude-3-5-haiku-20241022";
    const maxTokens = raw?.maxTokens || 1024;
    const temperature = raw?.temperature ?? 0.7;

    return { apiKey, model, maxTokens, temperature };
  }

  /** Dış dünyaya (UI) dönen maskeli konfigürasyon */
  async getConfigForAdmin() {
    const active = await this.getActiveConfig();
    return {
      isConfigured: Boolean(active.apiKey),
      maskedApiKey: active.apiKey ? maskValue(active.apiKey) : "",
      model: active.model,
      maxTokens: active.maxTokens,
      temperature: active.temperature,
      availableModels: CLAUDE_MODELS,
    };
  }

  /** Süper admin tarafından konfigürasyonu kaydetme */
  async updateConfig(dto: { apiKey?: string; model?: string; maxTokens?: number; temperature?: number }) {
    const active = await this.getActiveConfig();

    let newApiKey = dto.apiKey;
    // Eğer maskeli veya boş geldiyse mevcut API anahtarını koru
    if (!newApiKey || isMasked(newApiKey)) {
      newApiKey = active.apiKey;
    }

    const newConfig: ClaudeConfig = {
      apiKey: newApiKey,
      model: dto.model || active.model || "claude-3-5-haiku-20241022",
      maxTokens: dto.maxTokens || active.maxTokens || 1024,
      temperature: dto.temperature ?? active.temperature ?? 0.7,
    };

    await this.settings.set(SYSTEM_COMPANY_ID, SETTING_KEY, newConfig);
    return this.getConfigForAdmin();
  }

  /** Claude API'ye mesaj gönderip yanıt alma */
  async sendMessage(params: ClaudeMessageParams): Promise<ClaudeResponse> {
    const config = await this.getActiveConfig();

    if (!config.apiKey) {
      throw new BadRequestException("Claude API anahtarı tanımlanmamış. Lütfen Süper Admin panelinden anahtar giriniz.");
    }

    const model = params.model || config.model;
    const maxTokens = params.maxTokens || config.maxTokens;
    const temperature = params.temperature ?? config.temperature;

    const startTime = Date.now();

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": config.apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          temperature,
          system: params.system,
          messages: [{ role: "user", content: params.prompt }],
        }),
      });

      const latencyMs = Date.now() - startTime;

      if (!response.ok) {
        const errJson = (await response.json().catch(() => ({}))) as {
          error?: { message?: string; type?: string };
        };
        const errorMsg = errJson?.error?.message || `Anthropic API hatası (HTTP ${response.status})`;
        this.logger.error(`Claude çağrısı başarısız: ${errorMsg}`);
        throw new BadRequestException(`Claude API Hatası: ${errorMsg}`);
      }

      const data = (await response.json()) as {
        content?: Array<{ type: string; text?: string }>;
        model: string;
        usage?: { input_tokens: number; output_tokens: number };
      };

      const text = data.content?.find((c) => c.type === "text")?.text ?? "";

      return {
        text,
        model: data.model || model,
        latencyMs,
        usage: data.usage
          ? {
              inputTokens: data.usage.input_tokens,
              outputTokens: data.usage.output_tokens,
            }
          : undefined,
      };
    } catch (err: unknown) {
      if (err instanceof BadRequestException) throw err;
      const message = (err as Error)?.message || "Bilinmeyen hata";
      this.logger.error(`Claude bağlantı hatası: ${message}`);
      throw new BadRequestException(`Claude bağlantı hatası: ${message}`);
    }
  }

  /** Bağlantıyı ve modelin yanıt verip vermediğini test etme */
  async testConnection(testPrompt = "Merhaba! FilomOnline sisteminden bağlantı testi. Kısa bir onay mesajı ver.") {
    const res = await this.sendMessage({
      prompt: testPrompt,
      system: "Sen FilomOnline sistemine entegre edilmiş bir asistansın. Türkçe, profesyonel ve kısa yanıt ver.",
      maxTokens: 200,
    });

    return {
      success: true,
      model: res.model,
      response: res.text,
      latencyMs: res.latencyMs,
      usage: res.usage,
    };
  }
}
