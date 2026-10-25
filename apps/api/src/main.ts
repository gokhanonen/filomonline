import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { json, urlencoded } from "express";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Yüksek çözünürlüklü fotoğraflar ve AI OCR belgeleri için gövde boyutu limiti artırıldı (50MB)
  app.use(json({ limit: "50mb" }));
  app.use(urlencoded({ extended: true, limit: "50mb" }));

  app.setGlobalPrefix("api/v1");
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(",") ?? true,
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle("FilomOnline API")
    .setDescription("Multi-tenant filo/galeri yönetimi API'si")
    .setVersion("0.1.0")
    .addBearerAuth()
    .addGlobalParameters({
      name: "X-Company-Id",
      in: "header",
      required: false,
      description: "Aktif şirket (çoklu şirket erişiminde zorunlu)",
    })
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("api/docs", app, document);

  await app.listen(process.env.PORT ?? 3001);
}

void bootstrap();
