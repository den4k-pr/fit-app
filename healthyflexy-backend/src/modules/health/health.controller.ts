import { Controller, Get } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { ApiTags } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { Public } from '../auth/decorators/public.decorator';

/** GET /health (поза глобальним префіксом): Railway healthcheck. Перевіряє з'єднання з БД. */
@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  @Public()
  @Get()
  async check(): Promise<{ status: 'ok'; uptimeSeconds: number }> {
    await this.dataSource.query('SELECT 1');
    return { status: 'ok', uptimeSeconds: Math.round(process.uptime()) };
  }
}
