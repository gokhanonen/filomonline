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
import { LocationId } from "../tenancy/location-id.decorator";
import { RequirePermissions } from "../tenancy/permissions.decorator";
import { RentalsService } from "./rentals.service";
import {
  CreateRentalContractDto,
  QueryRentalsDto,
  UpdateRentalContractDto,
} from "./dto/rental.dto";

@ApiTags("rentals")
@ApiBearerAuth()
@Controller("rentals")
export class RentalsController {
  constructor(private readonly rentals: RentalsService) {}

  @RequirePermissions("rentals.create")
  @Post()
  create(
    @CompanyId() companyId: string,
    @LocationId() locationId: string | undefined,
    @Body() dto: CreateRentalContractDto,
  ) {
    return this.rentals.create(companyId, dto, locationId);
  }

  @RequirePermissions("rentals.read")
  @Get()
  findAll(
    @CompanyId() companyId: string,
    @LocationId() locationId: string | undefined,
    @Query() q: QueryRentalsDto,
  ) {
    return this.rentals.findAll(companyId, q, locationId);
  }

  @RequirePermissions("rentals.read")
  @Get("by-vehicle/:vehicleId")
  findByVehicle(
    @CompanyId() companyId: string,
    @Param("vehicleId") vehicleId: string,
  ) {
    return this.rentals.findByVehicle(companyId, vehicleId);
  }

  @RequirePermissions("rentals.read")
  @Get(":id")
  findOne(@CompanyId() companyId: string, @Param("id") id: string) {
    return this.rentals.findOne(companyId, id);
  }

  @RequirePermissions("rentals.write")
  @Patch(":id")
  update(
    @CompanyId() companyId: string,
    @Param("id") id: string,
    @Body() dto: UpdateRentalContractDto,
  ) {
    return this.rentals.update(companyId, id, dto);
  }

  @RequirePermissions("rentals.delete")
  @Delete(":id")
  remove(@CompanyId() companyId: string, @Param("id") id: string) {
    return this.rentals.remove(companyId, id);
  }
}
