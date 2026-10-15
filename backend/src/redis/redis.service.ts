import { Inject, Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';

@Injectable()
export class RedisService {
  private readonly logger = new Logger(RedisService.name);

  constructor(@Inject(REDIS_CLIENT) private readonly client: Redis) {}

  // ── Cache ─────────────────────────────────────────────────────────────────

  async get<T>(key: string): Promise<T | null> {
    try {
      const val = await this.client.get(key);
      return val ? (JSON.parse(val) as T) : null;
    } catch {
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds) {
        await this.client.setex(key, ttlSeconds, serialized);
      } else {
        await this.client.set(key, serialized);
      }
    } catch (err: any) {
      this.logger.warn(`Redis set failed for key "${key}": ${err.message}`);
    }
  }

  async del(...keys: string[]): Promise<void> {
    try {
      if (keys.length) await this.client.del(...keys);
    } catch {}
  }

  // ── JWT Blacklist ─────────────────────────────────────────────────────────

  async blacklistToken(jti: string, ttlSeconds: number): Promise<void> {
    await this.client.setex(`blacklist:${jti}`, ttlSeconds, '1');
  }

  async isBlacklisted(jti: string): Promise<boolean> {
    try {
      return (await this.client.exists(`blacklist:${jti}`)) === 1;
    } catch {
      return false;
    }
  }

}
