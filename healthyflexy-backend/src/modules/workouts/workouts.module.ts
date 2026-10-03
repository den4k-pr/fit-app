import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiModule } from '../ai/ai.module';
import { ExercisesModule } from '../exercises/exercises.module';
import { Family } from '../families/entities/family.entity';
import { FamilyContextModule } from '../families/family-context.module';
import { LedgerModule } from '../ledger/ledger.module';
import { ProgramsModule } from '../programs/programs.module';
import { StorageModule } from '../storage/storage.module';
import { CalendarService } from './calendar.service';
import { DayClockService } from './day-clock.service';
import { DaySessionsService } from './day-sessions.service';
import { DaySession } from './entities/day-session.entity';
import { ExerciseAttemptLog } from './entities/exercise-attempt-log.entity';
import { ExerciseRecord } from './entities/exercise-record.entity';
import { ExerciseCompletionService } from './exercise-completion.service';
import { StatsService } from './stats.service';
import { WorkoutsController } from './workouts.controller';
import { WorkoutsService } from './workouts.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([DaySession, ExerciseRecord, ExerciseAttemptLog, Family]),
    ExercisesModule,
    FamilyContextModule,
    LedgerModule,
    StorageModule,
    ProgramsModule,
    AiModule,
  ],
  controllers: [WorkoutsController],
  providers: [
    WorkoutsService,
    DaySessionsService,
    ExerciseCompletionService,
    StatsService,
    CalendarService,
    DayClockService,
  ],
  exports: [DaySessionsService, StatsService, DayClockService],
})
export class WorkoutsModule {}
