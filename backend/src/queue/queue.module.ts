import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { MailProcessor } from './processors/mail.processor';
import { MailModule } from '../mail/mail.module';
import { QUEUE_MAIL } from './queue.constants';

export { QUEUE_MAIL } from './queue.constants';

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
    BullModule.registerQueue({ name: QUEUE_MAIL }),
    MailModule,
  ],
  providers: [MailProcessor],
  exports: [BullModule],
})
export class QueueModule {}
