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
import { AccountsService } from "./accounts.service";
import {
  CreateAccountDto,
  QueryAccountsDto,
  UpdateAccountDto,
} from "./dto/account.dto";

@ApiTags("accounts")
@ApiBearerAuth()
@Controller("accounts")
export class AccountsController {
  constructor(private readonly accounts: AccountsService) {}

  @RequirePermissions("accounts.write")
  @Post()
  create(@CompanyId() companyId: string, @Body() dto: CreateAccountDto) {
    return this.accounts.create(companyId, dto);
  }

  @RequirePermissions("accounts.read")
  @Get()
  findAll(@CompanyId() companyId: string, @Query() q: QueryAccountsDto) {
    return this.accounts.findAll(companyId, q);
  }

  @RequirePermissions("accounts.read")
  @Get(":id")
  findOne(@CompanyId() companyId: string, @Param("id") id: string) {
    return this.accounts.findOne(companyId, id);
  }

  @RequirePermissions("accounts.write")
  @Patch(":id")
  update(
    @CompanyId() companyId: string,
    @Param("id") id: string,
    @Body() dto: UpdateAccountDto,
  ) {
    return this.accounts.update(companyId, id, dto);
  }

  @RequirePermissions("accounts.delete")
  @Delete(":id")
  remove(@CompanyId() companyId: string, @Param("id") id: string) {
    return this.accounts.remove(companyId, id);
  }
}
