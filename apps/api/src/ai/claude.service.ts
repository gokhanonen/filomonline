import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { SettingsService } from "../settings/settings.service";
import { maskValue, isMasked } from "../settings/secrets";
import { ASSIST_SYSTEM_PROMPT, AssistOption, AssistOutput, AssistOutputSchema, assistOptions, normalizeAssist } from "./assist.schema";

export interface ClaudeConfig {
  apiKey?: string;
  model: string;
  maxTokens?: number;
}

export interface ClaudeImageContent {
  mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
  base64Data: string;
}

export interface ClaudeMessageParams {
  prompt: string;
  images?: ClaudeImageContent[];
  system?: string;
  model?: string;
  maxTokens?: number;
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

export interface AiAssistInput {
  prompt?: string;
  /** En fazla 3 fotoğraf (ehliyet / kimlik / ruhsat, ön-arka) */
  images?: ClaudeImageContent[];
}

export type AiAssistResult = AssistOutput & {
  /** Kullanıcıya sunulacak kart seçenekleri, önerilen başta */
  options: AssistOption[];
  modelUsed: string;
  latencyMs: number;
};

export const MAX_ASSIST_IMAGES = 3;

export const DEFAULT_CLAUDE_MODEL = "claude-haiku-5-5";

export const CLAUDE_MODELS = [
  {
    id: DEFAULT_CLAUDE_MODEL,
    name: "Claude Haiku 5.5 (Önerilen)",
    description: "Hızlı, maliyet etkin ve yüksek zeka performansı.",
    default: true,
  },
  {
    id: "claude-sonnet-5-5",
    name: "Claude Sonnet 5.5",
    description: "Karmaşık analiz, kodlama ve ileri düzey akıl yürütme.",
    default: false,
  },
  {
    id: "claude-opus-5-5",
    name: "Claude Opus 5.5",
    description: "En kapsamlı ve detaylı akıl yürütme modeli.",
    default: false,
  },
];

/** DB'de listede olmayan (emekli edilmiş) bir model kayıtlıysa varsayılana düşer */
const isKnownModel = (id?: string) => !!id && CLAUDE_MODELS.some((m) => m.id === id);

const SETTING_KEY = "integrations.claude";
const SYSTEM_COMPANY_ID = "system";
const DEFAULT_MAX_TOKENS = 16000;
/** Güncel modellerde düşünme (thinking) çıktı limitini paylaşır; çok düşük limit boş yanıta yol açar */
const MIN_MAX_TOKENS = 4096;

@Injectable()
export class ClaudeService {
  private readonly logger = new Logger(ClaudeService.name);

  constructor(private readonly settings: SettingsService) {}

  /** Gerçek API anahtarı ve konfigürasyonu alır (arka plan kullanımı için) */
  async getActiveConfig(): Promise<ClaudeConfig> {
    // getRaw: gizli alanlar maskesiz (get() apiKey'i "••••" ile maskeler)
    const raw = await this.settings.getRaw<ClaudeConfig>(SYSTEM_COMPANY_ID, SETTING_KEY);
    let apiKey = raw?.apiKey || "";

    // DB'de yoksa veya maskeli ise ortam değişkenlerine bak
    if (!apiKey || isMasked(apiKey)) {
      apiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY || "";
    }

    const model = (isKnownModel(raw?.model) && raw?.model) || process.env.CLAUDE_MODEL || DEFAULT_CLAUDE_MODEL;
    const maxTokens = raw?.maxTokens || DEFAULT_MAX_TOKENS;

    return { apiKey, model, maxTokens };
  }

  /** Dış dünyaya (UI) dönen maskeli konfigürasyon */
  async getConfigForAdmin() {
    const active = await this.getActiveConfig();
    return {
      isConfigured: Boolean(active.apiKey),
      maskedApiKey: active.apiKey ? maskValue(active.apiKey) : "",
      model: active.model,
      maxTokens: active.maxTokens,
      availableModels: CLAUDE_MODELS,
    };
  }

  /** Süper admin tarafından konfigürasyonu kaydetme */
  async updateConfig(dto: { apiKey?: string; model?: string; maxTokens?: number }) {
    const active = await this.getActiveConfig();

    let newApiKey = dto.apiKey;
    if (!newApiKey || isMasked(newApiKey)) {
      newApiKey = active.apiKey;
    }

    const newConfig: ClaudeConfig = {
      apiKey: newApiKey,
      model: dto.model || active.model || DEFAULT_CLAUDE_MODEL,
      maxTokens: dto.maxTokens || active.maxTokens || DEFAULT_MAX_TOKENS,
    };

    await this.settings.set(SYSTEM_COMPANY_ID, SETTING_KEY, newConfig);
    return this.getConfigForAdmin();
  }

