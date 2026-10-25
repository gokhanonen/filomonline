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
import { AuthUser } from "../auth/auth.types";
import { CrmService } from "./crm.service";
import {
  ConvertLeadDto,
  CreateLeadActivityDto,
  CreateLeadDto,
  CreateQuoteDto,
  CreateTestDriveDto,
  GenerateAiMessageDto,
  QueryLeadsDto,
  UpdateLeadDto,
  UpdateQuoteDto,
  UpdateTestDriveDto,
} from "./dto/crm.dto";
import { QuoteStatus, TestDriveStatus } from "@prisma/client";

@ApiTags("crm")
@ApiBearerAuth()
@Controller("crm")
export class CrmController {
  constructor(private readonly crm: CrmService) {}

  // --- LEADS ---

  @Get("leads")
  listLeads(@CompanyId() companyId: string, @Query() q: QueryLeadsDto) {
    return this.crm.listLeads(companyId, q);
  }

  @Post("leads")
  createLead(
    @CompanyId() companyId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateLeadDto,
  ) {
    return this.crm.createLead(companyId, user.id, dto);
  }

  @Get("leads/:id")
  getLead(@CompanyId() companyId: string, @Param("id") id: string) {
    return this.crm.getLead(companyId, id);
  }

  @Patch("leads/:id")
  updateLead(
    @CompanyId() companyId: string,
    @Param("id") id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateLeadDto,
  ) {
    return this.crm.updateLead(companyId, id, user.id, dto);
  }

  @Delete("leads/:id")
  deleteLead(@CompanyId() companyId: string, @Param("id") id: string) {
    return this.crm.deleteLead(companyId, id);
  }

  @Post("leads/:id/vehicles")
  addVehicle(
    @CompanyId() companyId: string,
    @Param("id") id: string,
    @Body() body: { vehicleId: string; notes?: string },
  ) {
    return this.crm.addInterestedVehicle(companyId, id, body.vehicleId, body.notes);
  }

  @Delete("leads/:id/vehicles/:vehicleId")
  removeVehicle(
    @CompanyId() companyId: string,
    @Param("id") id: string,
    @Param("vehicleId") vehicleId: string,
  ) {
    return this.crm.removeInterestedVehicle(companyId, id, vehicleId);
  }

  @Post("leads/:id/activities")
  addActivity(
    @CompanyId() companyId: string,
    @Param("id") id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateLeadActivityDto,
  ) {
    return this.crm.addActivity(companyId, id, user.id, dto);
  }

  @Post("leads/:id/convert")
  convertToCustomer(
    @CompanyId() companyId: string,
    @Param("id") id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: ConvertLeadDto,
  ) {
    return this.crm.convertToCustomer(companyId, id, user.id, dto);
  }

  @Post("leads/ai-message")
  generateAiMessage(
    @CompanyId() companyId: string,
    @Body() dto: GenerateAiMessageDto,
  ) {
    return this.crm.generateAiMessage(companyId, dto);
  }

  // --- TEST DRIVES ---

  @Get("test-drives")
  listTestDrives(
    @CompanyId() companyId: string,
    @Query("status") status?: TestDriveStatus,
    @Query("leadId") leadId?: string,
    @Query("vehicleId") vehicleId?: string,
  ) {
    return this.crm.listTestDrives(companyId, { status, leadId, vehicleId });
  }

  @Post("test-drives")
  createTestDrive(
    @CompanyId() companyId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateTestDriveDto,
  ) {
    return this.crm.createTestDrive(companyId, user.id, dto);
  }

  @Patch("test-drives/:id")
  updateTestDrive(
    @CompanyId() companyId: string,
    @Param("id") id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateTestDriveDto,
  ) {
    return this.crm.updateTestDrive(companyId, id, user.id, dto);
  }

  @Delete("test-drives/:id")
  deleteTestDrive(@CompanyId() companyId: string, @CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.crm.deleteTestDrive(companyId, id, user.id);
  }

  // --- QUOTES ---

  @Get("quotes")
  listQuotes(
    @CompanyId() companyId: string,
    @Query("status") status?: QuoteStatus,
    @Query("leadId") leadId?: string,
  ) {
    return this.crm.listQuotes(companyId, { status, leadId });
  }

  @Post("quotes")
  createQuote(
    @CompanyId() companyId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateQuoteDto,
  ) {
    return this.crm.createQuote(companyId, user.id, dto);
  }

  @Patch("quotes/:id")
  updateQuote(
    @CompanyId() companyId: string,
    @Param("id") id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateQuoteDto,
  ) {
    return this.crm.updateQuote(companyId, id, user.id, dto);
  }

  @Delete("quotes/:id")
  deleteQuote(@CompanyId() companyId: string, @CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.crm.deleteQuote(companyId, id, user.id);
  }
}
