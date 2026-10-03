import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from './env.validation';

/** Типізований ConfigService: `config.get('PORT', { infer: true })` → number */
export type AppConfigService = ConfigService<EnvironmentVariables, true>;
