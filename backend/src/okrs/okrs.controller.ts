import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, Req, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OkrsService } from './okrs.service';
import {
  CreateObjectiveDto, UpdateObjectiveDto,
  CreateKeyResultDto, UpdateKeyResultDto,
  LinkTasksDto,
} from './dto/okr.dto';

@ApiTags('okrs')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('okrs')
export class OkrsController {
  constructor(private readonly svc: OkrsService) {}

  // ── Objectives ─────────────────────────────────────────────────────────────

  @Get()
  list(@Req() req: any) {
    return this.svc.listObjectives(req.user.companyId);
  }

  @Get('summary')
  summary(@Req() req: any) {
    return this.svc.summary(req.user.companyId);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.svc.getObjective(id);
  }

  @Post()
  create(@Req() req: any, @Body() dto: CreateObjectiveDto) {
    return this.svc.createObjective(req.user.companyId, req.user.userId, dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateObjectiveDto) {
    return this.svc.updateObjective(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.svc.deleteObjective(id);
  }

  // ── Key Results ────────────────────────────────────────────────────────────

  @Post(':objectiveId/key-results')
  createKR(@Param('objectiveId') objectiveId: string, @Body() dto: CreateKeyResultDto) {
    return this.svc.createKeyResult(objectiveId, dto);
  }

  @Patch('key-results/:id')
  updateKR(@Param('id') id: string, @Body() dto: UpdateKeyResultDto) {
    return this.svc.updateKeyResult(id, dto);
  }

  @Delete('key-results/:id')
  deleteKR(@Param('id') id: string) {
    return this.svc.deleteKeyResult(id);
  }

  // ── Tasks ──────────────────────────────────────────────────────────────────

  @Post('key-results/:id/tasks')
  linkTasks(@Param('id') id: string, @Body() dto: LinkTasksDto) {
    return this.svc.linkTasks(id, dto.taskIds);
  }

  @Delete('key-results/:id/tasks/:taskId')
  unlinkTask(@Param('id') id: string, @Param('taskId') taskId: string) {
    return this.svc.unlinkTask(id, taskId);
  }
}
