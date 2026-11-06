import { Body, Controller, Get, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { AuthUser } from "../auth/auth.types";
import { activeTenantId } from "../tenancy/tenant-context";
import { SubscriptionService } from "./subscription.service";
import { QuotaService } from "./quota.service";
import { PreviewQuoteDto, SubscribeDto } from "./dto/subscription.dto";

@ApiTags("subscription")
@ApiBearerAuth()
@Controller("subscription")
export class SubscriptionController {
  constructor(
    private readonly subs: SubscriptionService,
    private readonly quota: QuotaService,
  ) {}

  /** Herkese açık planlar + fiyatları */
  @Get("plans")
  plans() {
    return this.subs.listPublicPlans();
  }

  /** Firmanın mevcut aboneliği */
  @Get("current")
  current(@CurrentUser() user: AuthUser) {
    return this.subs.getCurrent(activeTenantId(user));
  }

  /** Kota kullanımı + uyarı durumu (banner bunu kullanır) */
  @Get("usage")
  usage(@CurrentUser() user: AuthUser) {
    return this.quota.status(activeTenantId(user));
  }

  /** Ödeme öncesi tutar/kupon önizlemesi */
  @Post("preview")
  preview(@Body() dto: PreviewQuoteDto) {
    return this.subs.previewQuote(dto.planCode, dto.period, dto.couponCode);
  }

  /** Abone ol / plan değiştir → ödeme yönlendirmesi (ücretsizse direkt aktif) */
  @Post("subscribe")
  subscribe(@CurrentUser() user: AuthUser, @Body() dto: SubscribeDto) {
    return this.subs.subscribe(activeTenantId(user), user.id, dto);
  }

  /** Dönem sonunda iptal */
  @Post("cancel")
  cancel(@CurrentUser() user: AuthUser) {
    return this.subs.cancel(activeTenantId(user));
  }
}
