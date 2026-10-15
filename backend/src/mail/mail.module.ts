import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { MailService } from './mail.service';
import { MAIL_ADAPTER } from './mail-adapter.interface';
import { ResendAdapter } from './adapters/resend.adapter';
import { NoopMailAdapter } from './adapters/noop.adapter';
import { QUEUE_MAIL } from '../queue/queue.constants';
@Module({
  imports: [BullModule.registerQueue({ name: QUEUE_MAIL })],
  providers: [
    {
      provide: MAIL_ADAPTER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const defaultFrom = config.get<string>('MAIL_FROM', 'Agilis <noreply@agilis.app>');

        const resendKey = config.get<string>('RESEND_API_KEY', '');
        if (!resendKey) return new NoopMailAdapter();
        return new ResendAdapter(resendKey, defaultFrom);
      },
    },
    MailService,
  ],
  exports: [MailService, MAIL_ADAPTER],
})
export class MailModule {}
