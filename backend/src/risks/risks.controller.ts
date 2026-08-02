import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RisksService, CreateRiskDto } from './risks.service';

@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/risks')
export class RisksController {
  constructor(private readonly svc: RisksService) {}

  @Get()
  list(@Param('projectId') projectId: string) {
    return this.svc.list(projectId);
  }

  @Get('stats')
  stats(@Param('projectId') projectId: string) {
    return this.svc.stats(projectId);
  }

  @Post()
  create(@Param('projectId') projectId: string, @Body() dto: CreateRiskDto) {
    return this.svc.create(projectId, dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateRiskDto>) {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.svc.delete(id);
  }
}
