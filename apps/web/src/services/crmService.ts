import axios from "@/utils/axios";

export type LeadStatus =
  | "NEW"
  | "CONTACTED"
  | "TEST_DRIVE"
  | "QUOTE_SENT"
  | "NEGOTIATION"
  | "CONVERTED"
  | "LOST";

export type LeadSource =
  | "SAHIBINDEN"
  | "ARABAM"
  | "WEBSITE"
  | "WALK_IN"
  | "REFERRAL"
  | "SOCIAL_MEDIA"
  | "PHONE"
  | "OTHER";

export type TestDriveStatus =
  | "SCHEDULED"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

export type QuoteStatus =
  | "DRAFT"
  | "SENT"
  | "ACCEPTED"
  | "REJECTED"
  | "EXPIRED";

export interface InterestedVehicleInfo {
  id: string;
  plate: string;
  brandName?: string;
  modelName?: string;
  year?: number;
  km?: number;
  saleAmount?: number;
  fuelType?: string;
  transmission?: string;
  status?: string;
  photos?: Array<{ id?: string; url?: string; thumbUrl?: string }>;
}

export interface LeadInterestedVehicle {
  id: string;
  leadId: string;
  vehicleId: string;
  notes?: string;
  createdAt: string;
  vehicle: InterestedVehicleInfo;
}

export interface LeadTestDrive {
  id: string;
  companyId: string;
  leadId: string;
  vehicleId: string;
  scheduledAt: string;
  durationMinutes: number;
  driverLicenseNo?: string;
  status: TestDriveStatus;
  assignedUserId?: string;
  feedbackRating?: number;
  feedbackNotes?: string;
  createdAt: string;
  lead?: { id: string; fullName: string; phone?: string; email?: string };
  vehicle?: { id: string; plate: string; brandName?: string; modelName?: string; year?: number };
}

export interface LeadQuote {
  id: string;
  companyId: string;
  leadId: string;
  vehicleId: string;
  quoteNumber: string;
  vehiclePrice: number;
  offeredPrice: number;
  discountAmount?: number;
  paymentType?: string;
  validUntil?: string;
  status: QuoteStatus;
  terms?: string;
  notes?: string;
  createdAt: string;
  lead?: { id: string; fullName: string; phone?: string; email?: string };
  vehicle?: { id: string; plate: string; brandName?: string; modelName?: string; year?: number; km?: number };
}

export interface LeadActivity {
  id: string;
  leadId: string;
  userId?: string;
  userName?: string;
  type: string;
  title: string;
  content?: string;
  createdAt: string;
}

export interface Lead {
  id: string;
  companyId: string;
  fullName: string;
  phone?: string;
  email?: string;
  source: LeadSource;
  status: LeadStatus;
  budget?: number;
  notes?: string;
  lostReason?: string;
  assignedUserId?: string;
  convertedAccountId?: string;
  convertedAt?: string;
  createdAt: string;
  updatedAt: string;
  interestedVehicles?: LeadInterestedVehicle[];
  testDrives?: LeadTestDrive[];
  quotes?: LeadQuote[];
  activities?: LeadActivity[];
  _count?: {
    testDrives: number;
    quotes: number;
    activities: number;
  };
}

export interface CreateLeadDto {
  fullName: string;
  phone?: string;
  email?: string;
  source?: LeadSource;
  status?: LeadStatus;
  budget?: number;
  notes?: string;
  assignedUserId?: string;
  interestedVehicleIds?: string[];
}

export interface UpdateLeadDto extends Partial<CreateLeadDto> {
  lostReason?: string;
}

export interface CreateTestDriveDto {
  leadId: string;
  vehicleId: string;
  scheduledAt: string;
  durationMinutes?: number;
  driverLicenseNo?: string;
  assignedUserId?: string;
  feedbackNotes?: string;
}

export interface UpdateTestDriveDto {
  scheduledAt?: string;
  durationMinutes?: number;
  driverLicenseNo?: string;
  status?: TestDriveStatus;
  assignedUserId?: string;
  feedbackRating?: number;
  feedbackNotes?: string;
}

export interface CreateQuoteDto {
  leadId: string;
  vehicleId: string;
  vehiclePrice: number;
  offeredPrice: number;
  discountAmount?: number;
  paymentType?: string;
  validUntil?: string;
  terms?: string;
  notes?: string;
}

export interface UpdateQuoteDto extends Partial<CreateQuoteDto> {
  status?: QuoteStatus;
}

export interface ConvertLeadDto {
  entityType?: "INDIVIDUAL" | "CORPORATE";
  taxOffice?: string;
  taxNumber?: string;
  tckn?: string;
  address?: string;
  city?: string;
  district?: string;
  quoteId?: string;
}

