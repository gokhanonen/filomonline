// FilomOnline — production web & reverse proxy sunucusu (PM2).
// Statik React SPA'yı (apps/web/dist) sunar, /api ve /socket.io isteklerini NestJS API'ye (API_PORT) proxy'ler.
// Sıfır harici bağımlılık (yalnızca Node.js yerleşik modülleri: http, fs, path, url, net).
import http from "node:http";
import net from "node:net";
import { createReadStream, promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");

const WEB_HOST = process.env.WEB_HOST || "0.0.0.0";
const WEB_PORT = Number(process.env.WEB_PORT || 5198);
const API_HOST = process.env.API_HOST || "127.0.0.1";
const API_PORT = Number(process.env.API_PORT || 5199);
const DIST = path.resolve(REPO_ROOT, process.env.WEB_DIST || "apps/web/dist");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
  ".map": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".pdf": "application/pdf",
};

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "SAMEORIGIN",
  "Referrer-Policy": "same-origin",
};

// /api/* veya /socket.io/* HTTP isteklerini NestJS API'ye proxy'ler
function proxyToApi(req, res) {
  const options = {
    host: API_HOST,
    port: API_PORT,
    method: req.method,
    path: req.url,
    headers: {
      ...req.headers,
      host: `${API_HOST}:${API_PORT}`,
      "x-forwarded-host": req.headers.host || "",
      "x-forwarded-for": req.socket.remoteAddress || "",
      "x-forwarded-proto": "http",
    },
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on("error", (err) => {
    if (!res.headersSent) {
      res.writeHead(502, { "Content-Type": "text/plain; charset=utf-8" });
    }
    res.end(`API bağlantı hatası: ${err.code || err.message}`);
  });

  req.pipe(proxyReq);
}

// Güvenli dosya yolu çözümü (Path traversal engelleme)
function resolveSafe(urlPath) {
  const clean = decodeURIComponent(urlPath.split("?")[0]);
  const full = path.resolve(DIST, "." + clean);
  const base = DIST.endsWith(path.sep) ? DIST : DIST + path.sep;
  if (full !== DIST && !full.startsWith(base)) return null;
  return full;
}

async function serveFile(res, filePath, { cacheControl } = {}) {
  const ext = path.extname(filePath).toLowerCase();
  const headers = {
    "Content-Type": MIME[ext] || "application/octet-stream",
    ...SECURITY_HEADERS,
  };
  if (cacheControl) headers["Cache-Control"] = cacheControl;
  res.writeHead(200, headers);
  createReadStream(filePath).pipe(res);
}

async function exists(p) {
  try {
    const s = await fs.stat(p);
    return s.isFile();
  } catch {
    return false;
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const urlPath = (req.url || "/").split("?")[0];

    // API ve Socket.io proxy
    if (
      urlPath === "/api" ||
      urlPath.startsWith("/api/") ||
      urlPath === "/socket.io" ||
      urlPath.startsWith("/socket.io/")
    ) {
      return proxyToApi(req, res);
    }

    // Hash'li build varlıkları (uzun süreli cache)
    if (urlPath.startsWith("/assets/")) {
      const f = resolveSafe(urlPath);
      if (f && (await exists(f))) {
        return serveFile(res, f, {
          cacheControl: "public, max-age=31536000, immutable",
        });
      }
      res.writeHead(404, SECURITY_HEADERS);
      return res.end("Varlık bulunamadı");
    }

    // Diğer statik dosyalar (favicon, logo, manifest vb.)
    const f = resolveSafe(urlPath);
    if (f && (await exists(f))) {
      return serveFile(res, f, { cacheControl: "public, max-age=3600" });
    }

    // SPA fallback (tüm rota istekleri index.html döner)
    const index = path.join(DIST, "index.html");
    if (await exists(index)) {
      return serveFile(res, index, { cacheControl: "no-cache, no-store, must-revalidate" });
    }

    res.writeHead(404, SECURITY_HEADERS);
    res.end("FilomOnline: Sayfa bulunamadı");
  } catch (err) {
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    }
    res.end(`Sunucu hatası: ${err.message}`);
  }
});

// WebSocket Upgrade desteği (Socket.io gerçek zamanlı güncellemeler)
server.on("upgrade", (req, clientSocket, head) => {
  const urlPath = (req.url || "/").split("?")[0];
  if (
    urlPath === "/socket.io" ||
    urlPath.startsWith("/socket.io/") ||
    urlPath.startsWith("/api/")
  ) {
    const proxySocket = net.connect(API_PORT, API_HOST, () => {
      const headers = Object.entries(req.headers)
        .map(([k, v]) => `${k}: ${v}`)
        .join("\r\n");

      proxySocket.write(
        `${req.method} ${req.url} HTTP/${req.httpVersion}\r\n${headers}\r\n\r\n`,
      );
      if (head && head.length > 0) proxySocket.write(head);
      proxySocket.pipe(clientSocket);
      clientSocket.pipe(proxySocket);
    });

    proxySocket.on("error", () => clientSocket.destroy());
    clientSocket.on("error", () => proxySocket.destroy());
  } else {
    clientSocket.destroy();
  }
});

server.listen(WEB_PORT, WEB_HOST, () => {
  console.log(
    `[FilomOnline Web] http://${WEB_HOST}:${WEB_PORT} aktif (Statik: ${DIST}, API Proxy: ${API_HOST}:${API_PORT})`,
  );
});
