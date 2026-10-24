import { IsIn, IsString, Matches } from "class-validator";

const SCOPES = [
  "vehicle-photos",
  "documents",
  "logos",
  "contracts",
  "tramer",
] as const;

export class PresignUploadDto {
  @IsString()
  fileName: string;

  @IsString()
  contentType: string;

  @IsIn(SCOPES as unknown as string[])
  scope: (typeof SCOPES)[number];
}

export class PresignDownloadDto {
  // Anahtar her zaman companyId ile başlamalı (izolasyon doğrulaması serviste)
  @Matches(/^[^/]+\/[^/]+\/.+/, { message: "Geçersiz nesne anahtarı" })
  key: string;
}
