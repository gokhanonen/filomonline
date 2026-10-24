import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CompanyId } from "../tenancy/company-id.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { AuthUser } from "../auth/auth.types";
import { activeTenantId } from "../tenancy/tenant-context";
import { RequirePermissions } from "../tenancy/permissions.decorator";
import { CompanyAdminGuard } from "../tenancy/company-admin.guard";
import { DocumentsService } from "./documents.service";
import { CreateDocumentDto, QueryDocumentsDto } from "./dto/document.dto";
import {
  CreateDocumentCategoryDto,
  CreateDocumentTypeDto,
  UpdateDocumentCategoryDto,
  UpdateDocumentTypeDto,
} from "./dto/document-meta.dto";

@ApiTags("documents")
@ApiBearerAuth()
@Controller("documents")
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Get("meta")
  meta(@CurrentUser() user: AuthUser, @Query("module") module?: string) {
    return this.documents.meta(activeTenantId(user), module);
  }

  // --- Kategori / tip yönetimi (admin) — ":id" rotalarından ÖNCE ---

  @UseGuards(CompanyAdminGuard)
  @Post("categories/defaults")
  loadDefaults(@CurrentUser() user: AuthUser) {
    return this.documents.loadDefaults(activeTenantId(user));
  }

  @UseGuards(CompanyAdminGuard)
  @Post("categories")
  createCategory(@CurrentUser() user: AuthUser, @Body() dto: CreateDocumentCategoryDto) {
    return this.documents.createCategory(activeTenantId(user), dto);
  }

  @UseGuards(CompanyAdminGuard)
  @Patch("categories/:id")
  updateCategory(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() dto: UpdateDocumentCategoryDto,
  ) {
    return this.documents.updateCategory(activeTenantId(user), id, dto);
  }

  @UseGuards(CompanyAdminGuard)
  @Delete("categories/:id")
  removeCategory(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.documents.removeCategory(activeTenantId(user), id);
  }

  @UseGuards(CompanyAdminGuard)
  @Post("types")
  createType(@CurrentUser() user: AuthUser, @Body() dto: CreateDocumentTypeDto) {
    return this.documents.createType(activeTenantId(user), dto);
  }

  @UseGuards(CompanyAdminGuard)
  @Patch("types/:id")
  updateType(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() dto: UpdateDocumentTypeDto,
  ) {
    return this.documents.updateType(activeTenantId(user), id, dto);
  }

  @UseGuards(CompanyAdminGuard)
  @Delete("types/:id")
  removeType(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.documents.removeType(activeTenantId(user), id);
  }

  // --- Dokümanlar ---

  @RequirePermissions("documents.read")
  @Get()
  list(@CompanyId() companyId: string, @Query() q: QueryDocumentsDto) {
    return this.documents.list(companyId, q);
  }

  @RequirePermissions("documents.write")
  @Post()
  create(
    @CompanyId() companyId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateDocumentDto,
  ) {
    return this.documents.create(companyId, user.id, dto);
  }

  @RequirePermissions("documents.delete")
  @Delete(":id")
  remove(@CompanyId() companyId: string, @Param("id") id: string) {
    return this.documents.remove(companyId, id);
  }
}
