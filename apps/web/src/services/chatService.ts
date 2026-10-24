import axios from "@/utils/axios";
import type { ChatMessage, ChatUser, Conversation } from "@/@types/chat";

export async function listChatUsers(): Promise<ChatUser[]> {
  const { data } = await axios.get<ChatUser[]>("/chat/users");
  return data;
}
export async function listConversations(): Promise<Conversation[]> {
  const { data } = await axios.get<Conversation[]>("/chat/conversations");
  return data;
}
export async function startConversation(userId: string, vehicleId?: string): Promise<Conversation> {
  const { data } = await axios.post<Conversation>("/chat/conversations", {
    userId,
    ...(vehicleId ? { vehicleId } : {}),
  });
  return data;
}
export async function listMessages(
  conversationId: string,
  params: { before?: string; limit?: number } = {},
): Promise<{ items: ChatMessage[]; hasMore: boolean }> {
  const { data } = await axios.get<{ items: ChatMessage[]; hasMore: boolean }>(
    `/chat/conversations/${conversationId}/messages`,
    { params },
  );
  return data;
}
export async function sendMessage(conversationId: string, content: string): Promise<ChatMessage> {
  const { data } = await axios.post<ChatMessage>(`/chat/conversations/${conversationId}/messages`, {
    content,
  });
  return data;
}
export async function markConversationRead(conversationId: string): Promise<void> {
  await axios.patch(`/chat/conversations/${conversationId}/read`);
}
export async function chatUnreadCount(): Promise<number> {
  const { data } = await axios.get<{ count: number }>("/chat/unread-count");
  return data.count;
}
