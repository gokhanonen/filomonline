import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

/**
 * S3 uyumlu depolama (lokalde MinIO, prod'da S3/R2).
 * Nesne anahtarı tenant/şirket bazlı klasörlenir: {companyId}/{scope}/{uuid-ad}
 * İstemci yüklemeleri presigned PUT URL ile doğrudan depoya yapar;
 * API dosya trafiğini taşımaz.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(config: ConfigService) {
    this.bucket = config.get("S3_BUCKET", "filomonline");
    this.client = new S3Client({
      region: config.get("S3_REGION", "us-east-1"),
      endpoint: config.get("S3_ENDPOINT"),
      forcePathStyle: true, // MinIO için gerekli
      credentials: {
        accessKeyId: config.getOrThrow("S3_ACCESS_KEY"),
        secretAccessKey: config.getOrThrow("S3_SECRET_KEY"),
      },
    });
  }

  buildKey(companyId: string, scope: string, fileName: string): string {
    const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    return `${companyId}/${scope}/${randomUUID()}-${safe}`;
  }

  /** İstemcinin doğrudan yükleme yapması için presigned PUT URL üretir. */
  async presignUpload(
    key: string,
    contentType: string,
    expiresIn = 900,
  ): Promise<{ key: string; uploadUrl: string }> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });
    const uploadUrl = await getSignedUrl(this.client, command, { expiresIn });
    return { key, uploadUrl };
  }

  /** Nesneyi okumak için geçici imzalı URL. */
  async presignDownload(key: string, expiresIn = 3600): Promise<string> {
    if (!key) return "";
    if (
      key.startsWith("http://") ||
      key.startsWith("https://") ||
      key.startsWith("data:") ||
      key.startsWith("blob:")
    ) {
      return key;
    }
    try {
      const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
      return await getSignedUrl(this.client, command, { expiresIn });
    } catch (e) {
      this.logger.warn(`presignDownload başarısız: ${key} — ${(e as Error).message}`);
      return "";
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.client.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
      );
    } catch (e) {
      this.logger.warn(`Nesne silinemedi: ${key} — ${(e as Error).message}`);
    }
  }
}
