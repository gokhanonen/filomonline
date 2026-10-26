import { Body, Controller, Get, HttpCode, Patch, Post, Req } from "@nestjs/common";
import type { Request } from "express";
import { AuthService } from "./auth.service";
import { CurrentUser } from "./decorators/current-user.decorator";
import { Public } from "./decorators/public.decorator";
import { Throttle } from "@nestjs/throttler";
import { UseGuards } from "@nestjs/common";
import { LoginThrottlerGuard } from "./guards/login-throttler.guard";
import { SkipCompany } from "../tenancy/skip-company.decorator";
import { AuthUser } from "./auth.types";
import { LoginDto, RefreshDto, UpdateProfileDto } from "./dto/auth.dto";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  // Brute-force koruması: aynı e-postaya 5 dakikada en fazla 8 deneme (e-posta bazlı, IP'den bağımsız)
  @UseGuards(LoginThrottlerGuard)
  @HttpCode(200)
  @Post("login")
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto.email, dto.password, {
      userAgent: req.headers["user-agent"],
      ip: req.ip,
    });
  }

  @Public()
  // Token tahmini/suistimaline karşı: 5 dakikada 30 deneme (IP bazlı)
  @Throttle({ default: { limit: 30, ttl: 300_000 } })
  @HttpCode(200)
  @Post("refresh")
  refresh(@Body() dto: RefreshDto, @Req() req: Request) {
    return this.authService.refresh(dto.refreshToken, {
      userAgent: req.headers["user-agent"],
      ip: req.ip,
    });
  }

  @Public()
  @HttpCode(200)
  @Post("logout")
  logout(@Body() dto: RefreshDto) {
    return this.authService.logout(dto.refreshToken);
  }

  @SkipCompany()
  @Get("me")
  me(@CurrentUser() user: AuthUser) {
    return this.authService.me(user.id);
  }

  @SkipCompany()
  @Patch("profile")
  updateProfile(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.authService.updateProfile(user.id, dto);
  }
}
