// PM2 süreç tanımı — API'yi üretimde çalıştırır.
// Kullanım (sunucuda, APP_DIR içinde):
//   pm2 start deploy/ecosystem.config.cjs --env production
//   pm2 reload filom-api
module.exports = {
  apps: [
    {
      name: "filom-api",
      cwd: "./apps/api",
      script: "dist/main.js",
      // .env dosyası uygulama içinde @nestjs/config ile okunur (apps/api/.env)
      instances: 1, // Socket.io tek örnekle en sorunsuz; cluster için sticky session gerekir
      exec_mode: "fork",
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
      },
      error_file: "../../logs/api-error.log",
      out_file: "../../logs/api-out.log",
      time: true,
    },
  ],
};
