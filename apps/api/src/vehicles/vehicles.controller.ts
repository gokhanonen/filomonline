import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CompanyId } from "../tenancy/company-id.decorator";
import { RequirePermissions } from "../tenancy/permissions.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { AuthUser } from "../auth/auth.types";
import { VehiclesService } from "./vehicles.service";
import {
  CreateVehicleDto,
  QueryVehiclesDto,
  TramerRecordDto,
  UpdateVehicleDto,
  VehiclePhotoDto,
} from "./dto/vehicle.dto";
import { AddListingUrlDto, CreateVehicleOptionDto } from "./dto/vehicle-extras.dto";
import {
  CreateVehicleTransferDto,
  ReturnFromExternalDto,
} from "./dto/vehicle-transfer.dto";
import { CreateVehicleShareLinkDto } from "./dto/vehicle-share.dto";
import { Public } from "../auth/decorators/public.decorator";
import { SkipCompany } from "../tenancy/skip-company.decorator";

@ApiTags("vehicles")
@ApiBearerAuth()
@Controller("vehicles")
export class VehiclesController {
  constructor(private readonly vehicles: VehiclesService) {}

  @RequirePermissions("vehicles.write")
  @Post()
  create(@CompanyId() companyId: string, @Body() dto: CreateVehicleDto) {
    return this.vehicles.create(companyId, dto);
  }

  @RequirePermissions("vehicles.read")
  @Get()
  findAll(@CompanyId() companyId: string, @Query() q: QueryVehiclesDto) {
    return this.vehicles.findAll(companyId, q);
  }

  @RequirePermissions("vehicles.read")
  @Get(":id")
  findOne(@CompanyId() companyId: string, @Param("id") id: string) {
    return this.vehicles.findOne(companyId, id);
  }

  @RequirePermissions("vehicles.write")
  @Patch(":id")
  update(
    @CompanyId() companyId: string,
    @Param("id") id: string,
    @Body() dto: UpdateVehicleDto,
  ) {
    return this.vehicles.update(companyId, id, dto);
  }

  @RequirePermissions("vehicles.delete")
  @Delete(":id")
  remove(@CompanyId() companyId: string, @Param("id") id: string) {
    return this.vehicles.remove(companyId, id);
  }

  @RequirePermissions("vehicles.write")
  @Post(":id/photos")
  addPhotos(
    @CompanyId() companyId: string,
    @Param("id") id: string,
    @Body() body: { photos: VehiclePhotoDto[] },
  ) {
    return this.vehicles.addPhotos(companyId, id, body.photos);
  }

  @RequirePermissions("vehicles.write")
  @Delete(":id/photos/:photoId")
  deletePhoto(
    @CompanyId() companyId: string,
    @Param("id") id: string,
    @Param("photoId") photoId: string,
  ) {
    return this.vehicles.deletePhoto(companyId, id, photoId);
  }

  // --- Tramer ---

  @RequirePermissions("vehicles.write")
  @Post(":id/tramer")
  addTramer(
    @CompanyId() companyId: string,
    @Param("id") id: string,
    @Body() dto: TramerRecordDto,
  ) {
    return this.vehicles.addTramer(companyId, id, dto);
  }

  @RequirePermissions("vehicles.write")
  @Delete(":id/tramer/:tramerId")
  deleteTramer(
    @CompanyId() companyId: string,
    @Param("id") id: string,
    @Param("tramerId") tramerId: string,
  ) {
    return this.vehicles.deleteTramer(companyId, id, tramerId);
  }

  // --- İlan linkleri ---

  @RequirePermissions("vehicles.read")
  @Get(":id/listing-urls")
  listListingUrls(@CompanyId() companyId: string, @Param("id") id: string) {
    return this.vehicles.listListingUrls(companyId, id);
  }

  @RequirePermissions("vehicles.write")
  @Post(":id/listing-urls")
  addListingUrl(
    @CompanyId() companyId: string,
    @Param("id") id: string,
    @Body() dto: AddListingUrlDto,
  ) {
    return this.vehicles.addListingUrl(companyId, id, dto);
  }

  @RequirePermissions("vehicles.write")
  @Delete(":id/listing-urls/:urlId")
  removeListingUrl(
    @CompanyId() companyId: string,
    @Param("id") id: string,
    @Param("urlId") urlId: string,
  ) {
    return this.vehicles.removeListingUrl(companyId, id, urlId);
  }

  // --- Opsiyon (kapora / rezervasyon) ---

