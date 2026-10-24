import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from "class-validator";
import {
  LeadSource,
  LeadStatus,
  QuoteStatus,
  TestDriveStatus,
} from "@prisma/client";

export class CreateLeadDto {
  @IsString()
  fullName!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsEnum(LeadSource)
  source?: LeadSource;

  @IsOptional()
  @IsEnum(LeadStatus)
  status?: LeadStatus;

  @IsOptional()
  @IsNumber()
  @Min(0)
  budget?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  assignedUserId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  interestedVehicleIds?: string[];
}

export class UpdateLeadDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsEnum(LeadSource)
  source?: LeadSource;

  @IsOptional()
  @IsEnum(LeadStatus)
  status?: LeadStatus;

  @IsOptional()
  @IsNumber()
  @Min(0)
  budget?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  lostReason?: string;

  @IsOptional()
  @IsString()
  assignedUserId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  interestedVehicleIds?: string[];
}

export class QueryLeadsDto {
  @IsOptional()
  @IsEnum(LeadStatus)
  status?: LeadStatus;

  @IsOptional()
  @IsEnum(LeadSource)
  source?: LeadSource;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  vehicleId?: string;
}

export class CreateTestDriveDto {
  @IsString()
  leadId!: string;

  @IsString()
  vehicleId!: string;

  @IsDateString()
  scheduledAt!: string;

  @IsOptional()
  @IsNumber()
  @Min(5)
  durationMinutes?: number;

  @IsOptional()
  @IsString()
  driverLicenseNo?: string;

  @IsOptional()
  @IsString()
  assignedUserId?: string;

  @IsOptional()
  @IsString()
  feedbackNotes?: string;
}

export class UpdateTestDriveDto {
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsNumber()
  @Min(5)
  durationMinutes?: number;

  @IsOptional()
  @IsString()
  driverLicenseNo?: string;

  @IsOptional()
  @IsEnum(TestDriveStatus)
  status?: TestDriveStatus;

  @IsOptional()
  @IsString()
  assignedUserId?: string;

  @IsOptional()
  @IsNumber()
  feedbackRating?: number;

  @IsOptional()
  @IsString()
  feedbackNotes?: string;
}

export class CreateQuoteDto {
  @IsString()
  leadId!: string;

  @IsString()
  vehicleId!: string;

  @IsNumber()
  @Min(0)
  vehiclePrice!: number;

  @IsNumber()
  @Min(0)
  offeredPrice!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number;

  @IsOptional()
  @IsString()
  paymentType?: string; // Nakit, Banka Kredisi, Takas + Nakit, Senet

  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @IsOptional()
  @IsString()
  terms?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateQuoteDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  vehiclePrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  offeredPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number;

  @IsOptional()
  @IsString()
  paymentType?: string;

  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @IsOptional()
  @IsEnum(QuoteStatus)
  status?: QuoteStatus;

  @IsOptional()
  @IsString()
  terms?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ConvertLeadDto {
  @IsOptional()
  @IsString()
  entityType?: "INDIVIDUAL" | "CORPORATE";

  @IsOptional()
  @IsString()
  taxOffice?: string;

  @IsOptional()
  @IsString()
  taxNumber?: string;

  @IsOptional()
  @IsString()
  tckn?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsString()
  quoteId?: string;
}

export class CreateLeadActivityDto {
  @IsString()
  type!: string; // NOTE, CALL, MEETING, TEST_DRIVE, QUOTE

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  content?: string;
}

export class GenerateAiMessageDto {
  @IsString()
  leadId!: string;

  @IsString()
  vehicleId!: string;

  @IsOptional()
  @IsString()
  quoteId?: string;

  @IsOptional()
  @IsString()
  type?: "quote_share" | "test_drive_invite" | "follow_up";
}
