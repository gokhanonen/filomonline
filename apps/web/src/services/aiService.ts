import axios from "@/utils/axios";

export interface ClaudeModelInfo {
  id: string;
  name: string;
  description: string;
  default: boolean;
}

export interface ClaudeConfigData {
  isConfigured: boolean;
  maskedApiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
  availableModels: ClaudeModelInfo[];
}

export interface TestClaudeResult {
  success: boolean;
  model: string;
  response: string;
  latencyMs: number;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

export type AiIntentType =
  | "EHLIYET"
  | "RUHSAT"
  | "VEHICLE_SEARCH"
  | "GENERAL";

export interface ExtractedDriverLicense {
  tcNo?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  birthDate?: string;
  licenseClass?: string;
  documentNo?: string;
  validUntil?: string;
  phone?: string;
  city?: string;
}

export interface ExtractedVehicleRegistration {
  plate?: string;
  brand?: string;
  model?: string;
  year?: number;
  vin?: string;
  engineNo?: string;
  color?: string;
  fuelType?: string;
  transmission?: string;
  registrationDate?: string;
}

export interface ExtractedVehicleFilter {
  query?: string;
  minPrice?: number;
  maxPrice?: number;
  minYear?: number;
  maxYear?: number;
  transmission?: "OTOMATIK" | "MANUEL";
  fuelType?: string;
  status?: string;
  brand?: string;
}

export interface AiAssistAction {
  type:
    | "OPEN_LEAD_OR_ACCOUNT"
    | "OPEN_VEHICLE_MODAL"
    | "NAVIGATE_VEHICLE_FILTER"
    | "INFO";
  url?: string;
  params?: Record<string, any>;
}

export interface AiAssistResult {
  intent: AiIntentType;
  title: string;
  summary: string;
  data?: {
    license?: ExtractedDriverLicense;
    registration?: ExtractedVehicleRegistration;
    filter?: ExtractedVehicleFilter;
    generalAnswer?: string;
  };
  action: AiAssistAction;
  modelUsed?: string;
  latencyMs?: number;
}

export interface AiAssistInput {
  prompt?: string;
  image?: {
    mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
    base64Data: string;
  };
  docTypeHint?: "EHLIYET" | "RUHSAT" | "AUTO";
}

export async function getClaudeConfig(): Promise<ClaudeConfigData> {
  const { data } = await axios.get<ClaudeConfigData>("/admin/ai/claude/config");
  return data;
}

export async function updateClaudeConfig(dto: {
  apiKey?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}): Promise<ClaudeConfigData> {
  const { data } = await axios.put<ClaudeConfigData>("/admin/ai/claude/config", dto);
  return data;
}

export async function testClaudeConnection(prompt?: string): Promise<TestClaudeResult> {
  const { data } = await axios.post<TestClaudeResult>("/admin/ai/claude/test", { prompt });
  return data;
}

export async function sendAiAssist(input: AiAssistInput): Promise<AiAssistResult> {
  const { data } = await axios.post<AiAssistResult>("/ai/assist", input);
  return data;
}
