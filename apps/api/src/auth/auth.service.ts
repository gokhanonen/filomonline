import {
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as argon2 from "argon2";
import { createHash, randomBytes } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { JwtPayload } from "./auth.types";

const sha256 = (value: string) =>
  createHash("sha256").update(value).digest("hex");

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(email: string, password: string, meta?: { userAgent?: string; ip?: string }) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException("E-posta veya şifre hatalı");
    }
    const valid = await argon2.verify(user.passwordHash, password);
    if (!valid) {
      throw new UnauthorizedException("E-posta veya şifre hatalı");
    }
    return this.issueTokens(user.id, user.tenantId, user.isSuperAdmin, meta);
  }

  async refresh(refreshToken: string, meta?: { userAgent?: string; ip?: string }) {
    const tokenHash = sha256(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
    if (
      !stored ||
      stored.revokedAt ||
      stored.expiresAt < new Date() ||
      !stored.user.isActive
    ) {
      throw new UnauthorizedException("Oturum geçersiz, yeniden giriş yapın");
    }
    // Rotasyon: eski token iptal, yenisi üretilir
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });
    return this.issueTokens(
      stored.user.id,
      stored.user.tenantId,
      stored.user.isSuperAdmin,
      meta,
    );
  }

  async logout(refreshToken: string) {
    const tokenHash = sha256(refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { success: true };
  }

  /** /auth/me — kullanıcı + erişebildiği şirketler (firma seçici için) */
  async me(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        extension: true,
        avatarUrl: true,
        isSuperAdmin: true,
        tenantId: true,
        memberships: {
          select: {
            isDefault: true,
            isAdmin: true,
            company: {
              select: { id: true, name: true, logoUrl: true, isActive: true },
            },
            roles: { select: { id: true, name: true, permissions: true } },
          },
        },
      },
    });
    return user;
  }

  private async issueTokens(
    userId: string,
    tenantId: string | null,
    isSuperAdmin: boolean,
    meta?: { userAgent?: string; ip?: string },
  ) {
    const payload: JwtPayload = { sub: userId, tenantId, isSuperAdmin };
    const accessToken = await this.jwt.signAsync(payload);

    const refreshToken = randomBytes(48).toString("base64url");
    const refreshTtlDays = parseInt(
      this.config.get("JWT_REFRESH_TTL", "30d").replace(/\D/g, ""),
      10,
    );
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: sha256(refreshToken),
        userAgent: meta?.userAgent,
        ip: meta?.ip,
        expiresAt: new Date(Date.now() + refreshTtlDays * 24 * 60 * 60 * 1000),
      },
    });

    return { accessToken, refreshToken };
  }
}
