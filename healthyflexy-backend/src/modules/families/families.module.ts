import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Exercise } from '../exercises/entities/exercise.entity';
import { ProgramsModule } from '../programs/programs.module';
import { UsersModule } from '../users/users.module';
import { DaySession } from '../workouts/entities/day-session.entity';
import { WorkoutsModule } from '../workouts/workouts.module';
import { Family } from './entities/family.entity';
import { Invite } from './entities/invite.entity';
import { FamiliesController } from './families.controller';
import { FamiliesService } from './families.service';
import { FamilyContextModule } from './family-context.module';
import { InvitesService } from './invites.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Family, Invite, DaySession, Exercise]),
    FamilyContextModule,
    WorkoutsModule,
    ProgramsModule,
    UsersModule,
  ],
  controllers: [FamiliesController],
  providers: [FamiliesService, InvitesService],
  exports: [FamiliesService],
})
export class FamiliesModule {}
