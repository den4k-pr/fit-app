import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { StorageModule } from '../storage/storage.module';
import { ExerciseRecord } from '../workouts/entities/exercise-record.entity';
import { WorkoutsModule } from '../workouts/workouts.module';
import { ClosePastDaysTask } from './close-past-days.task';
import { PurgePhotosTask } from './purge-photos.task';

@Module({
  imports: [TypeOrmModule.forFeature([ExerciseRecord]), StorageModule, WorkoutsModule, AuthModule],
  providers: [ClosePastDaysTask, PurgePhotosTask],
})
export class SchedulerModule {}
