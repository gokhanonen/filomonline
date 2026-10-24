import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { RealtimeGateway } from "../realtime/realtime.gateway";
import { Paginated } from "../common/dto/pagination.dto";

export type ActivityType =
  | "VEHICLE_NEW"
  | "VEHICLE_UPDATE"
  | "VEHICLE_PURCHASE"
  | "VEHICLE_SALE"
  | "VEHICLE_SALE_CANCEL"
  | "VEHICLE_OPTION"
  | "VEHICLE_OPTION_CANCEL"
  | "RENTAL_NEW"
  | "RENTAL_UPDATE"
  | "EXPENSE_NEW"
  | "TRANSFER_REQUEST"
  | "TRANSFER_CONFIRM"
  | "TRANSFER_CANCEL"
  | "CONTRACT_NEW"
  | "DOCUMENT_NEW"
  | "INVOICE_STATUS"
  | "ACCOUNT_NEW"
  | "USER_NEW"
  | "CHAT_MESSAGE"
  | "SYSTEM";

export interface LogInput {
  companyId: string;
  type: ActivityType;
  title: string;
  description: string;
  entityType: string; // vehicle, rental, expense, transfer, contract, account, user...
  entityId: string;
  userId: string;
  link?: string;
}

/**
 * Aktivite günlüğü: her önemli iş olayı kaydedilir ve Socket.io ile
 * şirket odasına `activity` olayı olarak anında yayınlanır (bildirim zili).
 */
@Injectable()
export class ActivityService {
  private readonly logger = new Logger(ActivityService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
  ) {}

  /** Hata fırlatmaz: log yazılamazsa ana iş akışı bozulmasın. */
  async log(input: LogInput) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: input.userId },
        select: { name: true },
      });
      const row = await this.prisma.activityLog.create({
        data: { ...input, userName: user?.name ?? null },
      });
      this.realtime.toCompany(input.companyId, "activity", row);
      return row;
    } catch (e) {
      this.logger.warn(`Aktivite yazılamadı: ${(e as Error).message}`);
      return null;
    }
  }

  async list(
    companyId: string,
    q: { page: number; pageSize: number; unreadOnly?: boolean; entityType?: string; entityId?: string },
  ): Promise<Paginated<unknown>> {
    const where = {
      companyId,
      ...(q.unreadOnly ? { read: false } : {}),
      ...(q.entityType ? { entityType: q.entityType } : {}),
      ...(q.entityId ? { entityId: q.entityId } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
      this.prisma.activityLog.count({ where }),
    ]);
    return { items, total, page: q.page, pageSize: q.pageSize };
  }

  unreadCount(companyId: string) {
    return this.prisma.activityLog
      .count({ where: { companyId, read: false } })
      .then((count) => ({ count }));
  }

  async markRead(companyId: string, id: string) {
    await this.prisma.activityLog.updateMany({
      where: { id, companyId },
      data: { read: true },
    });
    return { success: true };
  }

  async markAllRead(companyId: string) {
    await this.prisma.activityLog.updateMany({
      where: { companyId, read: false },
      data: { read: true },
    });
    return { success: true };
  }
}
