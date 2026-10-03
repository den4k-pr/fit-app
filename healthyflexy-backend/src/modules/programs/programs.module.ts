import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Exercise } from '../exercises/entities/exercise.entity';
import { Family } from '../families/entities/family.entity';
import { FamilyContextModule } from '../families/family-context.module';
import { DaySession } from '../workouts/entities/day-session.entity';
import { ProgramExercise } from './entities/program-exercise.entity';
import { Program } from './entities/program.entity';
import { UserProgramAssignment } from './entities/user-program-assignment.entity';
import { ProgramsController } from './programs.controller';
import { ProgramsSeeder } from './programs.seeder';
import { ProgramsService } from './programs.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Program,
      ProgramExercise,
      UserProgramAssignment,
      Exercise,
      Family,
      DaySession,
    ]),
    FamilyContextModule,
  ],
  controllers: [ProgramsController],
  providers: [ProgramsService, ProgramsSeeder],
  exports: [ProgramsService],
})
export class ProgramsModule {}