export interface GenerateAiMessageDto {
  leadId: string;
  vehicleId: string;
  quoteId?: string;
  type?: "quote_share" | "test_drive_invite" | "follow_up";
}

// ============================================================================
// API METHODS
// ============================================================================

export const listLeads = async (params?: {
  status?: LeadStatus;
  source?: LeadSource;
  search?: string;
  vehicleId?: string;
}): Promise<Lead[]> => {
  const { data } = await axios.get<Lead[]>("/crm/leads", { params });
  return data;
};

export const getLead = async (id: string): Promise<Lead> => {
  const { data } = await axios.get<Lead>(`/crm/leads/${id}`);
  return data;
};

export const createLead = async (dto: CreateLeadDto): Promise<Lead> => {
  const { data } = await axios.post<Lead>("/crm/leads", dto);
  return data;
};

export const updateLead = async (id: string, dto: UpdateLeadDto): Promise<Lead> => {
  const { data } = await axios.patch<Lead>(`/crm/leads/${id}`, dto);
  return data;
};

export const deleteLead = async (id: string): Promise<{ success: boolean }> => {
  const { data } = await axios.delete<{ success: boolean }>(`/crm/leads/${id}`);
  return data;
};

export const addInterestedVehicle = async (
  leadId: string,
  vehicleId: string,
  notes?: string,
): Promise<LeadInterestedVehicle> => {
  const { data } = await axios.post<LeadInterestedVehicle>(`/crm/leads/${leadId}/vehicles`, {
    vehicleId,
    notes,
  });
  return data;
};

export const removeInterestedVehicle = async (
  leadId: string,
  vehicleId: string,
): Promise<{ success: boolean }> => {
  const { data } = await axios.delete<{ success: boolean }>(
    `/crm/leads/${leadId}/vehicles/${vehicleId}`,
  );
  return data;
};

export const addLeadActivity = async (
  leadId: string,
  dto: { type: string; title: string; content?: string },
): Promise<LeadActivity> => {
  const { data } = await axios.post<LeadActivity>(`/crm/leads/${leadId}/activities`, dto);
  return data;
};

export const convertLeadToCustomer = async (
  leadId: string,
  dto: ConvertLeadDto,
): Promise<{ lead: Lead; account: any }> => {
  const { data } = await axios.post<{ lead: Lead; account: any }>(
    `/crm/leads/${leadId}/convert`,
    dto,
  );
  return data;
};

export const generateAiQuoteMessage = async (
  dto: GenerateAiMessageDto,
): Promise<{ message: string; model: string; latencyMs: number }> => {
  const { data } = await axios.post<{ message: string; model: string; latencyMs: number }>(
    "/crm/leads/ai-message",
    dto,
  );
  return data;
};

// --- Test Drives ---

export const listTestDrives = async (params?: {
  status?: TestDriveStatus;
  leadId?: string;
  vehicleId?: string;
}): Promise<LeadTestDrive[]> => {
  const { data } = await axios.get<LeadTestDrive[]>("/crm/test-drives", { params });
  return data;
};

export const createTestDrive = async (dto: CreateTestDriveDto): Promise<LeadTestDrive> => {
  const { data } = await axios.post<LeadTestDrive>("/crm/test-drives", dto);
  return data;
};

export const updateTestDrive = async (
  id: string,
  dto: UpdateTestDriveDto,
): Promise<LeadTestDrive> => {
  const { data } = await axios.patch<LeadTestDrive>(`/crm/test-drives/${id}`, dto);
  return data;
};

export const deleteTestDrive = async (id: string): Promise<{ success: boolean }> => {
  const { data } = await axios.delete<{ success: boolean }>(`/crm/test-drives/${id}`);
  return data;
};

// --- Quotes ---

export const listQuotes = async (params?: {
  status?: QuoteStatus;
  leadId?: string;
}): Promise<LeadQuote[]> => {
  const { data } = await axios.get<LeadQuote[]>("/crm/quotes", { params });
  return data;
};

export const createQuote = async (dto: CreateQuoteDto): Promise<LeadQuote> => {
  const { data } = await axios.post<LeadQuote>("/crm/quotes", dto);
  return data;
};

export const updateQuote = async (id: string, dto: UpdateQuoteDto): Promise<LeadQuote> => {
  const { data } = await axios.patch<LeadQuote>(`/crm/quotes/${id}`, dto);
  return data;
};

export const deleteQuote = async (id: string): Promise<{ success: boolean }> => {
  const { data } = await axios.delete<{ success: boolean }>(`/crm/quotes/${id}`);
  return data;
};
