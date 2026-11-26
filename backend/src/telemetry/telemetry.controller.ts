import {
  Body, Controller, DefaultValuePipe, Get, ParseIntPipe, Post, Query, Req, ServiceUnavailableException, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TelemetryService } from './telemetry.service';

/** Nomes que o front pode reportar como evento (evita poluição por clients maliciosos). */
const CLIENT_EVENTS = new Set(['onboarding.sample_created']);

@ApiTags('telemetry')
@ApiBearerAuth()
@Controller('telemetry')
export class TelemetryController {
  constructor(private readonly telemetry: TelemetryService) {}

  @Get('health')
  @Public()
  @ApiOperation({ summary: 'Health check para uptime (Kuma). 200 = API e banco respondendo.' })
  async health() {
    if (!(await this.telemetry.dbOk())) throw new ServiceUnavailableException('db down');
    return { ok: true, uptime: Math.round(process.uptime()) };
  }

  @Post('client-error')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Front-end reporta erro capturado pelo ErrorHandler (rate-limited)' })
  clientError(
    @Body() body: { message?: string; stack?: string; url?: string },
    @Req() req: Request,
    @CurrentUser('companyId') companyId: string,
  ) {
    this.telemetry.logError({
      source: 'CLIENT',
      message: body?.message ?? 'client error sem mensagem',
      stack: body?.stack,
      path: body?.url?.slice(0, 500),
      userAgent: req.headers['user-agent'],
      companyId,
    });
    return { ok: true };
  }

  @Post('event')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Evento de produto vindo do front (somente a allowlist)' })
  event(@Body() body: { event?: string }, @CurrentUser() user: { userId: string; companyId: string }) {
    if (typeof body?.event === 'string' && CLIENT_EVENTS.has(body.event)) {
      this.telemetry.track(body.event, { companyId: user.companyId, userId: user.userId });
    }
    return { ok: true };
  }

  @Get('errors')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Erros agrupados dos últimos N dias (admin)' })
  async errors(
    @CurrentUser('userId') userId: string,
    @CurrentUser('companyId') companyId: string,
    @Query('days', new DefaultValuePipe(7), ParseIntPipe) days: number,
  ) {
    await this.telemetry.requireAdmin(companyId, userId);
    return this.telemetry.recentErrorsList(Math.min(30, Math.max(1, days)), 40);
  }

  @Get('usage')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Uso por evento/módulo nos últimos N dias + IA (admin)' })
  async usage(
    @CurrentUser('userId') userId: string,
    @CurrentUser('companyId') companyId: string,
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    await this.telemetry.requireAdmin(companyId, userId);
    return this.telemetry.usageSummary(companyId, Math.min(90, Math.max(1, days)));
  }
}
