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
