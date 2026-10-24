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
import { LocationsService } from "./locations.service";
import {
  CreateCashRegisterDto,
  CreateLocationDto,
  QueryLocationsDto,
  UpdateCashRegisterDto,
  UpdateLocationDto,
} from "./dto/location.dto";

@ApiTags("locations")
@ApiBearerAuth()
@Controller()
export class LocationsController {
  constructor(private readonly locations: LocationsService) {}

  // --- Kasalar (lokasyonlardan önce — route çakışmasını önlemek için ayrı prefix) ---

  @RequirePermissions("locations.read")
  @Get("cash-registers")
  listCashRegisters(
    @CompanyId() companyId: string,
    @Query("locationId") locationId?: string,
  ) {
    return this.locations.listCashRegisters(companyId, locationId);
  }

  @RequirePermissions("locations.write")
  @Post("cash-registers")
  createCashRegister(
    @CompanyId() companyId: string,
    @Body() dto: CreateCashRegisterDto,
  ) {
    return this.locations.createCashRegister(companyId, dto);
  }

  @RequirePermissions("locations.write")
  @Patch("cash-registers/:id")
  updateCashRegister(
    @CompanyId() companyId: string,
    @Param("id") id: string,
    @Body() dto: UpdateCashRegisterDto,
  ) {
    return this.locations.updateCashRegister(companyId, id, dto);
  }

  // --- Lokasyonlar ---

  @RequirePermissions("locations.write")
  @Post("locations")
  create(@CompanyId() companyId: string, @Body() dto: CreateLocationDto) {
    return this.locations.create(companyId, dto);
  }

  @RequirePermissions("locations.read")
  @Get("locations")
  findAll(@CompanyId() companyId: string, @Query() q: QueryLocationsDto) {
    return this.locations.findAll(companyId, q);
  }

  @RequirePermissions("locations.read")
  @Get("locations/pending-transfers")
  listPendingTransfers(@CompanyId() companyId: string) {
    return this.locations.listPendingTransfers(companyId);
  }

  @RequirePermissions("locations.read")
  @Get("locations/:id")
  findOne(@CompanyId() companyId: string, @Param("id") id: string) {
    return this.locations.findOne(companyId, id);
  }

  @RequirePermissions("locations.write")
  @Patch("locations/:id")
  update(
    @CompanyId() companyId: string,
    @Param("id") id: string,
    @Body() dto: UpdateLocationDto,
  ) {
    return this.locations.update(companyId, id, dto);
  }

  @RequirePermissions("locations.write")
  @Delete("locations/:id")
  remove(@CompanyId() companyId: string, @Param("id") id: string) {
    return this.locations.remove(companyId, id);
  }
}
