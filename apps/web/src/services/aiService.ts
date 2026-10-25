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

export type AiAssistOption = "CUSTOMER" | "LEAD" | "VEHICLE" | "VEHICLE_SEARCH";
export type AiDocumentType = "EHLIYET" | "KIMLIK" | "RUHSAT" | "DIGER";
type N<T> = T | null;

export interface AiPerson {
  tckn: N<string>;
  firstName: N<string>;
  lastName: N<string>;
  birthDate: N<string>;
  birthPlace: N<string>;
  gender: N<"E" | "K">;
  fatherName: N<string>;
  motherName: N<string>;
  documentNo: N<string>;
  licenseClasses: N<string>;
  validUntil: N<string>;
  address: N<string>;
  city: N<string>;
  district: N<string>;
  phone: N<string>;
  email: N<string>;
}

export interface AiVehicle {
  plate: N<string>;
  brand: N<string>;
  model: N<string>;
  /** Ruhsattaki ticari adı */
  registrationModel: N<string>;
  modelYear: N<number>;
  vin: N<string>;
  engineNo: N<string>;
  color: N<string>;
  fuelType: N<"BENZIN" | "DIZEL" | "LPG" | "ELEKTRIK" | "HIBRIT">;
  transmission: N<"MANUEL" | "OTOMATIK" | "YARI_OTOMATIK">;
  bodyType: N<"SEDAN" | "HATCHBACK" | "STATION_WAGON" | "SUV" | "COUPE" | "CABRIO" | "MINIVAN" | "TICARI">;
  driveType: N<"ONDEN_CEKIS" | "ARKADAN_ITIS" | "FOUR_WD" | "AWD">;
  horsePower: N<number>;
  enginePower: N<number>;
  /** Belgede yazmayıp AI'ın marka/model/yıldan çıkardığı alanlar */
  inferred: N<string[]>;
  engineVolume: N<number>;
  registrationDate: N<string>;
  firstRegistrationDate: N<string>;
  ownerName: N<string>;
  ownerIdNo: N<string>;
}

export interface AiVehicleFilter {
  query: N<string>;
  minPrice: N<number>;
  maxPrice: N<number>;
  minYear: N<number>;
  maxYear: N<number>;
  transmission: N<"MANUEL" | "OTOMATIK">;
  fuelType: N<string>;
}

export interface AiAssistResult {
  documents: { photo: number; type: AiDocumentType; side: "ON" | "ARKA" | "BELIRSIZ" }[];
  recommended: AiAssistOption | "NONE";
  reason: string;
  summary: string;
  person: AiPerson | null;
  vehicle: AiVehicle | null;
  filter: AiVehicleFilter | null;
  answer: string | null;
  warnings: string[];
  /** Sunulacak kart seçenekleri, önerilen başta */
  options: AiAssistOption[];
  modelUsed: string;
  latencyMs: number;
}

export interface AiAssistInput {
  prompt?: string;
  images?: { mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif"; base64Data: string }[];
}

export async function getClaudeConfig(): Promise<ClaudeConfigData> {
  const { data } = await axios.get<ClaudeConfigData>("/admin/ai/claude/config");
  return data;
}

export async function updateClaudeConfig(dto: {
  apiKey?: string;
  model?: string;
  maxTokens?: number;
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