  private async client() {
    const config = await this.getActiveConfig();
    if (!config.apiKey) {
      throw new BadRequestException("Claude API anahtarı tanımlanmamış. Süper Admin > AI ayarlarından anahtar giriniz.");
    }
    return { client: new Anthropic({ apiKey: config.apiKey }), config };
  }

  private apiError(err: unknown): never {
    if (err instanceof BadRequestException) throw err;
    if (err instanceof Anthropic.AuthenticationError) {
      throw new BadRequestException("Claude API anahtarı geçersiz. Süper Admin > AI ayarlarını kontrol edin.");
    }
    if (err instanceof Anthropic.RateLimitError) {
      throw new BadRequestException("Claude istek limiti aşıldı, biraz sonra tekrar deneyin.");
    }
    if (err instanceof Anthropic.APIError) {
      this.logger.error(`Claude API hatası ${err.status}: ${err.message}`);
      throw new BadRequestException(`Claude API hatası: ${err.message}`);
    }
    const message = (err as Error)?.message || "Bilinmeyen hata";
    this.logger.error(`Claude bağlantı hatası: ${message}`);
    throw new BadRequestException(`Claude bağlantı hatası: ${message}`);
  }

  private static content(prompt: string, images: ClaudeImageContent[] = []): Anthropic.ContentBlockParam[] {
    const blocks: Anthropic.ContentBlockParam[] = [];
    images.forEach((img, i) => {
      if (images.length > 1) blocks.push({ type: "text", text: `Fotoğraf ${i + 1}:` });
      blocks.push({ type: "image", source: { type: "base64", media_type: img.mediaType, data: img.base64Data } });
    });
    blocks.push({ type: "text", text: prompt });
    return blocks;
  }

  /** Claude API'ye mesaj gönderip metin yanıt alma (metin + görsel) */
  async sendMessage(params: ClaudeMessageParams): Promise<ClaudeResponse> {
    const { client, config } = await this.client();
    const model = params.model || config.model;
    const startTime = Date.now();
    try {
      const response = await client.messages.create({
        model,
        max_tokens: Math.max(params.maxTokens || config.maxTokens || DEFAULT_MAX_TOKENS, MIN_MAX_TOKENS),
        system: params.system,
        messages: [{ role: "user", content: ClaudeService.content(params.prompt || "Lütfen bu görseli analiz et.", params.images) }],
      });
      if (response.stop_reason === "refusal") {
        throw new BadRequestException("Claude bu isteği yanıtlamayı reddetti.");
      }
      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("");
      return {
        text,
        model: response.model,
        latencyMs: Date.now() - startTime,
        usage: { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens },
      };
    } catch (err) {
      this.apiError(err);
    }
  }

  /**
   * Akıllı asistan: metin ya da en fazla 3 fotoğraf (ehliyet/kimlik/ruhsat).
   * Belgeyi sınıflandırır, alanları çıkarır ve hangi kartın açılacağını önerir.
   */
  async assist(input: AiAssistInput): Promise<AiAssistResult> {
    const images = input.images ?? [];
    const prompt = input.prompt?.trim() ?? "";
    if (!images.length && !prompt) throw new BadRequestException("Bir metin yazın ya da fotoğraf ekleyin.");
    if (images.length > MAX_ASSIST_IMAGES) throw new BadRequestException(`En fazla ${MAX_ASSIST_IMAGES} fotoğraf gönderilebilir.`);

    const { client, config } = await this.client();
    const startTime = Date.now();
    try {
      const response = await client.messages.parse({
        model: config.model,
        max_tokens: DEFAULT_MAX_TOKENS,
        system: ASSIST_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: ClaudeService.content(
              prompt || (images.length > 1 ? "Ekteki fotoğrafları incele." : "Ekteki fotoğrafı incele."),
              images,
            ),
          },
        ],
        output_config: { format: zodOutputFormat(AssistOutputSchema) },
      });

      if (response.stop_reason === "refusal") {
        throw new BadRequestException("AI bu içeriği işlemeyi reddetti.");
      }
      if (response.stop_reason === "max_tokens" || !response.parsed_output) {
        throw new BadRequestException("AI yanıtı tamamlanamadı, lütfen tekrar deneyin.");
      }
      const out = normalizeAssist(response.parsed_output);
      return { ...out, options: assistOptions(out), modelUsed: response.model, latencyMs: Date.now() - startTime };
    } catch (err) {
      this.apiError(err);
    }
  }

  /** Bağlantıyı ve modelin yanıt verip vermediğini test etme */
  async testConnection(testPrompt = "Merhaba! FilomOnline sisteminden bağlantı testi. Kısa bir onay mesajı ver.") {
    const res = await this.sendMessage({
      prompt: testPrompt,
      system: "Sen FilomOnline sistemine entegre edilmiş bir asistansın. Türkçe, profesyonel ve kısa yanıt ver.",
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
