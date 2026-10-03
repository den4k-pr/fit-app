import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { withAdvisoryLock } from '../../common/utils/advisory-lock.util';
import { OtpService } from '../auth/otp.service';
import { TokenService } from '../auth/token.service';
import { StorageService } from '../storage/storage.service';
import { ExerciseRecord } from '../workouts/entities/exercise-record.entity';

const LOCK_KEY = 71002;
const BATCH = 200;

/**
 * Щодня 03:00 UTC: видалити зі сховища кадри, чий строк (7 днів) минув, і виставити `photos_deleted_at`.
 * Запис вправи лишається (дитина бачить «Фото видалено»). Заодно чистимо прострочені OTP і refresh-токени.
 * Якщо сховище — S3/R2, ту саму політику можна продублювати lifecycle-правилом бакета.
 */
@Injectable()
export class PurgePhotosTask {
  private readonly logger = new Logger(PurgePhotosTask.name);

  constructor(
    @InjectRepository(ExerciseRecord) private readonly records: Repository<ExerciseRecord>,
    private readonly dataSource: DataSource,
    private readonly storage: StorageService,
    private readonly otp: OtpService,
    private readonly tokens: TokenService,
  ) {}

  @Cron('0 3 * * *', { timeZone: 'UTC' })
  async run(now: Date = new Date()): Promise<{ records: number }> {
    let purged = 0;
    await withAdvisoryLock(this.dataSource, LOCK_KEY, async () => {
      for (;;) {
        const batch = await this.records
          .createQueryBuilder('r')
          .where(
            'r.photosDeletedAt IS NULL AND cardinality(r.photo_keys) > 0 AND r.photosExpiresAt < :now',
            { now },
          )
          .orderBy('r.photosExpiresAt', 'ASC')
          .limit(BATCH)
          .getMany();
        if (batch.length === 0) break;

        for (const record of batch) {
          try {
            await this.storage.deleteKeys(record.photoKeys);
            await this.records.update({ id: record.id }, { photosDeletedAt: now });
            purged += 1;
          } catch (error) {
            // не виставляємо photos_deleted_at: наступного разу спробуємо ще раз
            this.logger.error({
              event: 'photo_purge_failed',
              recordId: record.id,
              reason: String(error),
            });
            return;
          }
        }
      }
      const [otpRemoved, tokensRemoved] = await Promise.all([
        this.otp.purgeExpired(),
        this.tokens.purgeExpired(),
      ]);
      this.logger.log({ event: 'purge', records: purged, otpRemoved, tokensRemoved });
    });
    return { records: purged };
  }
}
