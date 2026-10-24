import { Logger } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { PrismaService } from "../prisma/prisma.service";
import { JwtPayload } from "../auth/auth.types";

export interface SocketIdentity {
  userId: string;
  companyId: string;
  isSuperAdmin: boolean;
}

/**
 * Socket.io gateway. İstemci bağlanırken `auth: { token, companyId }` gönderir;
 * JWT doğrulanır, şirket üyeliği kontrol edilir ve soket
 *   - `company:{companyId}`  (şirket geneli yayınlar: aktivite, transfer, sohbet)
 *   - `user:{userId}`        (kişiye özel bildirimler)
 * odalarına alınır. Yetkisiz bağlantı anında kapatılır.
 */
@WebSocketGateway({
  cors: { origin: process.env.CORS_ORIGIN?.split(",") ?? true, credentials: true },
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const { token, companyId } = (client.handshake.auth ?? {}) as {
        token?: string;
        companyId?: string;
      };
      if (!token || !companyId) throw new Error("token/companyId eksik");
      const payload = this.jwt.verify<JwtPayload>(token);

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, isSuperAdmin: true, isActive: true },
      });
      if (!user?.isActive) throw new Error("kullanıcı pasif");

      if (!user.isSuperAdmin) {
        const member = await this.prisma.companyMembership.count({
          where: { userId: user.id, companyId },
        });
        if (!member) throw new Error("şirket üyeliği yok");
      }

      const identity: SocketIdentity = {
        userId: user.id,
        companyId,
        isSuperAdmin: user.isSuperAdmin,
      };
      client.data.identity = identity;
      await client.join([`company:${companyId}`, `user:${user.id}`]);
      client.emit("ready", { companyId });
    } catch (e) {
      this.logger.debug(`Soket reddedildi: ${(e as Error).message}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    void client;
  }

  /** Bir şirketteki herkese yayın */
  toCompany(companyId: string, event: string, payload: unknown) {
    this.server?.to(`company:${companyId}`).emit(event, payload);
  }

  /** Tek kullanıcıya (tüm açık sekmelerine) yayın */
  toUser(userId: string, event: string, payload: unknown) {
    this.server?.to(`user:${userId}`).emit(event, payload);
  }
}
