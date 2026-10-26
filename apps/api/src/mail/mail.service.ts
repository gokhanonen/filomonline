import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { createTransport } from "nodemailer";
import { SettingsService } from "../settings/settings.service";
import { isMasked, maskValue } from "../settings/secrets";

/** Platform geneli ayarlar (Claude ile aynı): tüm firmalar bu SMTP hesabından gönderir */
const SYSTEM_COMPANY_ID = "system";
const SETTING_KEY = "integrations.smtp";

export interface SmtpConfig {
  host: string;
  port: number;
  /** true: SSL (465), false: STARTTLS (587) */
  secure: boolean;
  username: string;
  password: string;
  fromEmail: string;
  fromName: string;
}

export interface SendMailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Gönderen adı (ör. firma adı); boşsa ayardaki fromName */
  fromName?: string;
  /** Müşteri yanıtladığında gideceği adres (satış danışmanı / firma) */
  replyTo?: string | null;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly settings: SettingsService) {}

  private async getRaw(): Promise<SmtpConfig | null> {
    return this.settings.getRaw<SmtpConfig>(SYSTEM_COMPANY_ID, SETTING_KEY);
  }

  /** Süper admin ekranı için — şifre maskeli */
  async getConfigForAdmin() {
    const c = await this.getRaw();
    return {
      isConfigured: Boolean(c?.host && c?.username && c?.password),
      host: c?.host ?? "",
      port: c?.port ?? 465,
      secure: c?.secure ?? true,
      username: c?.username ?? "",
      maskedPassword: c?.password ? maskValue(c.password) : "",
      fromEmail: c?.fromEmail ?? "",
      fromName: c?.fromName ?? "FilomOnline",
    };
  }

  async updateConfig(dto: Partial<SmtpConfig>) {
    const current = await this.getRaw();
    const password = !dto.password || isMasked(dto.password) ? current?.password ?? "" : dto.password;
    const next: SmtpConfig = {
      host: dto.host?.trim() ?? current?.host ?? "",
      port: dto.port ?? current?.port ?? 465,
      secure: dto.secure ?? current?.secure ?? true,
      username: dto.username?.trim() ?? current?.username ?? "",
      password,
      fromEmail: dto.fromEmail?.trim() || dto.username?.trim() || current?.fromEmail || "",
      fromName: dto.fromName?.trim() ?? current?.fromName ?? "FilomOnline",
    };
    await this.settings.set(SYSTEM_COMPANY_ID, SETTING_KEY, next);
    return this.getConfigForAdmin();
  }

  private async transport() {
    const c = await this.getRaw();
    if (!c?.host || !c.username || !c.password) {
      throw new BadRequestException("E-posta gönderimi tanımlı değil. Süper Admin > E-posta (SMTP) ayarlarını doldurun.");
    }
    return {
      config: c,
      transporter: createTransport({
        host: c.host,
        port: c.port,
        secure: c.secure,
        auth: { user: c.username, pass: c.password },
        connectionTimeout: 15_000,
      }),
    };
  }

  private smtpError(err: unknown): never {
    const e = err as { code?: string; message?: string };
    this.logger.warn(`SMTP hatası: ${e.code ?? ""} ${e.message ?? ""}`);
    if (e.code === "EAUTH") throw new BadRequestException("E-posta sunucusu kullanıcı adı/şifreyi kabul etmedi. Süper Admin > E-posta ayarlarını kontrol edin.");
    if (e.code === "EDNS" || e.code === "ECONNECTION" || e.code === "ETIMEDOUT" || e.code === "ESOCKET") {
      throw new BadRequestException(`E-posta sunucusuna bağlanılamadı (${e.code}). Sunucu adı/port ayarını kontrol edin.`);
    }
    throw new BadRequestException(`E-posta gönderilemedi: ${e.message ?? "bilinmeyen hata"}`);
  }

  async send(input: SendMailInput) {
    const { config, transporter } = await this.transport();
    try {
      const info = await transporter.sendMail({
        from: { name: input.fromName || config.fromName || "FilomOnline", address: config.fromEmail || config.username },
        to: input.to,
        replyTo: input.replyTo || undefined,
        subject: input.subject,
        html: input.html,
        text: input.text,
      });
      return { messageId: info.messageId };
    } catch (err) {
      this.smtpError(err);
    }
  }

  /** Süper admin: bağlantıyı doğrula, adres verilirse deneme e-postası gönder */
  async test(to?: string) {
    const { transporter } = await this.transport();
    const started = Date.now();
    try {
      await transporter.verify();
    } catch (err) {
      this.smtpError(err);
    }
    if (to) {
      await this.send({
        to,
        subject: "FilomOnline e-posta testi",
        text: "Bu bir deneme e-postasıdır. SMTP ayarlarınız çalışıyor.",
        html: "<p>Bu bir deneme e-postasıdır. <b>SMTP ayarlarınız çalışıyor.</b></p>",
      });
    }
    return { success: true, sentTo: to ?? null, latencyMs: Date.now() - started };
  }
}
