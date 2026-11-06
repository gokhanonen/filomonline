import { Global, Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { AuthzController } from "./authz.controller";
import { FieldVisibilityInterceptor } from "./field-visibility.interceptor";

/**
 * Yetkilendirme kataloğu + hassas-veri alan gizleme.
 * APP_INTERCEPTOR global çalışır: scope'u olmayan kullanıcıdan hassas alanlar çıkarılır.
 */
@Global()
@Module({
  controllers: [AuthzController],
  providers: [{ provide: APP_INTERCEPTOR, useClass: FieldVisibilityInterceptor }],
})
export class AuthzModule {}
