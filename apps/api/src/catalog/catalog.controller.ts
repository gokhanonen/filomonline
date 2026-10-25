import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { AuthUser } from "../auth/auth.types";
import { CompanyAdminGuard } from "../tenancy/company-admin.guard";
import { activeTenantId } from "../tenancy/tenant-context";
import { CatalogService } from "./catalog.service";
import {
  CreateBrandDto,
  CreateModelDto,
  ListingSourceDto,
  SimpleCatalogDto,
  UpdateListingSourceDto,
  UpdateSimpleCatalogDto,
} from "./dto/catalog.dto";

// URL parçası -> entity eşlemesi
const ENTITY_MAP = {
  colors: "color",
  "body-types": "bodyType",
  "vehicle-types": "vehicleType",
  "vehicle-categories": "vehicleCategory",
  categories: "vehicleCategory",
} as const;

type EntitySlug = keyof typeof ENTITY_MAP;

function resolveEntity(slug: string): (typeof ENTITY_MAP)[EntitySlug] {
  const mapped = (ENTITY_MAP as Record<string, (typeof ENTITY_MAP)[EntitySlug]>)[slug];
  if (!mapped) throw new NotFoundException(`Bilinmeyen katalog varlığı: ${slug}`);
  return mapped;
}

@ApiTags("catalog")
@ApiBearerAuth()
@Controller("catalog")
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  // Araç formu için hepsi (okuma — her kullanıcı)
  @Get()
  all(@CurrentUser() user: AuthUser) {
    return this.catalog.all(activeTenantId(user));
  }

  // --- Markalar ---
  @Get("brands")
  listBrands(
    @CurrentUser() user: AuthUser,
    @Query("categoryId") categoryId?: string,
  ) {
    return this.catalog.listBrands(activeTenantId(user), categoryId);
  }

  @UseGuards(CompanyAdminGuard)
  @Post("brands")
  createBrand(@CurrentUser() user: AuthUser, @Body() dto: CreateBrandDto) {
    return this.catalog.createBrand(activeTenantId(user), dto);
  }

  @UseGuards(CompanyAdminGuard)
  @Patch("brands/:id")
  updateBrand(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() dto: CreateBrandDto,
  ) {
    return this.catalog.updateBrand(activeTenantId(user), id, dto);
  }

  @UseGuards(CompanyAdminGuard)
  @Delete("brands/:id")
  removeBrand(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.catalog.removeBrand(activeTenantId(user), id);
  }

  // --- Modeller ---
  @Get("models")
  listModels(@CurrentUser() user: AuthUser, @Query("brandId") brandId?: string) {
    return this.catalog.listModels(activeTenantId(user), brandId);
  }

  @UseGuards(CompanyAdminGuard)
  @Post("models")
  createModel(@CurrentUser() user: AuthUser, @Body() dto: CreateModelDto) {
    return this.catalog.createModel(activeTenantId(user), dto);
  }

  @UseGuards(CompanyAdminGuard)
  @Delete("models/:id")
  removeModel(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.catalog.removeModel(activeTenantId(user), id);
  }

  // --- İlan kaynakları (":entity" genel rotasından ÖNCE tanımlı olmalı) ---
  @Get("listing-sources")
  listListingSources(@CurrentUser() user: AuthUser) {
    return this.catalog.listListingSources(activeTenantId(user));
  }

  @UseGuards(CompanyAdminGuard)
  @Post("listing-sources")
  createListingSource(@CurrentUser() user: AuthUser, @Body() dto: ListingSourceDto) {
    return this.catalog.createListingSource(activeTenantId(user), dto);
  }

  @UseGuards(CompanyAdminGuard)
  @Patch("listing-sources/:id")
  updateListingSource(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() dto: UpdateListingSourceDto,
  ) {
    return this.catalog.updateListingSource(activeTenantId(user), id, dto);
  }

  @UseGuards(CompanyAdminGuard)
  @Delete("listing-sources/:id")
  removeListingSource(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.catalog.removeListingSource(activeTenantId(user), id);
  }

  // --- Basit varlıklar (colors / body-types / vehicle-types / vehicle-categories / categories) ---
  @Get(":entity")
  list(@CurrentUser() user: AuthUser, @Param("entity") entity: string) {
    return this.catalog.list(resolveEntity(entity), activeTenantId(user));
  }

  @UseGuards(CompanyAdminGuard)
  @Post(":entity")
  create(
    @CurrentUser() user: AuthUser,
    @Param("entity") entity: string,
    @Body() dto: SimpleCatalogDto,
  ) {
    return this.catalog.create(resolveEntity(entity), activeTenantId(user), dto);
  }

  @UseGuards(CompanyAdminGuard)
  @Patch(":entity/:id")
  update(
    @CurrentUser() user: AuthUser,
    @Param("entity") entity: string,
    @Param("id") id: string,
    @Body() dto: UpdateSimpleCatalogDto,
  ) {
    return this.catalog.update(resolveEntity(entity), activeTenantId(user), id, dto);
  }

  @UseGuards(CompanyAdminGuard)
  @Delete(":entity/:id")
  remove(
    @CurrentUser() user: AuthUser,
    @Param("entity") entity: string,
    @Param("id") id: string,
  ) {
    return this.catalog.remove(resolveEntity(entity), activeTenantId(user), id);
  }
}
