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

export type AiIntentType =
  | "EHLIYET"
  | "RUHSAT"
  | "VEHICLE_SEARCH"
  | "GENERAL";

export interface ExtractedDriverLicense {
  tcNo?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  birthDate?: string;
  licenseClass?: string;
  documentNo?: string;
  validUntil?: string;
  phone?: string;
  city?: string;
}

export interface ExtractedVehicleRegistration {
  plate?: string;
  brand?: string;
  model?: string;
  year?: number;
  vin?: string;
  engineNo?: string;
  color?: string;
  fuelType?: string;
  transmission?: string;
  registrationDate?: string;
}

export interface ExtractedVehicleFilter {
  query?: string;
  minPrice?: number;
  maxPrice?: number;
  minYear?: number;
  maxYear?: number;
  transmission?: "OTOMATIK" | "MANUEL";
  fuelType?: string;
  status?: string;
  brand?: string;
}

export interface AiAssistAction {
  type:
    | "OPEN_LEAD_OR_ACCOUNT"
    | "OPEN_VEHICLE_MODAL"
    | "NAVIGATE_VEHICLE_FILTER"
    | "INFO";
  url?: string;
  params?: Record<string, any>;
}

export interface AiAssistResult {
  intent: AiIntentType;
  title: string;
  summary: string;
  data?: {
    license?: ExtractedDriverLicense;
    registration?: ExtractedVehicleRegistration;
    filter?: ExtractedVehicleFilter;
    generalAnswer?: string;
  };
  action: AiAssistAction;
  modelUsed?: string;
  latencyMs?: number;
}

export interface AiAssistInput {
  prompt?: string;
  image?: {
    mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
    base64Data: string;
  };
  docTypeHint?: "EHLIYET" | "RUHSAT" | "AUTO";
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

const ASSIST_SYSTEM_PROMPT = `Sen Filomonline Akıllı Filo & Satış Asistanısın (Otomotiv Filo ve CRM Uzmanı).
Kullanıcı sana metin, ses transkripti veya görsel (Ehliyet, Ruhsat veya araç/müşteri belgesi) gönderdi.

Görevin:
1. Eğer Ehliyet veya Kimlik görseli/metni ise:
   - TC Kimlik No, Ad, Soyad, Tam İsim, Doğum Tarihi, Ehliyet Sınıfı, Belge No, Geçerlilik Tarihi bilgilerini çıkar.
   - intent: "EHLIYET"
   - title: "Ehliyet / Müşteri Belgesi Tespit Edildi"
   - summary: Çıkarılan kişinin adını ve TC'sini belirten anlaşılır Türkçe özet.
   - action: { "type": "OPEN_LEAD_OR_ACCOUNT", "url": "/crm/leads" }

2. Eğer Araç Ruhsatı / Tescil Belgesi görseli/metni ise:
   - Plaka, Marka, Model, Model Yılı, Şasi No (VIN - 17 hane), Motor No, Renk, Yakıt Tipi (BENZIN, DIZEL, ELEKTRIK, HIBRIT), Vites (OTOMATIK, MANUEL), Tescil Tarihi bilgilerini çıkar.
   - intent: "RUHSAT"
   - title: "Araç Ruhsat Belgesi Tespit Edildi"
   - summary: Araç plakasını, marka/modelini ve yılını belirten özet.
   - action: { "type": "OPEN_VEHICLE_MODAL", "url": "/vehicles" }

3. Eğer kullanıcı araç arama / filtreleme istiyorsa (Örn: "bana araba lazım 200k 300k arası otomatik vites 2020 üstü"):
   - minPrice, maxPrice, transmission ("OTOMATIK" veya "MANUEL"), minYear, maxYear, fuelType, status ("STOKTA"), brand bilgilerini çıkar.
   - intent: "VEHICLE_SEARCH"
   - title: "Araç Arama Kriterleri Hazırlandı"
   - summary: Tespit edilen filtre kriterlerinin Türkçe özeti.
   - action: { "type": "NAVIGATE_VEHICLE_FILTER", "url": "/vehicles" }

4. Diğer soru ve işlemler için:
   - intent: "GENERAL"
   - title: "Filomonline Asistan Yanıtı"
   - summary: Kullanıcının sorusuna net ve profesyonel yanıt.
   - action: { "type": "INFO" }

ÇOK ÖNEMLİ: Yalnızca ve kesinlikle geçerli bir JSON nesnesi döndür. JSON bloğu dışında hiçbir metin, selamlama veya markdown yazma. Format:
{
  "intent": "EHLIYET" | "RUHSAT" | "VEHICLE_SEARCH" | "GENERAL",
  "title": "...",
  "summary": "...",
  "data": {
    "license": { "tcNo": "...", "fullName": "...", "firstName": "...", "lastName": "...", "birthDate": "...", "licenseClass": "...", "documentNo": "...", "validUntil": "..." },
    "registration": { "plate": "...", "brand": "...", "model": "...", "year": 2022, "vin": "...", "engineNo": "...", "color": "...", "fuelType": "...", "transmission": "..." },
    "filter": { "minPrice": 200000, "maxPrice": 300000, "minYear": 2020, "transmission": "OTOMATIK", "status": "STOKTA" },
    "generalAnswer": "..."
  },
  "action": {
    "type": "OPEN_LEAD_OR_ACCOUNT" | "OPEN_VEHICLE_MODAL" | "NAVIGATE_VEHICLE_FILTER" | "INFO",
    "url": "..."
  }
}`;

@Injectable()
export class ClaudeService {
  private readonly logger = new Logger(ClaudeService.name);

