import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Exercise } from '../exercises/entities/exercise.entity';
import { ProgramExercise } from '../programs/entities/program-exercise.entity';
import { Program } from '../programs/entities/program.entity';
import { User } from '../users/entities/user.entity';
import { UsersModule } from '../users/users.module';
import { AdminAnalyticsService } from './admin-analytics.service';
import { AdminAuthService } from './admin-auth.service';
import { AdminCatalogService } from './admin-catalog.service';
import { AdminUsersService } from './admin-users.service';
import { AdminGuard } from './admin.guard';
import {
  AdminAnalyticsController,
  AdminAppConfigController,
  AdminAuthController,
  AdminExercisesController,
  AdminProgramsController,
  AdminUsersController,
} from './admin.controllers';

/** CRM: окремий адмін-вхід (ENV) і керування користувачами, довідником, пресетами, налаштуваннями застосунку */
@Module({
  imports: [TypeOrmModule.forFeature([User, Exercise, Program, ProgramExercise]), UsersModule],
  controllers: [
    AdminAuthController,
    AdminAnalyticsController,
    AdminUsersController,
    AdminExercisesController,
    AdminProgramsController,
    AdminAppConfigController,
  ],
  providers: [
    AdminAuthService,
    AdminGuard,
    AdminUsersService,
    AdminAnalyticsService,
    AdminCatalogService,
  ],
})
export class AdminModule {}
