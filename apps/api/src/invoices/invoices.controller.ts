import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CompanyId } from "../tenancy/company-id.decorator";
import { RequirePermissions } from "../tenancy/permissions.decorator";
import { InvoicesService } from "./invoices.service";
import {
  CreatePurchaseInvoiceDto,
  CreateSalesInvoiceDto,
  QueryInvoicesDto,
  UpdateIntegrationStatusDto,
} from "./dto/invoice.dto";

@ApiTags("invoices")
@ApiBearerAuth()
@Controller("invoices")
export class InvoicesController {
  constructor(private readonly invoices: InvoicesService) {}

  @RequirePermissions("invoices.read")
  @Get()
  findAll(@CompanyId() companyId: string, @Query() q: QueryInvoicesDto) {
    return this.invoices.findAll(companyId, q);
  }

  @RequirePermissions("invoices.write")
  @Post("purchase")
  createPurchase(@CompanyId() companyId: string, @Body() dto: CreatePurchaseInvoiceDto) {
    return this.invoices.createPurchase(companyId, dto);
  }

  @RequirePermissions("invoices.write")
  @Post("sales")
  createSales(@CompanyId() companyId: string, @Body() dto: CreateSalesInvoiceDto) {
    return this.invoices.createSales(companyId, dto);
  }

  @RequirePermissions("invoices.write")
  @Patch(":type/:id/status")
  updateStatus(
    @CompanyId() companyId: string,
    @Param("type") type: string,
    @Param("id") id: string,
    @Body() dto: UpdateIntegrationStatusDto,
  ) {
    return this.invoices.updateStatus(companyId, type, id, dto);
  }
}
