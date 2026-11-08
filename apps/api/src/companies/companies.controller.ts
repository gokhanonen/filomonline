import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { PaginationDto } from "../common/dto/pagination.dto";
import { SkipCompany } from "../tenancy/skip-company.decorator";
import { SuperAdminGuard } from "../tenancy/super-admin.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { AuthUser } from "../auth/auth.types";
import { CompanyId } from "../tenancy/company-id.decorator";
import { CompaniesService } from "./companies.service";
import {
  CreateCompanyDto,
  CreateCompanyForHoldingDto,
  UpdateCompanyDto,
} from "./dto/company.dto";

@ApiTags("companies")
@ApiBearerAuth()
@Controller("companies")
export class CompaniesController {
  constructor(private readonly companies: CompaniesService) {}

  @SkipCompany()
  @UseGuards(SuperAdminGuard)
  @Post()
  create(@Body() dto: CreateCompanyDto) {
    return this.companies.create(dto);
  }

  @SkipCompany()
  @UseGuards(SuperAdminGuard)
  @Get()
  findAll(@Query() q: PaginationDto, @Query("tenantId") tenantId?: string) {
    return this.companies.findAll(q, tenantId);
  }

  /**
   * Holding yöneticisi kendi holding'i altında firma açar.
   * CompanyGuard aktif tenant'ı (activeTenantId) + isCompanyAdmin'i doldurur.
   */
  @Post("holding")
  createForHolding(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateCompanyForHoldingDto,
  ) {
    if (!user.isSuperAdmin && !user.isCompanyAdmin) {
      throw new ForbiddenException(
        "Firma açmak için holding/firma yöneticisi olmalısınız",
      );
    }
    const tenantId = user.activeTenantId ?? user.tenantId;
    if (!tenantId) throw new ForbiddenException("Aktif holding bağlamı yok");
    return this.companies.createForHolding(tenantId, user.id, dto);
  }

  /** Holding (tenant) içindeki firmaları listeler — firma yöneticisi self-servis. */
  @Get("holding")
  findAllForHolding(
    @CurrentUser() user: AuthUser,
    @Query() q: PaginationDto,
  ) {
    if (!user.isSuperAdmin && !user.isCompanyAdmin) {
      throw new ForbiddenException(
        "Firma listesi için holding/firma yöneticisi olmalısınız",
      );
    }
    const tenantId = user.activeTenantId ?? user.tenantId;
    if (!tenantId) throw new ForbiddenException("Aktif holding bağlamı yok");
    return this.companies.findAllForTenant(tenantId, q);
  }

  /** Aktif şirketin bilgilerini getirir (firma yöneticisi veya üye) */
  @Get("current")
  getCurrent(@CompanyId() companyId: string) {
    return this.companies.findOne(companyId);
  }

  /** Aktif şirketin bilgilerini ve logosunu günceller (firma yöneticisi) */
  @Patch("current")
  updateCurrent(
    @CurrentUser() user: AuthUser,
    @CompanyId() companyId: string,
    @Body() dto: UpdateCompanyDto,
  ) {
    if (!user.isSuperAdmin && !user.isCompanyAdmin) {
      throw new ForbiddenException("Firma bilgilerini yalnızca firma yöneticileri güncelleyebilir");
    }
    return this.companies.update(companyId, dto);
  }

  @SkipCompany()
  @Get(":id")
  findOne(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
  ) {
    if (!user.isSuperAdmin && user.companyId !== id) {
      throw new ForbiddenException("Bu firmayı görüntüleme yetkiniz yok");
    }
    return this.companies.findOne(id);
  }

  @SkipCompany()
  @Patch(":id")
  update(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() dto: UpdateCompanyDto,
  ) {
    if (!user.isSuperAdmin && (!user.isCompanyAdmin || user.companyId !== id)) {
      throw new ForbiddenException("Bu firmayı güncelleme yetkiniz yok");
    }
    return this.companies.update(id, dto);
  }
}
