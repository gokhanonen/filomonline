// PM2 süreç tanımı — FilomOnline SaaS
// İki süreç yönetilir:
//   1. filomonline-api: NestJS backend (PORT 5199)
//   2. filomonline-web: Statik web sunucusu & API reverse proxy (PORT 5198)
//
// Yönetim komutları:
//   pm2 start ecosystem.config.cjs
//   pm2 reload ecosystem.config.cjs --update-env
//   pm2 status
//   pm2 logs filomonline-api
//   pm2 logs filomonline-web
module.exports = {
  apps: [
    {
      name: "filomonline-api",
      cwd: "./apps/api",
      script: "dist/main.js",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "512M",
      time: true,
      env: {
        NODE_ENV: "production",
        PORT: 5199,
      },
    },
    {
      name: "filomonline-web",
      cwd: ".",
      script: "deploy/web-server.mjs",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "256M",
      time: true,
      env: {
        NODE_ENV: "production",
        WEB_HOST: "0.0.0.0",
        WEB_PORT: 5198,
        API_HOST: "127.0.0.1",
        API_PORT: 5199,
        WEB_DIST: "apps/web/dist",
      },
    },
  ],
};
