import { ConfigService } from '@nestjs/config';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Expo } from 'expo-server-sdk';
import { Repository } from 'typeorm';
import { EnvironmentVariables } from '../../config';
import { User } from '../users/entities/user.entity';
import { PushMessage } from './notifications.types';

/**
 * Відправка через Expo Push (expo-server-sdk). Сервер лише пропонує: користувач міг вимкнути сповіщення
 * (`pushEnabled`) або не дати дозвіл (немає токена): тоді тихо нічого не шлемо.
 */
@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private readonly expo: Expo;

  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    config: ConfigService<EnvironmentVariables, true>,
  ) {
    this.expo = new Expo({ accessToken: config.get('EXPO_ACCESS_TOKEN', { infer: true }) });
  }

  /** true — Expo прийняв повідомлення */
  async sendToUser(userId: string, message: Omit<PushMessage, 'to'>): Promise<boolean> {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user?.pushEnabled || !user.pushToken) return false;
    if (!Expo.isExpoPushToken(user.pushToken)) {
      this.logger.warn({ event: 'push_bad_token', userId });
      return false;
    }
    try {
      const [ticket] = await this.expo.sendPushNotificationsAsync([
        { ...message, data: { ...message.data }, to: user.pushToken },
      ]);
      if (ticket?.status === 'error') {
        this.logger.warn({
          event: 'push_ticket_error',
          userId,
          error: ticket.details?.error ?? ticket.message,
        });
        // пристрій більше не зареєстрований: очищаємо токен, щоб не слати вдруге
        if (ticket.details?.error === 'DeviceNotRegistered')
          await this.users.update({ id: userId }, { pushToken: null });
        return false;
      }
      return true;
    } catch (error) {
      this.logger.error({ event: 'push_failed', userId, reason: String(error) });
      return false;
    }
  }
}
