import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { RealtimeGateway } from "../realtime/realtime.gateway";
import { ActivityService } from "../activity/activity.service";
import { QueryMessagesDto, SendMessageDto, StartConversationDto } from "./dto/chat.dto";

const userSelect = { id: true, name: true, email: true, avatarUrl: true, isActive: true } as const;

export interface ChatUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

/**
 * Bire bir sohbet. Her sohbet şirket kapsamlıdır (companyId) ve iki katılımcısı vardır.
 * Mesajlar Socket.io ile `chat:message`, okundu bilgisi `chat:read` olayıyla yayınlanır.
 */
@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
    private readonly activity: ActivityService,
  ) {}

  /** Şirketteki diğer aktif kullanıcılar (sohbet başlatılabilecekler) */
  async users(companyId: string, meId: string): Promise<ChatUser[]> {
    const members = await this.prisma.companyMembership.findMany({
      where: { companyId, userId: { not: meId }, user: { isActive: true } },
      include: { user: { select: userSelect } },
      orderBy: { user: { name: "asc" } },
    });
    return members.map((m) => this.pickUser(m.user));
  }

  async conversations(companyId: string, meId: string) {
    const list = await this.prisma.conversation.findMany({
      where: { companyId, participants: { some: { userId: meId } } },
      orderBy: { updatedAt: "desc" },
      include: {
        participants: true,
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });
    const otherIds = [
      ...new Set(
        list.flatMap((c) => c.participants.filter((p) => p.userId !== meId).map((p) => p.userId)),
      ),
    ];
    const users = await this.prisma.user.findMany({
      where: { id: { in: otherIds } },
      select: userSelect,
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    // Okunmamış sayıları tek sorguda grupla
    const unread = await this.prisma.message.groupBy({
      by: ["conversationId"],
      where: {
        conversationId: { in: list.map((c) => c.id) },
        senderId: { not: meId },
        readAt: null,
      },
      _count: { _all: true },
    });
    const unreadMap = new Map(unread.map((u) => [u.conversationId, u._count._all]));

    return list
      .map((c) => {
        const otherId = c.participants.find((p) => p.userId !== meId)?.userId;
        const other = otherId ? userMap.get(otherId) : undefined;
        if (!other) return null; // karşı taraf silinmiş
        return {
          id: c.id,
          vehicleId: c.vehicleId,
          otherUser: this.pickUser(other),
          lastMessage: c.messages[0] ?? null,
          unreadCount: unreadMap.get(c.id) ?? 0,
          updatedAt: c.updatedAt,
          createdAt: c.createdAt,
        };
      })
      .filter(Boolean);
  }

  /** Var olan 1:1 sohbeti bul, yoksa oluştur */
  async startConversation(companyId: string, meId: string, dto: StartConversationDto) {
    if (dto.userId === meId) throw new BadRequestException("Kendinizle sohbet başlatamazsınız");
    const member = await this.prisma.companyMembership.count({
      where: { companyId, userId: dto.userId, user: { isActive: true } },
    });
    if (!member) throw new BadRequestException("Kullanıcı bu şirkette değil");

    const existing = await this.prisma.conversation.findFirst({
      where: {
        companyId,
        AND: [
          { participants: { some: { userId: meId } } },
          { participants: { some: { userId: dto.userId } } },
        ],
      },
    });
    const conv =
      existing ??
      (await this.prisma.conversation.create({
        data: {
          companyId,
          vehicleId: dto.vehicleId ?? null,
          participants: { create: [{ userId: meId }, { userId: dto.userId }] },
        },
      }));
    const list = await this.conversations(companyId, meId);
    return list.find((c) => c && c.id === conv.id) ?? { id: conv.id };
  }

  async messages(companyId: string, meId: string, conversationId: string, q: QueryMessagesDto) {
    await this.assertParticipant(companyId, meId, conversationId);
    let cursor: { createdAt: Date } | null = null;
    if (q.before) {
      cursor = await this.prisma.message.findFirst({
        where: { id: q.before, conversationId },
        select: { createdAt: true },
      });
    }
    const rows = await this.prisma.message.findMany({
      where: {
        conversationId,
        ...(cursor ? { createdAt: { lt: cursor.createdAt } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: q.limit,
    });
    return {
      items: rows.reverse(), // artan sırada döner
      hasMore: rows.length === q.limit,
    };
  }

  async send(companyId: string, meId: string, conversationId: string, dto: SendMessageDto) {
    const conv = await this.assertParticipant(companyId, meId, conversationId);
    const content = dto.content.trim();
    if (!content) throw new BadRequestException("Mesaj boş olamaz");

    const [msg] = await this.prisma.$transaction([
      this.prisma.message.create({ data: { conversationId, senderId: meId, content } }),
      this.prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      }),
    ]);

    const sender = await this.prisma.user.findUnique({ where: { id: meId }, select: userSelect });
    const payload = { ...msg, conversationId, sender: sender ? this.pickUser(sender) : null };
    for (const p of conv.participants) {
      this.realtime.toUser(p.userId, "chat:message", payload);
    }

    const recipient = conv.participants.find((p) => p.userId !== meId);
    if (recipient) {
      // Aktivite: sadece alıcıya anlamlı; şirket odasına da düşer (bildirim zili)
      void this.activity.log({
        companyId,
        type: "CHAT_MESSAGE",
        title: `${sender?.name ?? "Bir kullanıcı"} mesaj gönderdi`,
        description: content.length > 120 ? content.slice(0, 117) + "..." : content,
        entityType: "conversation",
        entityId: conversationId,
        userId: meId,
        link: `/chat?conversation=${conversationId}`,
      });
    }
    return payload;
  }

  async markRead(companyId: string, meId: string, conversationId: string) {
    const conv = await this.assertParticipant(companyId, meId, conversationId);
    const now = new Date();
    const res = await this.prisma.message.updateMany({
      where: { conversationId, senderId: { not: meId }, readAt: null },
      data: { readAt: now },
    });
    await this.prisma.conversationParticipant.updateMany({
      where: { conversationId, userId: meId },
      data: { lastReadAt: now },
    });
    if (res.count > 0) {
      const payload = { conversationId, readBy: meId, readAt: now, count: res.count };
      for (const p of conv.participants) this.realtime.toUser(p.userId, "chat:read", payload);
    }
    return { success: true, count: res.count };
  }

  async unreadCount(companyId: string, meId: string) {
    const count = await this.prisma.message.count({
      where: {
        senderId: { not: meId },
        readAt: null,
        conversation: { companyId, participants: { some: { userId: meId } } },
      },
    });
    return { count };
  }

  // --- yardımcılar ---

  private async assertParticipant(companyId: string, meId: string, conversationId: string) {
    const conv = await this.prisma.conversation.findFirst({
      where: { id: conversationId, companyId },
      include: { participants: true },
    });
    if (!conv) throw new NotFoundException("Sohbet bulunamadı");
    if (!conv.participants.some((p) => p.userId === meId)) {
      throw new ForbiddenException("Bu sohbetin katılımcısı değilsiniz");
    }
    return conv;
  }

  private pickUser(u: { id: string; name: string; email: string; avatarUrl: string | null }): ChatUser {
    return { id: u.id, name: u.name, email: u.email, avatarUrl: u.avatarUrl };
  }
}
