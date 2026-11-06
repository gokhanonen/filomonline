import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { IsIn } from "class-validator";
import { PaymentProviderType } from "@prisma/client";
import { CompanyId } from "../tenancy/company-id.decorator";
import { Public } from "../auth/decorators/public.decorator";
import { SkipCompany } from "../tenancy/skip-company.decorator";
import { PaymentsService } from "./payments.service";

class MockCompleteDto {
  @IsIn(["success", "fail"]) outcome!: "success" | "fail";
}

@ApiTags("payments")
@ApiBearerAuth()
@Controller("payments")
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  /** Firmanın ödeme geçmişi */
  @Get()
  list(@CompanyId() companyId: string) {
    return this.payments.listPayments(companyId);
  }

  /** Sağlayıcı webhook'u (kimlik doğrulamasız; sağlayıcı imzasını adaptör doğrular) */
  @Public()
  @SkipCompany()
  @Post("webhook/:provider")
  webhook(@Param("provider") _provider: string, @Body() body: unknown) {
    return this.payments.handleCallback(body);
  }

  /**
   * Dev/mock: ödeme sonucunu simüle eder. Yalnız MOCK sağlayıcıdaki, firmaya ait
   * ödemeler için çalışır (gerçek sağlayıcıda sonucu webhook belirler).
   */
  @Post(":id/mock-complete")
  async mockComplete(
    @CompanyId() companyId: string,
    @Param("id") id: string,
    @Body() dto: MockCompleteDto,
  ) {
    const payment = await this.payments.getPayment(companyId, id);
    if (payment.provider !== PaymentProviderType.MOCK) {
      throw new BadRequestException(
        "Bu işlem yalnız mock ödemeler için kullanılabilir.",
      );
    }
    return this.payments.mockComplete(id, dto.outcome);
  }
}
