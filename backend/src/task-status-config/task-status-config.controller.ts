import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TaskStatusConfigService } from './task-status-config.service';

@UseGuards(JwtAuthGuard)
@Controller('task-status-config')
export class TaskStatusConfigController {
  constructor(private readonly svc: TaskStatusConfigService) {}

  @Get()
  list(@Query('companyId') companyId: string) {
    return this.svc.list(companyId);
  }

  @Post()
  create(@Body() dto: { companyId: string; name: string; color?: string; order?: number }) {
    return this.svc.create(dto.companyId, dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: { name?: string; color?: string; order?: number }) {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.svc.delete(id);
  }
}
