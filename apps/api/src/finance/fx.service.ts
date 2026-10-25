import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";

export interface FxRate {
  code: string;
  name: string;
  buying: number;
  selling: number;
}

const TCMB_URL = "https://www.tcmb.gov.tr/kurlar/today.xml";
const CACHE_MS = 30 * 60 * 1000;
const WANTED = ["USD", "EUR", "GBP"];

/** TCMB günlük döviz kurları (30 dk önbellek). Kullanıcı formda kuru değiştirebilir. */
@Injectable()
export class FxService {
  private readonly logger = new Logger(FxService.name);
  private cache: { at: number; date: string | null; rates: FxRate[] } | null = null;

  async today() {
    if (this.cache && Date.now() - this.cache.at < CACHE_MS) return this.cache;
    try {
      const res = await fetch(TCMB_URL, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) throw new Error(`TCMB ${res.status}`);
      const xml = await res.text();
      const date = /Tarih="([^"]+)"/.exec(xml)?.[1] ?? null;
      const rates: FxRate[] = [];
      for (const m of xml.matchAll(/<Currency[^>]*CurrencyCode="([A-Z]{3})"[^>]*>([\s\S]*?)<\/Currency>/g)) {
        if (!WANTED.includes(m[1])) continue;
        const tag = (t: string) => Number(new RegExp(`<${t}>([^<]*)</${t}>`).exec(m[2])?.[1] || 0);
        const name = /<Isim>([^<]*)<\/Isim>/.exec(m[2])?.[1] ?? m[1];
        rates.push({ code: m[1], name, buying: tag("ForexBuying"), selling: tag("ForexSelling") });
      }
      this.cache = { at: Date.now(), date, rates };
      return this.cache;
    } catch (e) {
      this.logger.warn(`TCMB kurları alınamadı: ${(e as Error).message}`);
      if (this.cache) return this.cache;
      throw new ServiceUnavailableException("TCMB kurları şu an alınamıyor, kuru elle giriniz");
    }
  }
}
