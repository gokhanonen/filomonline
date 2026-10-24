import { SetMetadata } from "@nestjs/common";

export const SKIP_COMPANY_KEY = "skipCompany";
/**
 * Endpoint'i şirket bağlamı zorunluluğundan muaf tutar.
 * Örn: /auth/me, şirket listesi, süper admin endpoint'leri.
 */
export const SkipCompany = () => SetMetadata(SKIP_COMPANY_KEY, true);