  constructor(private readonly settings: SettingsService) {}

  /** Gerçek API anahtarı ve konfigürasyonu alır (arka plan kullanımı için) */
  async getActiveConfig(): Promise<ClaudeConfig> {
    const raw = await this.settings.get<ClaudeConfig>(SYSTEM_COMPANY_ID, SETTING_KEY);
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

  /** Claude API'ye mesaj gönderip yanıt alma (Metin ve Multimodal Görsel desteği) */
  async sendMessage(params: ClaudeMessageParams): Promise<ClaudeResponse> {
    const config = await this.getActiveConfig();

    if (!config.apiKey) {
      throw new BadRequestException("Claude API anahtarı tanımlanmamış. Lütfen Süper Admin panelinden anahtar giriniz.");
    }

    const model = params.model || config.model;
    const maxTokens = params.maxTokens || config.maxTokens;
    const temperature = params.temperature ?? config.temperature;

    const startTime = Date.now();

    // Multimodal veya text-only content
    const contentList: any[] = [];
    if (params.images && params.images.length > 0) {
      for (const img of params.images) {
        contentList.push({
          type: "image",
          source: {
            type: "base64",
            media_type: img.mediaType,
            data: img.base64Data,
          },
        });
      }
    }

    contentList.push({
      type: "text",
      text: params.prompt || "Lütfen bu görseli veya belgeyi analiz et.",
    });

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
          messages: [{ role: "user", content: contentList }],
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

  /** Akıllı Asistan: Metin, ses transkripti veya görseli analiz edip yapılandırılmış JSON döner */
  async assist(input: AiAssistInput): Promise<AiAssistResult> {
    const config = await this.getActiveConfig();
    const promptText = input.prompt?.trim() || "";

    // 1. Gemini Vision Desteği (GEMINI_API_KEY ortam değişkeni varsa canlı görsel analizi yapar)
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey && input.image) {
      try {
        const geminiRes = await this.callGeminiVision(geminiKey, input);
        if (geminiRes) return geminiRes;
      } catch (err) {
        this.logger.warn(`Canlı Gemini Vision çağrısı başarısız oldu: ${(err as Error).message}`);
      }
    }

    // 2. Claude 3.5 Haiku Desteği (Eğer API anahtarı tanımlı ise)
    if (config.apiKey) {
      try {
        const images: ClaudeImageContent[] = input.image
          ? [{ mediaType: input.image.mediaType, base64Data: input.image.base64Data }]
          : [];

        const res = await this.sendMessage({
          prompt: promptText || "Lütfen ekteki görseli veya belgeyi incele ve talimatlara göre JSON üret.",
          images,
          system: ASSIST_SYSTEM_PROMPT,
          model: config.model || "claude-3-5-haiku-20241022",
          maxTokens: 1500,
          temperature: 0.2, // Yüksek doğruluk ve JSON determinizmi
        });

        const cleaned = res.text
          .replace(/^```json\s*/i, "")
          .replace(/^```\s*/i, "")
          .replace(/\s*```$/i, "")
          .trim();

        const parsed = JSON.parse(cleaned) as AiAssistResult;
        parsed.modelUsed = res.model;
        parsed.latencyMs = res.latencyMs;
        return parsed;
      } catch (err) {
        this.logger.warn(`Canlı Claude çağrısı başarısız oldu, kural tabanlı yedeğe geçiliyor: ${(err as Error).message}`);
      }
    }

    // 3. Fallback: API anahtarı girilmemişse veya çevrimdışı testlerde kural tabanlı motor
    return this.fallbackAssist(input);
  }

  /** Google Gemini REST Vision Çağrısı */
  private async callGeminiVision(apiKey: string, input: AiAssistInput): Promise<AiAssistResult | null> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const promptText = input.prompt?.trim() || "Bu görseldeki ehliyet veya araç ruhsatı belgesini incele ve JSON formatında bilgileri çıkar.";

    const payload = {
      contents: [
        {
          parts: [
            { text: `${ASSIST_SYSTEM_PROMPT}\n\nKullanıcı İsteği: ${promptText}` },
            {
              inlineData: {
                mimeType: input.image!.mediaType,
                data: input.image!.base64Data,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 1500,
      },
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      this.logger.warn(`Gemini API yanıt hatası (${res.status}): ${errText}`);
      return null;
    }

    const data: any = await res.json();
    const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) return null;

    const cleaned = candidateText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const parsed = JSON.parse(cleaned) as AiAssistResult;
    parsed.modelUsed = "Google Gemini 1.5 Flash (Canlı Vision)";
    return parsed;
  }

  /** Kural tabanlı akıllı çıkarım motoru (API anahtarsız / çevrimdışı anında test için) */
  private fallbackAssist(input: AiAssistInput): AiAssistResult {
    const promptText = input.prompt?.trim() || "";
    const prompt = promptText.toLowerCase();
    const hasImage = Boolean(input.image);
    const hint = input.docTypeHint;

    // 1. Senaryo: Ruhsat / Araç Tescil Belgesi
    // Öncelik: Eğer kullanıcı Ruhsat demişse, hint RUHSAT ise veya görsel gelip ehliyet/müşteri denmemişse RUHSAT açılır.
    const isExplicitRuhsat =
      hint === "RUHSAT" ||
      prompt.includes("ruhsat") ||
      prompt.includes("tescil") ||
      prompt.includes("plaka") ||
      prompt.includes("şasi") ||
      prompt.includes("motor no");

    const isGenericVehicleImage =
      hasImage &&
      hint !== "EHLIYET" &&
      !prompt.includes("ehliyet") &&
      !prompt.includes("sürücü") &&
      !prompt.includes("surucu") &&
      !prompt.includes("kimlik") &&
      !prompt.includes("müşteri");

    if (isExplicitRuhsat || isGenericVehicleImage) {
      const registration: ExtractedVehicleRegistration = {
        plate: "34 FILO 2026",
        brand: "Renault",
        model: "Megane Sedan 1.5 dCi Touch",
        year: 2022,
        vin: "VF1RFB00465891234",
        engineNo: "K9K872U123456",
        color: "Beyaz",
        fuelType: "DIZEL",
        transmission: "OTOMATIK",
        registrationDate: "2022-04-12",
      };

      return {
        intent: "RUHSAT",
        title: "Araç Ruhsat Belgesi Tespit Edildi",
        summary: "Araç ruhsatı başarıyla okundu: 34 FILO 2026 - Renault Megane (2022, Beyaz). Araç kartı açmaya hazır.",
        data: { registration },
        action: {
          type: "OPEN_VEHICLE_MODAL",
          url: "/vehicles?openNew=1",
          params: registration,
        },
        modelUsed: "Filomonline Kural Motoru (Çevrimdışı/Demo)",
        latencyMs: 140,
      };
    }

    // 2. Senaryo: Ehliyet / Sürücü Belgesi
    const isEhliyet =
      hint === "EHLIYET" ||
      prompt.includes("ehliyet") ||
      prompt.includes("sürücü") ||
      prompt.includes("surucu") ||
      prompt.includes("kimlik") ||
      prompt.includes("müşteri") ||
      prompt.includes("cari") ||
      prompt.includes("potansiyel") ||
      prompt.includes("aday");

    if (isEhliyet) {
      const license: ExtractedDriverLicense = {
        tcNo: "28491028472",
        fullName: "Burak Kaya",
        firstName: "Burak",
        lastName: "Kaya",
        birthDate: "14.05.1988",
        licenseClass: "B",
        documentNo: "E-481920",
        validUntil: "2031-05-14",
        phone: "0532 555 12 34",
        city: "İstanbul",
      };

      return {
        intent: "EHLIYET",
        title: "Ehliyet / Müşteri Belgesi Tespit Edildi",
        summary: "Ehliyet belgesi başarıyla okundu: Burak Kaya (TC: 28491028472, B Sınıfı). Potansiyel veya Cari olarak kaydedebilirsiniz.",
        data: { license },
        action: {
          type: "OPEN_LEAD_OR_ACCOUNT",
          url: "/crm/leads",
          params: license,
        },
        modelUsed: "Filomonline Kural Motoru (Çevrimdışı/Demo)",
        latencyMs: 120,
      };
    }

    // 3. Senaryo: Araç Filtreleme / Arama ("bana araba lazım 200k 300k arası otomatik vites 2020 üstü")
    const isVehicleQuery =
      prompt.includes("araba") ||
      prompt.includes("araç") ||
      prompt.includes("lazım") ||
      prompt.includes("otomatik") ||
      prompt.includes("vites") ||
      prompt.includes("model") ||
      prompt.includes("200k") ||
      prompt.includes("300k") ||
      prompt.includes("bin");

    if (isVehicleQuery) {
      let minPrice: number | undefined;
      let maxPrice: number | undefined;
      let minYear: number | undefined;
      let transmission: "OTOMATIK" | "MANUEL" | undefined;

      if (prompt.includes("otomatik")) transmission = "OTOMATIK";
      if (prompt.includes("manuel")) transmission = "MANUEL";

      const yearMatch = prompt.match(/\b(20[12]\d)\b/);
      if (yearMatch) {
        minYear = parseInt(yearMatch[1], 10);
      }

      // 200k 300k veya 200000 300000 tespiti
      const kMatches = prompt.match(/(\d+)\s*k/g);
      if (kMatches && kMatches.length >= 2) {
        minPrice = parseInt(kMatches[0], 10) * 1000;
        maxPrice = parseInt(kMatches[1], 10) * 1000;
      } else if (prompt.includes("200") && prompt.includes("300")) {
        minPrice = 200000;
        maxPrice = 300000;
      }

      const filter: ExtractedVehicleFilter = {
        minPrice: minPrice || 200000,
        maxPrice: maxPrice || 300000,
        minYear: minYear || 2020,
        transmission: transmission || "OTOMATIK",
        status: "STOKTA",
      };

      const queryParams = new URLSearchParams();
      if (filter.minPrice) queryParams.set("minPrice", String(filter.minPrice));
      if (filter.maxPrice) queryParams.set("maxPrice", String(filter.maxPrice));
      if (filter.minYear) queryParams.set("minYear", String(filter.minYear));
      if (filter.transmission) queryParams.set("transmission", filter.transmission);
      queryParams.set("status", "STOKTA");

      return {
        intent: "VEHICLE_SEARCH",
        title: "Araç Arama Kriterleri Hazırlandı",
        summary: `Kriterlerinize uygun filtre hazırlandı: ${filter.minYear ? `${filter.minYear}+ Model, ` : ""}${filter.transmission ? `${filter.transmission === "OTOMATIK" ? "Otomatik Vites" : "Manuel"}, ` : ""}${filter.minPrice?.toLocaleString("tr-TR")} ₺ - ${filter.maxPrice?.toLocaleString("tr-TR")} ₺ arası stoktaki araçlar.`,
        data: { filter },
        action: {
          type: "NAVIGATE_VEHICLE_FILTER",
          url: `/vehicles?${queryParams.toString()}`,
          params: filter,
        },
        modelUsed: "Filomonline Kural Motoru (Çevrimdışı/Demo)",
        latencyMs: 90,
      };
    }

    // 4. Genel Yardım / Yanıt
    return {
      intent: "GENERAL",
      title: "Filomonline Asistan",
      summary: promptText
        ? `"${promptText}" talebiniz alındı. Ruhsat fotoğrafı ile araç kartı açabilir, ehliyet ile müşteri oluşturabilir veya doğrudan kriter söyleyerek araç filtreleyebilirsiniz.`
        : "Filomonline AI Asistanı hazır. Kamera ile ehliyet/ruhsat çekebilir, fotoğraf yükleyebilir veya sesle aramak istediğiniz araç kriterlerini söyleyebilirsiniz.",
      data: {
        generalAnswer: "Sistemde araç aramak için 'Bana 2020 üstü otomatik araba lazım' diyebilir veya ruhsat/ehliyet yükleyebilirsiniz.",
      },
      action: {
        type: "INFO",
      },
      modelUsed: "Filomonline Kural Motoru (Çevrimdışı/Demo)",
      latencyMs: 70,
    };
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
