import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { StartupDiagnostics } from './common/diagnostics/startup-diagnostics.service';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { EnvironmentVariables, NodeEnv, validateEnv } from './config';
import { DatabaseModule } from './database/database.module';
import { ActivityModule } from './modules/activity/activity.module';
import { AdminModule } from './modules/admin/admin.module';
import { AiModule } from './modules/ai/ai.module';
import { AppConfigModule } from './modules/app-config/app-config.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from './modules/auth/guards/roles.guard';
import { ExercisesModule } from './modules/exercises/exercises.module';
import { FamiliesModule } from './modules/families/families.module';
import { HealthModule } from './modules/health/health.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { LedgerModule } from './modules/ledger/ledger.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ProgramsModule } from './modules/programs/programs.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { SchedulerModule } from './modules/scheduler/scheduler.module';
import { SmsModule } from './modules/sms/sms.module';
import { StorageModule } from './modules/storage/storage.module';
import { UsersModule } from './modules/users/users.module';
import { WorkoutsModule } from './modules/workouts/workouts.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true, validate: validateEnv }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvironmentVariables, true>) => ({
        throttlers: [
          {
            ttl: config.get('THROTTLE_TTL_MS', { infer: true }),
            limit: config.get('THROTTLE_LIMIT', { infer: true }),
          },
        ],
        // у e2e-тестах ліміти вимкнені: сценарій робить десятки запитів OTP підряд
        skipIf: () => config.get('NODE_ENV', { infer: true }) === NodeEnv.TEST,
      }),
    }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    DatabaseModule,

    // Інфраструктурні модулі
    StorageModule,
    SmsModule,
    AiModule,
    NotificationsModule,
    RealtimeModule,
    AuditModule,
    AppConfigModule,

    // Доменні модулі
    AuthModule,
    UsersModule,
    FamiliesModule,
    ExercisesModule,
    ProgramsModule,
    WorkoutsModule,
    LedgerModule,
    PaymentsModule,
    SubscriptionsModule,
    ActivityModule,
    SchedulerModule,
    HealthModule,
    AdminModule,
  ],
  providers: [
    // Порядок важливий: throttle → автентифікація → ролі
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    StartupDiagnostics,
  ],
})
export class AppModule {}
