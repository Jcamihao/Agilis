import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { HrService } from './hr.service';

@Controller('hr')
@UseGuards(JwtAuthGuard)
export class HrController {
  constructor(private readonly svc: HrService) {}

  // ── Profiles / Diretório
  @Get(':companyId/profiles')
  listProfiles(@Param('companyId') companyId: string) {
    return this.svc.listProfiles(companyId);
  }

  @Patch(':companyId/profiles/:userId')
  upsertProfile(
    @Param('companyId') companyId: string,
    @Param('userId') userId: string,
    @Body() dto: any,
  ) {
    return this.svc.upsertProfile(userId, companyId, dto);
  }

  // ── Organograma
  @Get(':companyId/org-chart')
  orgChart(@Param('companyId') companyId: string) {
    return this.svc.orgChart(companyId);
  }

  // ── Aniversários
  @Get(':companyId/birthdays')
  birthdays(@Param('companyId') companyId: string) {
    return this.svc.birthdays(companyId);
  }

  // ── Férias / Ausências
  @Get(':companyId/leave')
  listLeave(@Param('companyId') companyId: string, @Query('userId') userId?: string) {
    return this.svc.listLeave(companyId, userId);
  }

  @Post(':companyId/leave')
  createLeave(@Param('companyId') companyId: string, @Req() req: any, @Body() dto: any) {
    return this.svc.createLeave(companyId, req.user.id, dto);
  }

  @Patch('leave/:id/review')
  reviewLeave(@Param('id') id: string, @Req() req: any, @Body() dto: { approve: boolean }) {
    return this.svc.reviewLeave(id, req.user.id, dto.approve);
  }

  @Patch('leave/:id/cancel')
  cancelLeave(@Param('id') id: string) {
    return this.svc.cancelLeave(id);
  }

  // ── Ponto eletrônico
  @Post(':companyId/time-records')
  clockIn(@Param('companyId') companyId: string, @Req() req: any, @Body() dto: { type: string; note?: string }) {
    return this.svc.clockIn(companyId, req.user.id, dto.type, dto.note);
  }

  @Get(':companyId/time-records/me')
  myRecords(@Param('companyId') companyId: string, @Req() req: any, @Query('date') date?: string) {
    return this.svc.listTimeRecords(companyId, req.user.id, date);
  }

  @Get(':companyId/time-records/all')
  allRecords(@Param('companyId') companyId: string, @Query('date') date?: string) {
    return this.svc.listAllTimeRecords(companyId, date);
  }
}
