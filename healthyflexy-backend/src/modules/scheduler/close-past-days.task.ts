import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { withAdvisoryLock } from '../../common/utils/advisory-lock.util';
import { DaySessionsService } from '../workouts/day-sessions.service';

const LOCK_KEY = 71001;

/** Щогодини: закрити пропущені дні всіх сімей (ТЗ §8.3). Ідемпотентно; advisory-lock захищає від паралельних реплік. */
@Injectable()
export class ClosePastDaysTask {
  private readonly logger = new Logger(ClosePastDaysTask.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly sessions: DaySessionsService,
  ) {}

  @Cron('5 * * * *')
  async run(): Promise<void> {
    const ran = await withAdvisoryLock(this.dataSource, LOCK_KEY, async () => {
      await this.sessions.closePastDays();
    });
    if (!ran) this.logger.debug('close-past-days skipped: another instance holds the lock');
  }
}
