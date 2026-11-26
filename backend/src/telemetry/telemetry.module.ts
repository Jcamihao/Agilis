import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from '../prisma/prisma.module';
import { TelemetryService } from './telemetry.service';
import { TelemetryController } from './telemetry.controller';
import { TrackUsageInterceptor } from './track-usage.interceptor';

@Module({
  imports: [PrismaModule],
  controllers: [TelemetryController],
  providers: [
    TelemetryService,
    TrackUsageInterceptor,
    { provide: APP_INTERCEPTOR, useExisting: TrackUsageInterceptor },
  ],
  exports: [TelemetryService],
})
export class TelemetryModule {}
