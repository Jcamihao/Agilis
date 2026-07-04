import { Logger } from '@nestjs/common';
import { MailAdapter, SendMailOptions } from '../mail-adapter.interface';

export class NoopMailAdapter implements MailAdapter {
  private readonly logger = new Logger('NoopMailAdapter');

  async send(options: SendMailOptions): Promise<void> {
    this.logger.warn(`[NOOP] Email not sent — no mail provider configured. To: ${options.to} | Subject: ${options.subject}`);
  }
}
