import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LabelsService } from './labels.service';

@UseGuards(JwtAuthGuard)
@Controller('labels')
export class LabelsController {
  constructor(private readonly svc: LabelsService) {}

  @Get()
  list(@Query('companyId') companyId: string) {
    return this.svc.list(companyId);
  }

  @Post()
  create(@Body() dto: { companyId: string; name: string; color?: string }) {
    return this.svc.create(dto.companyId, dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: { name?: string; color?: string }) {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.svc.delete(id);
  }

  @Get('task/:taskId')
  forTask(@Param('taskId') taskId: string) {
    return this.svc.getForTask(taskId);
  }

  @Post('task/:taskId/:labelId')
  addToTask(@Param('taskId') taskId: string, @Param('labelId') labelId: string) {
    return this.svc.addToTask(taskId, labelId);
  }

  @Delete('task/:taskId/:labelId')
  removeFromTask(@Param('taskId') taskId: string, @Param('labelId') labelId: string) {
    return this.svc.removeFromTask(taskId, labelId);
  }
}
