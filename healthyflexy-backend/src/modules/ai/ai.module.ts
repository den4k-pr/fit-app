import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AI_PROVIDER } from '../../common/constants';
import { AiProviderName, EnvironmentVariables } from '../../config';
import { AiService } from './ai.service';
import { OpenAiVisionProvider } from './providers/openai-vision.provider';
import { StubAiProvider } from './providers/stub-ai.provider';

@Module({
  providers: [
    StubAiProvider,
    OpenAiVisionProvider,
    {
      provide: AI_PROVIDER,
      inject: [ConfigService, StubAiProvider, OpenAiVisionProvider],
      useFactory: (
        config: ConfigService<EnvironmentVariables, true>,
        stubProvider: StubAiProvider,
        openAiProvider: OpenAiVisionProvider,
      ) =>
        config.get('AI_PROVIDER', { infer: true }) === AiProviderName.OPENAI
          ? openAiProvider
          : stubProvider,
    },
    AiService,
  ],
  exports: [AiService],
})
export class AiModule {}
