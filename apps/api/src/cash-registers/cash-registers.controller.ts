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
import { CashRegistersService } from "./cash-registers.service";
import {
  CreateCashRegisterDto,
  CreateCashTransactionDto,
  QueryTransactionsDto,
  UpdateCashRegisterDto,
} from "./dto/cash-register.dto";

@ApiTags("cash-registers")
@ApiBearerAuth()
@Controller("cash-registers")
export class CashRegistersController {
  constructor(private readonly service: CashRegistersService) {}

  @RequirePermissions("expenses.read")
  @Get()
  findAllRegisters(@CompanyId() companyId: string) {
    return this.service.findAllRegisters(companyId);
  }

  @RequirePermissions("expenses.read")
  @Get("summary")
  getSummary(@CompanyId() companyId: string) {
    return this.service.getSummary(companyId);
  }

  @RequirePermissions("expenses.read")
  @Get("transactions")
  findTransactions(
    @CompanyId() companyId: string,
    @Query() query: QueryTransactionsDto,
  ) {
    return this.service.findTransactions(companyId, query);
  }

  @RequirePermissions("expenses.read")
  @Get(":id")
  findOneRegister(
    @CompanyId() companyId: string,
    @Param("id") id: string,
  ) {
    return this.service.findOneRegister(companyId, id);
  }

  @RequirePermissions("expenses.write")
  @Post()
  createRegister(
    @CompanyId() companyId: string,
    @Body() dto: CreateCashRegisterDto,
  ) {
    return this.service.createRegister(companyId, dto);
  }

  @RequirePermissions("expenses.write")
  @Patch(":id")
  updateRegister(
    @CompanyId() companyId: string,
    @Param("id") id: string,
    @Body() dto: UpdateCashRegisterDto,
  ) {
    return this.service.updateRegister(companyId, id, dto);
  }

  @RequirePermissions("expenses.write")
  @Delete(":id")
  deleteRegister(
    @CompanyId() companyId: string,
    @Param("id") id: string,
  ) {
    return this.service.deleteRegister(companyId, id);
  }

  @RequirePermissions("expenses.write")
  @Post("transactions")
  createTransaction(
    @CompanyId() companyId: string,
    @Body() dto: CreateCashTransactionDto,
  ) {
    return this.service.createTransaction(companyId, dto);
  }

  @RequirePermissions("expenses.write")
  @Delete("transactions/:id")
  deleteTransaction(
    @CompanyId() companyId: string,
    @Param("id") id: string,
  ) {
    return this.service.deleteTransaction(companyId, id);
  }
}
