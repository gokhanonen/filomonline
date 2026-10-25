import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { softDeleteExtension } from "./soft-delete";

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super();
    // Soft delete: okuma sorgularına deletedAt: null, delete/deleteMany yasak (bkz. soft-delete.ts).
    // Genişletilmiş istemci döner; sınıf metotları (onModuleInit vb.) prototipten erişilebilir kalır.
    return this.$extends(softDeleteExtension) as unknown as PrismaService;
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
