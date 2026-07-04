import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CustomFieldsService, CreateFieldDto, UpdateFieldDto } from './custom-fields.service';

@ApiTags('custom-fields')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller()
export class CustomFieldsController {
  constructor(private readonly svc: CustomFieldsService) {}

  // ── Field definitions (project-scoped) ────────────────────────────────────

  @Get('projects/:projectId/custom-fields')
  list(@Param('projectId') projectId: string) {
    return this.svc.listByProject(projectId);
  }

  @Post('projects/:projectId/custom-fields')
  create(@Param('projectId') projectId: string, @Body() dto: CreateFieldDto) {
    return this.svc.createField(projectId, dto);
  }

  @Patch('projects/:projectId/custom-fields/reorder')
  reorder(@Param('projectId') projectId: string, @Body('orderedIds') orderedIds: string[]) {
    return this.svc.reorder(projectId, orderedIds);
  }

  @Patch('custom-fields/:id')
  update(@Param('id') id: string, @Body() dto: UpdateFieldDto) {
    return this.svc.updateField(id, dto);
  }

  @Delete('custom-fields/:id')
  remove(@Param('id') id: string) {
    return this.svc.deleteField(id);
  }

  // ── Values (task-scoped) ──────────────────────────────────────────────────

  @Get('tasks/:taskId/custom-fields')
  getValues(@Param('taskId') taskId: string) {
    return this.svc.getTaskValues(taskId);
  }

  @Post('tasks/:taskId/custom-fields')
  setValues(
    @Param('taskId') taskId: string,
    @Body() body: { values: { customFieldId: string; value: string | null }[] },
  ) {
    return this.svc.setValues(taskId, body.values);
  }

  @Patch('tasks/:taskId/custom-fields/:fieldId')
  setValue(
    @Param('taskId') taskId: string,
    @Param('fieldId') fieldId: string,
    @Body('value') value: string | null,
  ) {
    return this.svc.setValue(taskId, fieldId, value);
  }
}
