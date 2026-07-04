import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, UseGuards, Request,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IntakeService, CreateFormDto, UpdateFormDto, SubmitFormDto } from './intake.service';
import { IntakeSubmissionStatus } from '@prisma/client';

// ── Authenticated routes ───────────────────────────────────────────────────────
@ApiTags('intake')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('projects/:projectId/intake-forms')
export class IntakeFormsController {
  constructor(private readonly svc: IntakeService) {}

  @Get()
  list(@Param('projectId') projectId: string) {
    return this.svc.listByProject(projectId);
  }

  @Post()
  create(@Param('projectId') projectId: string, @Request() req: any, @Body() dto: CreateFormDto) {
    return this.svc.createForm(projectId, req.user.id, dto);
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.svc.getForm(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateFormDto) {
    return this.svc.updateForm(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.svc.deleteForm(id);
  }

  @Get(':id/submissions')
  submissions(@Param('id') id: string) {
    return this.svc.listSubmissions(id);
  }

  @Patch('submissions/:subId/status')
  updateStatus(
    @Param('subId') subId: string,
    @Body('status') status: IntakeSubmissionStatus,
  ) {
    return this.svc.updateSubmissionStatus(subId, status);
  }
}

// ── Public routes (no auth) ────────────────────────────────────────────────────
@ApiTags('intake-public')
@Controller('public/intake')
export class IntakePublicController {
  constructor(private readonly svc: IntakeService) {}

  @Get(':slug')
  getForm(@Param('slug') slug: string) {
    return this.svc.getPublicForm(slug);
  }

  @Post(':slug/submit')
  submit(@Param('slug') slug: string, @Body() dto: SubmitFormDto) {
    return this.svc.submit(slug, dto);
  }
}
