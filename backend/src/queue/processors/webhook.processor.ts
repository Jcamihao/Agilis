import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';
import * as https from 'https';
import * as http from 'http';
import { QUEUE_WEBHOOK } from '../queue.constants';

export interface WebhookJobData {
  webhookId: string;
  url: string;
  secret: string;
  event: string;
  payload: Record<string, unknown>;
}

@Processor(QUEUE_WEBHOOK)
export class WebhookProcessor extends WorkerHost {
  private readonly logger = new Logger(WebhookProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<WebhookJobData>): Promise<void> {
    const { webhookId, url, secret, event, payload } = job.data;
    this.logger.debug(`Delivering webhook ${webhookId} → ${url}`);

    const body = JSON.stringify(payload);
    const signature = crypto.createHmac('sha256', secret).update(body).digest('hex');
    const start = Date.now();

    try {
      const result = await this.httpPost(url, body, signature, event);
      const durationMs = Date.now() - start;
      const success = result.statusCode >= 200 && result.statusCode < 300;

      await this.prisma.webhookDelivery.create({
        data: { webhookId, event, payload: payload as any, statusCode: result.statusCode, success, durationMs, error: result.error },
      });

      if (!success) {
        this.logger.warn(`Webhook delivery failed: status=${result.statusCode}`);
        throw new Error(`HTTP ${result.statusCode}`);
      }
    } catch (err: any) {
      const durationMs = Date.now() - start;
      await this.prisma.webhookDelivery.create({
        data: { webhookId, event, payload: payload as any, success: false, durationMs, error: err.message },
      }).catch(() => {});
      throw err;
    }
  }

  private httpPost(url: string, body: string, signature: string, event: string): Promise<{ statusCode: number; error?: string }> {
    return new Promise((resolve) => {
      const parsed = new URL(url);
      const isHttps = parsed.protocol === 'https:';
      const lib = isHttps ? https : http;
      const options = {
        hostname: parsed.hostname,
        port: parsed.port || (isHttps ? 443 : 80),
        path: parsed.pathname + parsed.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          'X-Agilis-Signature': `sha256=${signature}`,
          'X-Agilis-Event': event,
          'User-Agent': 'Agilis-Webhooks/1.0',
        },
        timeout: 10000,
      };
      const req = lib.request(options, (res) => resolve({ statusCode: res.statusCode ?? 0 }));
      req.on('timeout', () => { req.destroy(); resolve({ statusCode: 0, error: 'Timeout' }); });
      req.on('error', (err) => resolve({ statusCode: 0, error: err.message }));
      req.write(body);
      req.end();
    });
  }
}
