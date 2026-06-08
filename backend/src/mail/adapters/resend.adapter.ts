import { Logger } from '@nestjs/common';
import { Resend } from 'resend';
import { MailAdapter, SendMailOptions } from '../mail-adapter.interface';

export class ResendAdapter implements MailAdapter {
  private readonly client: Resend;
  private readonly logger = new Logger(ResendAdapter.name);
  private readonly defaultFrom: string;

  constructor(apiKey: string, defaultFrom: string) {
    this.client = new Resend(apiKey);
    this.defaultFrom = defaultFrom;
  }

  async send(options: SendMailOptions): Promise<void> {
    const { error } = await this.client.emails.send({
      from: options.from ?? this.defaultFrom,
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      html: options.html,
    });
    if (error) {
      this.logger.error(`Resend error: ${JSON.stringify(error)}`);
      throw new Error(error.message);
    }
  }
}
