import axios from "@/utils/axios";

export interface PartyOverview {
  party: {
    id: string;
    name: string;
    entityType: "INDIVIDUAL" | "CORPORATE";
    phone?: string | null;
    email?: string | null;
    taxNumber?: string | null;
  };
  accounts: {
    id: string;
    companyId: string;
    companyName: string;
    type: string;
    balance: number;
    isPotential: boolean;
  }[];
  leads: {
    id: string;
    companyId: string;
    companyName: string;
    status: string;
    createdAt: string;
  }[];
}

export async function getPartyOverview(id: string): Promise<PartyOverview> {
  const { data } = await axios.get<PartyOverview>(`/party/${id}`);
  return data;
}
