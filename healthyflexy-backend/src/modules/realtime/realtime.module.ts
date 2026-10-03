import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { FamilyContextModule } from '../families/family-context.module';
import { DaySession } from '../workouts/entities/day-session.entity';
import { RealtimeGateway } from './realtime.gateway';
import { RealtimeListener } from './realtime.listener';

@Module({
  imports: [AuthModule, FamilyContextModule, TypeOrmModule.forFeature([DaySession])],
  providers: [RealtimeGateway, RealtimeListener],
  exports: [RealtimeGateway],
})
export class RealtimeModule {}
