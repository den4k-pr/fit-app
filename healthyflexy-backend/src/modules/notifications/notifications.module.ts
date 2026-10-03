import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Family } from '../families/entities/family.entity';
import { User } from '../users/entities/user.entity';
import { NotificationsListener } from './notifications.listener';
import { PushService } from './push.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Family])],
  providers: [PushService, NotificationsListener],
  exports: [PushService],
})
export class NotificationsModule {}
