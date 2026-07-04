import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { MailService } from './mail.service';
import { MAIL_ADAPTER } from './mail-adapter.interface';
import { ResendAdapter } from './adapters/resend.adapter';
import { SmtpAdapter } from './adapters/smtp.adapter';
import { NoopMailAdapter } from './adapters/noop.adapter';
import { QUEUE_MAIL } from '../queue/queue.constants';
@Module({
  imports: [BullModule.registerQueue({ name: QUEUE_MAIL })],
  providers: [
    {
      provide: MAIL_ADAPTER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const provider    = config.get<string>('MAIL_PROVIDER', 'resend');
        const defaultFrom = config.get<string>('MAIL_FROM', 'Agilis <noreply@agilis.app>');

        if (provider === 'smtp') {
          return new SmtpAdapter({
            host:        config.get<string>('SMTP_HOST', 'localhost'),
            port:        parseInt(config.get<string>('SMTP_PORT', '587')),
            secure:      config.get<string>('SMTP_SECURE', 'false') === 'true',
            user:        config.get<string>('SMTP_USER'),
            pass:        config.get<string>('SMTP_PASS'),
            defaultFrom,
          });
        }

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
