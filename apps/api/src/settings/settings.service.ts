import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { maskSecrets, mergeSecrets } from "./secrets";

/**
 * Şirket ayarları: key/value (JSON). Bilinen anahtarlar:
 *  company.info         {title, mersisNo, tradeRegistryNo, taxOffice, taxNumber, address, phone, email, website, ibans[], defaultVehicleInterestRate}
 *  invoice.defaults     {vatRate, profitVatRate, serviceFeeMultiplier, currency}
 *  numbering            {salesContractPrefix, rentalContractPrefix, expensePrefix}
 *  vehicle.defaults     {defaultLocationId, requireTransferApproval, stockAlertDays}
 *  notifications        {optionExpiryDays, documentExpiryDays, rentalEndDays}
 *  integrations.gemini  {apiKey, model}            (apiKey okunurken maskelenir)
 *  integrations.smtp    {host, port, username, password, fromEmail, fromName, secure}
 */
@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Dış dünyaya giden okuma — gizli alanlar maskeli */
  async getAll(companyId: string): Promise<Record<string, unknown>> {
    const rows = await this.prisma.setting.findMany({ where: { companyId } });
    return Object.fromEntries(rows.map((r) => [r.key, maskSecrets(r.value)]));
  }

  async get<T = unknown>(companyId: string, key: string): Promise<T | null> {
    const raw = await this.getRaw<T>(companyId, key);
    return raw === null ? null : maskSecrets(raw);
  }

  /** Sunucu içi kullanım — maskesiz gerçek değer (asla HTTP'ye dönmeyin) */
  async getRaw<T = unknown>(companyId: string, key: string): Promise<T | null> {
    const row = await this.prisma.setting.findUnique({
      where: { companyId_key: { companyId, key } },
    });
    return (row?.value as T) ?? null;
  }

  async set(companyId: string, key: string, value: unknown) {
    const existing = await this.getRaw(companyId, key);
    const v = mergeSecrets(value, existing) as Prisma.InputJsonValue;
    const row = await this.prisma.setting.upsert({
      where: { companyId_key: { companyId, key } },
      create: { companyId, key, value: v },
      update: { value: v },
    });
    return { key: row.key, value: maskSecrets(row.value) };
  }

  async setMany(companyId: string, values: Record<string, unknown>) {
    for (const [key, value] of Object.entries(values)) {
      await this.set(companyId, key, value);
    }
    return this.getAll(companyId);
  }

  /** Numaralandırma: prefix + yıl + artan sayaç (ör. SS-2026-0001) */
  async nextNumber(companyId: string, counterKey: string, prefix: string): Promise<string> {
    const current = (await this.getRaw<number>(companyId, counterKey)) ?? 0;
    const next = current + 1;
    await this.set(companyId, counterKey, next);
    return `${prefix}${new Date().getFullYear()}-${String(next).padStart(4, "0")}`;
  }

  /** Google Gemini model listesi (kayıtlı API anahtarıyla, sunucu tarafında) */
  async geminiModels(companyId: string): Promise<{ models: string[]; message?: string }> {
    const cfg = await this.getRaw<{ apiKey?: string }>(companyId, "integrations.gemini");
    const key = cfg?.apiKey?.trim();
    if (!key) return { models: [], message: "Gemini API anahtarı tanımlı değil" };
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}&pageSize=200`,
      );
      if (!res.ok) return { models: [], message: `Google API hatası: ${res.status}` };
      const data = (await res.json()) as {
        models?: { name: string; supportedGenerationMethods?: string[] }[];
      };
      const models = (data.models ?? [])
        .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
        .map((m) => m.name.replace(/^models\//, ""))
        .sort();
      return { models };
    } catch (e) {
      return { models: [], message: `Bağlantı hatası: ${(e as Error).message}` };
    }
  }
}
