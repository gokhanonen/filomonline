import { useEffect, useState } from "react";
import axios from "@/utils/axios";

export type StorageScope =
  | "vehicle-photos"
  | "documents"
  | "logos"
  | "contracts"
  | "tramer"
  | "avatars";

interface PresignUpload {
  key: string;
  uploadUrl: string;
}

/** İmzalı yükleme URL'i al, sonra blob'u doğrudan depoya (MinIO/S3) PUT et. Nesne anahtarını döner. */
export async function uploadBlob(
  blob: Blob,
  fileName: string,
  scope: StorageScope,
): Promise<string> {
  const contentType = blob.type || "application/octet-stream";
  const { data } = await axios.post<PresignUpload>("/storage/presign-upload", {
    fileName,
    contentType,
    scope,
  });
  const res = await fetch(data.uploadUrl, {
    method: "PUT",
    body: blob,
    headers: { "Content-Type": contentType },
  });
  if (!res.ok) throw new Error("Dosya yüklenemedi");
  return data.key;
}

/** Nesneyi görüntülemek için geçici imzalı URL. */
export async function presignDownload(key: string): Promise<string> {
  const { data } = await axios.post<{ url: string }>("/storage/presign-download", { key });
  return data.url;
}

/** URL veya S3 anahtarını doğrudan görüntülenebilir tam URL'e dönüştürür */
export async function resolveFileUrl(keyOrUrl?: string | null): Promise<string> {
  if (!keyOrUrl) return "";
  if (
    keyOrUrl.startsWith("http://") ||
    keyOrUrl.startsWith("https://") ||
    keyOrUrl.startsWith("blob:") ||
    keyOrUrl.startsWith("data:")
  ) {
    return keyOrUrl;
  }
  try {
    return await presignDownload(keyOrUrl);
  } catch {
    return "";
  }
}

/** React bileşenlerinde avatar / logo gibi S3 anahtarlarını otomatik çözmek için hook */
export function useFileUrl(keyOrUrl?: string | null): string {
  const [url, setUrl] = useState<string>(() => {
    if (!keyOrUrl) return "";
    if (
      keyOrUrl.startsWith("http://") ||
      keyOrUrl.startsWith("https://") ||
      keyOrUrl.startsWith("blob:") ||
      keyOrUrl.startsWith("data:")
    ) {
      return keyOrUrl;
    }
    return "";
  });

  useEffect(() => {
    let cancelled = false;
    if (!keyOrUrl) {
      setUrl("");
      return;
    }
    if (
      keyOrUrl.startsWith("http://") ||
      keyOrUrl.startsWith("https://") ||
      keyOrUrl.startsWith("blob:") ||
      keyOrUrl.startsWith("data:")
    ) {
      setUrl(keyOrUrl);
      return;
    }

    presignDownload(keyOrUrl)
      .then((signed) => {
        if (!cancelled) setUrl(signed);
      })
      .catch(() => {
        if (!cancelled) setUrl("");
      });

    return () => {
      cancelled = true;
    };
  }, [keyOrUrl]);

  return url;
}