  @RequirePermissions("vehicles.read")
  @Get(":id/options/active")
  activeOption(@CompanyId() companyId: string, @Param("id") id: string) {
    return this.vehicles.getActiveOption(companyId, id);
  }

  @RequirePermissions("vehicles.read")
  @Get(":id/options")
  listOptions(@CompanyId() companyId: string, @Param("id") id: string) {
    return this.vehicles.listOptions(companyId, id);
  }

  @RequirePermissions("vehicles.write")
  @Post(":id/options")
  createOption(
    @CompanyId() companyId: string,
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() dto: CreateVehicleOptionDto,
  ) {
    return this.vehicles.createOption(companyId, user.id, id, dto);
  }

  @RequirePermissions("vehicles.write")
  @Patch(":id/options/:optionId")
  updateOption(
    @CompanyId() companyId: string,
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Param("optionId") optionId: string,
    @Body() dto: CreateVehicleOptionDto,
  ) {
    return this.vehicles.updateOption(companyId, user.id, id, optionId, dto);
  }

  @RequirePermissions("vehicles.write")
  @Delete(":id/options/:optionId")
  cancelOption(
    @CompanyId() companyId: string,
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Param("optionId") optionId: string,
  ) {
    return this.vehicles.cancelOption(companyId, user.id, id, optionId);
  }

  // --- Lokasyon & Transfer Modülü ---

  @RequirePermissions("vehicles.read")
  @Get(":id/location")
  getLocation(@CompanyId() companyId: string, @Param("id") id: string) {
    return this.vehicles.getVehicleLocation(companyId, id);
  }

  @RequirePermissions("vehicles.read")
  @Get(":id/transfers")
  listTransfers(@CompanyId() companyId: string, @Param("id") id: string) {
    return this.vehicles.getTransferHistory(companyId, id);
  }

  @RequirePermissions("vehicles.write")
  @Post(":id/transfers")
  createTransfer(
    @CompanyId() companyId: string,
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() dto: CreateVehicleTransferDto,
  ) {
    return this.vehicles.createTransfer(companyId, user.id, id, dto);
  }

  @RequirePermissions("vehicles.write")
  @Post(":id/transfers/:transferId/confirm")
  confirmTransfer(
    @CompanyId() companyId: string,
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Param("transferId") transferId: string,
  ) {
    return this.vehicles.confirmTransfer(companyId, user.id, id, transferId);
  }

  @RequirePermissions("vehicles.write")
  @Post(":id/transfers/:transferId/cancel")
  cancelTransfer(
    @CompanyId() companyId: string,
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Param("transferId") transferId: string,
  ) {
    return this.vehicles.cancelTransfer(companyId, user.id, id, transferId);
  }

  @RequirePermissions("vehicles.write")
  @Post(":id/transfers/return-external")
  returnFromExternal(
    @CompanyId() companyId: string,
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() dto: ReturnFromExternalDto,
  ) {
    return this.vehicles.returnFromExternal(companyId, user.id, id, dto);
  }

  // --- Dış Paylaşım Bağlantıları ---

  /** Login gerektirmeyen dışlink araç sayfası */
  @Public()
  @SkipCompany()
  @Get("public/:token")
  getPublicVehicle(@Param("token") token: string) {
    return this.vehicles.getPublicVehicleByToken(token);
  }

  @RequirePermissions("vehicles.read")
  @Get(":id/share-links")
  listShareLinks(
    @CompanyId() companyId: string,
    @Param("id") id: string,
  ) {
    return this.vehicles.listShareLinks(companyId, id);
  }

  @RequirePermissions("vehicles.write")
  @Post(":id/share-links")
  createShareLink(
    @CompanyId() companyId: string,
    @Param("id") id: string,
    @Body() dto: CreateVehicleShareLinkDto,
  ) {
    return this.vehicles.getOrCreateShareLink(companyId, id, dto);
  }

  @RequirePermissions("vehicles.write")
  @Patch(":id/share-links/:linkId")
  toggleShareLink(
    @CompanyId() companyId: string,
    @Param("id") id: string,
    @Param("linkId") linkId: string,
    @Body("isActive") isActive: boolean,
  ) {
    return this.vehicles.toggleShareLink(companyId, id, linkId, isActive);
  }

  @RequirePermissions("vehicles.write")
  @Delete(":id/share-links/:linkId")
  deleteShareLink(
    @CompanyId() companyId: string,
    @Param("id") id: string,
    @Param("linkId") linkId: string,
  ) {
    return this.vehicles.deleteShareLink(companyId, id, linkId);
  }
}

