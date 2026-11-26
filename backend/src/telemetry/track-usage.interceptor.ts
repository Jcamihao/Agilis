import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import { TRACK_EVENT_KEY } from './track-usage.decorator';
import { TelemetryService } from './telemetry.service';

/** Emite o evento do @TrackUsage depois que o handler conclui sem erro. */
@Injectable()
export class TrackUsageInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly telemetry: TelemetryService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const event = this.reflector.getAllAndOverride<string>(TRACK_EVENT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!event) return next.handle();

    const req = context.switchToHttp().getRequest();
    return next.handle().pipe(
      tap(() =>
        this.telemetry.track(event, {
          companyId: req.user?.companyId,
          userId: req.user?.userId,
        }),
      ),
    );
  }
}
