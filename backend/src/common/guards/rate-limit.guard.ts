import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import {
  RATE_LIMIT_KEY,
  RateLimitOptions,
} from '../decorators/rate-limit.decorator';

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, RateLimitBucket>();

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const options = this.reflector.getAllAndOverride<RateLimitOptions>(
      RATE_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!options) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const key = this.buildKey(request);
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, {
        count: 1,
        resetAt: now + options.windowMs,
      });
      return true;
    }

    if (bucket.count >= options.limit) {
      throw new HttpException(
        'Muitas tentativas em pouco tempo. Aguarde antes de tentar novamente.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    bucket.count += 1;
    return true;
  }

  private buildKey(request: Request): string {
    const route = `${request.method}:${request.route?.path ?? request.url}`;
    const ip =
      request.ip ??
      request.socket.remoteAddress ??
      request.headers['x-forwarded-for'] ??
      'unknown';

    return `${route}:${String(ip)}`;
  }
}
