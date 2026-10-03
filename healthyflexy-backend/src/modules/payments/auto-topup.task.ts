import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PaymentsService } from './payments.service';

/** Автопоповнення фонду: кожні 15 хвилин списує ті, яким настав час (ідемпотентно — ключ на кожен запуск) */
@Injectable()
export class AutoTopupTask {
  private readonly logger = new Logger(AutoTopupTask.name);
  private running = false;

  constructor(private readonly payments: PaymentsService) {}

  @Cron('*/15 * * * *')
  async run(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await this.payments.runDueAutoTopups();
    } catch (error) {
      this.logger.error({ event: 'auto_topup_task_failed', reason: String(error) });
    } finally {
      this.running = false;
    }
  }
}
