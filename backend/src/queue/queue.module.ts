import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { MailProcessor } from './processors/mail.processor';
import { WebhookProcessor } from './processors/webhook.processor';
import { MailModule } from '../mail/mail.module';
import { QUEUE_MAIL, QUEUE_WEBHOOK } from './queue.constants';

export { QUEUE_MAIL, QUEUE_WEBHOOK } from './queue.constants';

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
    MailModule,
  ],
  providers: [MailProcessor, WebhookProcessor],
  exports: [BullModule],
})
export class QueueModule {}
