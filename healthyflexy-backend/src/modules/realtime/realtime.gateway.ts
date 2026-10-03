import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OnGatewayConnection, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtAccessPayload } from '../../common/interfaces';
import { FamilyContextService } from '../families/family-context.service';
import { RealtimePayloadMap, roomForFamily, roomForUser } from './realtime.events';

/**
 * socket.io (`/realtime`). Клієнт підключається з `auth: { token: <accessToken> }`.
 * Сокет автоматично потрапляє в кімнати `user:{id}` та `family:{id}` (усіх сімей користувача); невалідний токен → disconnect.
 * Події «тонкі»: клієнт після них інвалідовує запити TanStack Query, а не довіряє payload'у щодо грошей.
 */
@WebSocketGateway({ namespace: '/realtime', cors: false })
export class RealtimeGateway implements OnGatewayConnection {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly context: FamilyContextService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token = (client.handshake.auth as { token?: string } | undefined)?.token;
      if (!token) throw new Error('no token');
      const payload = await this.jwt.verifyAsync<JwtAccessPayload>(token);
      await client.join(roomForUser(payload.sub));
      // дитина з кількома батьками отримує події всіх своїх сімей
      const families = await this.context.listFamiliesFor(payload.sub);
      for (const family of families) await client.join(roomForFamily(family.id));
    } catch {
      this.logger.debug('socket rejected: invalid token');
      client.disconnect(true);
    }
  }

  emitToFamily<E extends keyof RealtimePayloadMap>(
    familyId: string,
    event: E,
    payload: RealtimePayloadMap[E],
  ): void {
    this.server?.to(roomForFamily(familyId)).emit(event, payload);
  }

  /** Сім'я щойно створена: уже підключені сокети обох учасників входять у її кімнату */
  joinFamilyRoom(userIds: string[], familyId: string): void {
    for (const id of userIds)
      void this.server?.in(roomForUser(id)).socketsJoin(roomForFamily(familyId));
  }
}
