import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_KEY = "isPublic";
/** Endpoint'i JWT zorunluluğundan muaf tutar (login, refresh, health...). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
