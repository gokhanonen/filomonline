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
import { ExpensesService } from "./expenses.service";
import {
  CreateExpenseDto,
  QueryExpensesDto,
  UpdateExpenseDto,
} from "./dto/expense.dto";

@ApiTags("expenses")
@ApiBearerAuth()
@Controller("expenses")
export class ExpensesController {
  constructor(private readonly expenses: ExpensesService) {}

  @RequirePermissions("expenses.write")
  @Post()
  create(@CompanyId() companyId: string, @Body() dto: CreateExpenseDto) {
    return this.expenses.create(companyId, dto);
  }

  @RequirePermissions("expenses.read")
  @Get()
  findAll(@CompanyId() companyId: string, @Query() q: QueryExpensesDto) {
    return this.expenses.findAll(companyId, q);
  }

  @RequirePermissions("expenses.read")
  @Get(":id")
  findOne(@CompanyId() companyId: string, @Param("id") id: string) {
    return this.expenses.findOne(companyId, id);
  }

  @RequirePermissions("expenses.write")
  @Patch(":id")
  update(
    @CompanyId() companyId: string,
    @Param("id") id: string,
    @Body() dto: UpdateExpenseDto,
  ) {
    return this.expenses.update(companyId, id, dto);
  }

  @RequirePermissions("expenses.delete")
  @Delete(":id")
  remove(@CompanyId() companyId: string, @Param("id") id: string) {
    return this.expenses.remove(companyId, id);
  }
}
