// PM2 süreç tanımı — FilomOnline üretim mimarisi (bu sunucunun GERÇEK düzeni):
//   filomonline-web : deploy/web-server.mjs  → :5198  (statik SPA + /api & /socket.io'yu API'ye proxy)
//   filomonline-api : apps/api/dist/main.js  → :5199  (NestJS)
//   Dış ters-proxy (başka makine) alan adını 22.6.102.180:5198'e yönlendirir.
//
// ⚠️ PORT/ADLAR SABİTTİR. Değiştirmeyin; dış proxy bunlara göre ayarlı.
// Deploy bunu `pm2 startOrReload` ile çalıştırır (süreçleri SİLMEZ → kesinti yok).
const path = require("path");
const ROOT = path.resolve(__dirname, ".."); // repo kökü (APP_DIR)

module.exports = {
  apps: [
    {
      name: "filomonline-api",
      cwd: path.join(ROOT, "apps/api"),
      script: "dist/main.js",
      instances: 1, // Socket.io tek örnekle sorunsuz
      exec_mode: "fork",
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: "5199", // web-server.mjs API_PORT ile aynı olmalı
      },
      error_file: path.join(ROOT, "logs/filomonline-api-error.log"),
      out_file: path.join(ROOT, "logs/filomonline-api-out.log"),
      time: true,
    },
    {
      name: "filomonline-web",
      cwd: ROOT,
      script: "deploy/web-server.mjs", // statik SPA + /api, /socket.io proxy
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "256M",
      env: {
        NODE_ENV: "production",
        WEB_PORT: "5198",
        API_HOST: "127.0.0.1",
        API_PORT: "5199",
      },
      error_file: path.join(ROOT, "logs/filomonline-web-error.log"),
      out_file: path.join(ROOT, "logs/filomonline-web-out.log"),
      time: true,
    },
  ],
};
