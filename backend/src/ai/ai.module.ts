import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { SelahAiClientService } from './selah-ai-client.service';

@Module({
  controllers: [AiController],
  providers: [AiService, SelahAiClientService],
  exports: [AiService, SelahAiClientService],
})
export class AiModule {}
