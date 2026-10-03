import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { AppConfigService, AppConfigView } from './app-config.service';

/** GET /app-config — публічно: палітра, тексти екранів і ліміти з CRM (мобільний застосунок тягне при старті) */
@ApiTags('app-config')
@Controller('app-config')
export class AppConfigController {
  constructor(private readonly config: AppConfigService) {}

  @Public()
  @Get()
  get(): Promise<AppConfigView> {
    return this.config.get();
  }
}
