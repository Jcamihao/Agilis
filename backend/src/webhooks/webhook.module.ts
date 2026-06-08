import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { QUEUE_WEBHOOK } from '../queue/queue.module';

@Module({
  imports: [BullModule.registerQueue({ name: QUEUE_WEBHOOK })],
  controllers: [WebhookController],
  providers: [WebhookService],
  exports: [WebhookService],
})
export class WebhookModule {}
