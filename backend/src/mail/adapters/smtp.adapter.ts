import { Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { MailAdapter, SendMailOptions } from '../mail-adapter.interface';

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
  defaultFrom: string;
}

export class SmtpAdapter implements MailAdapter {
  private readonly transporter: nodemailer.Transporter;
  private readonly logger = new Logger(SmtpAdapter.name);
  private readonly defaultFrom: string;

  constructor(config: SmtpConfig) {
    this.defaultFrom = config.defaultFrom;
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      ...(config.user ? { auth: { user: config.user, pass: config.pass } } : {}),
    });
  }

  async send(options: SendMailOptions): Promise<void> {
    await this.transporter.sendMail({
      from: options.from ?? this.defaultFrom,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      html: options.html,
    });
  }
}
