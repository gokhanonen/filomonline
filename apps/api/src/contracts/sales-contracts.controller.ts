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
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { AuthUser } from "../auth/auth.types";
import { RequirePermissions } from "../tenancy/permissions.decorator";
import { SalesContractsService } from "./sales-contracts.service";
import {
  CreateSalesContractDto,
  QuerySalesContractsDto,
  UpdateSalesContractDto,
} from "./dto/sales-contract.dto";

@ApiTags("sales-contracts")
@ApiBearerAuth()
@Controller("contracts/sales")
export class SalesContractsController {
  constructor(private readonly salesContracts: SalesContractsService) {}

  @RequirePermissions("rentals.write") // or contracts.write
  @Post()
  create(
    @CompanyId() companyId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateSalesContractDto,
  ) {
    return this.salesContracts.create(companyId, user.id, dto);
  }

  @RequirePermissions("rentals.read")
  @Get()
  findAll(
    @CompanyId() companyId: string,
    @Query() q: QuerySalesContractsDto,
  ) {
    return this.salesContracts.findAll(companyId, q);
  }

  @RequirePermissions("rentals.read")
  @Get("by-vehicle/:vehicleId")
  findByVehicle(
    @CompanyId() companyId: string,
    @Param("vehicleId") vehicleId: string,
  ) {
    return this.salesContracts.findByVehicle(companyId, vehicleId);
  }

  @RequirePermissions("rentals.read")
  @Get(":id")
  findOne(
    @CompanyId() companyId: string,
    @Param("id") id: string,
  ) {
    return this.salesContracts.findOne(companyId, id);
  }

  @RequirePermissions("rentals.write")
  @Patch(":id")
  update(
    @CompanyId() companyId: string,
    @Param("id") id: string,
    @Body() dto: UpdateSalesContractDto,
  ) {
    return this.salesContracts.update(companyId, id, dto);
  }

  @RequirePermissions("rentals.delete")
  @Delete(":id")
  remove(
    @CompanyId() companyId: string,
    @Param("id") id: string,
  ) {
    return this.salesContracts.remove(companyId, id);
  }
}
