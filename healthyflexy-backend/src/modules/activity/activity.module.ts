import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FamilyContextModule } from '../families/family-context.module';
import { DaySession } from '../workouts/entities/day-session.entity';
import { WorkoutsModule } from '../workouts/workouts.module';
import { ActivityController } from './activity.controller';
import { ActivityService } from './activity.service';
import { DailySteps } from './entities/daily-steps.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([DailySteps, DaySession]),
    FamilyContextModule,
    WorkoutsModule,
  ],
  controllers: [ActivityController],
  providers: [ActivityService],
})
export class ActivityModule {}
