import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { MailProcessor } from './processors/mail.processor';
import { WebhookProcessor } from './processors/webhook.processor';

export const QUEUE_MAIL    = 'mail';
export const QUEUE_WEBHOOK = 'webhook';

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
        },
      }),
    }),
    BullModule.registerQueue(
      { name: QUEUE_MAIL },
      { name: QUEUE_WEBHOOK },
    ),
  ],
  providers: [MailProcessor, WebhookProcessor],
  exports: [BullModule],
})
export class QueueModule {}
