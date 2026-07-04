import {
  Controller, Get, Post, Patch,
  Body, Param, UseGuards, Request,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApprovalsService, RequestApprovalDto, ReviewApprovalDto } from './approvals.service';

@ApiTags('approvals')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('approvals')
export class ApprovalsController {
  constructor(private readonly svc: ApprovalsService) {}

  // ── Mine ──────────────────────────────────────────────────────────────────

  @Get('pending')
  myPending(@Request() req: any) {
    return this.svc.getMyPending(req.user.id);
  }

  @Get('requested')
  myRequested(@Request() req: any) {
    return this.svc.getMyRequested(req.user.id);
  }

  // ── Per task ──────────────────────────────────────────────────────────────

  @Get('task/:taskId')
  forTask(@Param('taskId') taskId: string) {
    return this.svc.getForTask(taskId);
  }

  @Post('request')
  request(@Request() req: any, @Body() dto: RequestApprovalDto) {
    return this.svc.request(req.user.id, dto);
  }

  // ── Review / Cancel ───────────────────────────────────────────────────────

  @Patch(':id/review')
  review(
    @Param('id') id: string,
    @Request() req: any,
    @Body() dto: ReviewApprovalDto,
  ) {
    return this.svc.review(id, req.user.id, dto);
  }

  @Patch(':id/cancel')
  cancel(@Param('id') id: string, @Request() req: any) {
    return this.svc.cancel(id, req.user.id);
  }
}
