export interface ChatUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  readAt?: string | null;
  createdAt: string;
  sender?: ChatUser | null;
}

export interface Conversation {
  id: string;
  vehicleId?: string | null;
  otherUser: ChatUser;
  lastMessage: ChatMessage | null;
  unreadCount: number;
  updatedAt: string;
  createdAt: string;
}

export interface ChatReadEvent {
  conversationId: string;
  readBy: string;
  readAt: string;
  count: number;
}
