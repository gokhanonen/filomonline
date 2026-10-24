import axios from "@/utils/axios";

export type StorageScope =
  | "vehicle-photos"
  | "documents"
  | "logos"
  | "contracts"
  | "tramer";

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
