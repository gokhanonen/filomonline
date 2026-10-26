// MinIO'da 'filomonline' bucket'ı yoksa oluşturur. Doğrudan yerel MinIO'ya konuşur
// (http://127.0.0.1:9000) — nginx/SSL henüz hazır olmasa da çalışsın diye.
// Çalıştırma: (cd apps/api && node ../../deploy/ensure-bucket.cjs)
const fs = require("fs");
const path = require("path");

function readEnv(file) {
  const out = {};
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) out[m[1]] = m[2].replace(/^"(.*)"$/, "$1").trim();
  }
  return out;
}

(async () => {
  const env = readEnv(path.join(process.cwd(), ".env"));
  const endpoint = process.env.MINIO_LOCAL || "http://127.0.0.1:9000";
  const bucket = env.S3_BUCKET || "filomonline";
  const sdkPath = require.resolve("@aws-sdk/client-s3", { paths: [process.cwd(), path.join(process.cwd(), "node_modules")] });
  const { S3Client, HeadBucketCommand, CreateBucketCommand } = require(sdkPath);

  const client = new S3Client({
    region: env.S3_REGION || "us-east-1",
    endpoint,
    forcePathStyle: true,
    credentials: { accessKeyId: env.S3_ACCESS_KEY, secretAccessKey: env.S3_SECRET_KEY },
  });

  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
    console.log(`MinIO bucket '${bucket}' zaten var.`);
  } catch {
    try {
      await client.send(new CreateBucketCommand({ Bucket: bucket }));
      console.log(`MinIO bucket '${bucket}' oluşturuldu.`);
    } catch (e) {
      console.log(`UYARI: bucket oluşturulamadı (${e.name || e.message}). MinIO konsolundan '${bucket}' bucket'ını elle açabilirsin.`);
    }
  }
})();
