import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { MAIL_ADAPTER, MailAdapter, SendMailOptions } from './mail-adapter.interface';
import { QUEUE_MAIL } from '../queue/queue.module';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    @Inject(MAIL_ADAPTER) private readonly adapter: MailAdapter,
    @InjectQueue(QUEUE_MAIL) private readonly queue: Queue,
  ) {}

  async send(options: SendMailOptions): Promise<void> {
    await this.queue.add('send', options, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: 100,
      removeOnFail: 50,
    });
  }

  async sendImmediate(options: SendMailOptions): Promise<void> {
    try {
      await this.adapter.send(options);
    } catch (err: any) {
      this.logger.error(`Failed to send email to ${options.to}: ${err.message}`);
      throw err;
    }
  }

  async sendTaskAlert(to: string, taskTitle: string, message: string): Promise<void> {
    await this.send({
      to,
      subject: `Agilis — ${taskTitle}`,
      html: `<p>${message}</p><br><small>Enviado pelo Agilis</small>`,
    });
  }
}
