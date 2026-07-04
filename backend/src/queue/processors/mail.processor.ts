import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { MAIL_ADAPTER, MailAdapter, SendMailOptions } from '../../mail/mail-adapter.interface';
import { QUEUE_MAIL } from '../queue.constants';

@Processor(QUEUE_MAIL)
export class MailProcessor extends WorkerHost {
  private readonly logger = new Logger(MailProcessor.name);

  constructor(@Inject(MAIL_ADAPTER) private readonly adapter: MailAdapter) {
    super();
  }

  async process(job: Job<SendMailOptions>): Promise<void> {
    this.logger.debug(`Sending email to ${job.data.to}`);
    await this.adapter.send(job.data);
  }
}
