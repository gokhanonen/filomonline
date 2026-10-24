import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { PaginationDto } from "../common/dto/pagination.dto";
import { SkipCompany } from "../tenancy/skip-company.decorator";
import { SuperAdminGuard } from "../tenancy/super-admin.guard";
import { CompaniesService } from "./companies.service";
import { CreateCompanyDto, UpdateCompanyDto } from "./dto/company.dto";

@ApiTags("companies")
@ApiBearerAuth()
@SkipCompany()
@UseGuards(SuperAdminGuard)
@Controller("companies")
export class CompaniesController {
  constructor(private readonly companies: CompaniesService) {}

  @Post()
  create(@Body() dto: CreateCompanyDto) {
    return this.companies.create(dto);
  }

  @Get()
  findAll(@Query() q: PaginationDto, @Query("tenantId") tenantId?: string) {
    return this.companies.findAll(q, tenantId);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.companies.findOne(id);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateCompanyDto) {
    return this.companies.update(id, dto);
  }
}
