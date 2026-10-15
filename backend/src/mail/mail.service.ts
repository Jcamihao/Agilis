import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { SendMailOptions } from './mail-adapter.interface';
import { QUEUE_MAIL } from '../queue/queue.constants';

@Injectable()
export class MailService {
  constructor(@InjectQueue(QUEUE_MAIL) private readonly queue: Queue) {}

  async send(options: SendMailOptions): Promise<void> {
    await this.queue.add('send', options, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: 100,
      removeOnFail: 50,
    });
  }
}
