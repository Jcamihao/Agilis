import {
  Controller, Get, Patch, Post,
  Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ClientPortalService, UpdatePortalDto } from './client-portal.service';

// ── Authenticated (project-scoped) ────────────────────────────────────────────
@ApiTags('client-portal')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('projects/:projectId/portal')
export class ClientPortalController {
  constructor(private readonly svc: ClientPortalService) {}

  @Get()
  get(@Param('projectId') projectId: string) {
    return this.svc.getOrCreate(projectId);
  }

  @Patch()
  update(@Param('projectId') projectId: string, @Body() dto: UpdatePortalDto) {
    return this.svc.update(projectId, dto);
  }

  @Post('regenerate-token')
  regenerate(@Param('projectId') projectId: string) {
    return this.svc.regenerateToken(projectId);
  }
}

// ── Public portal ─────────────────────────────────────────────────────────────
@ApiTags('portal-public')
@Controller('public/portal')
export class ClientPortalPublicController {
  constructor(private readonly svc: ClientPortalService) {}

  @Get(':token')
  view(@Param('token') token: string, @Query('password') password?: string) {
    return this.svc.getPublicPortal(token, password);
  }
}
