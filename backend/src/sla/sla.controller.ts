import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SlaService } from './sla.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('sla')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('sla')
export class SlaController {
  constructor(private readonly service: SlaService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Resumo de SLA da empresa' })
  summary(@Query('companyId') companyId: string) {
    return this.service.getSummary(companyId);
  }

  @Get('breached')
  @ApiOperation({ summary: 'Tarefas com SLA violado' })
  breached(@Query('companyId') companyId: string) {
    return this.service.getBreached(companyId);
  }

  @Get('task/:taskId')
  @ApiOperation({ summary: 'SLA de uma tarefa específica' })
  forTask(@Param('taskId') taskId: string) {
    return this.service.getForTask(taskId);
  }
}
