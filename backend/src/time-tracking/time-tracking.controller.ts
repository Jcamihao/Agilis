import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TimeTrackingService } from './time-tracking.service';
import { StartTimerDto, StopTimerDto, ManualEntryDto, UpdateTimeEntryDto } from './dto/time-tracking.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('time-tracking')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('time-tracking')
export class TimeTrackingController {
  constructor(private readonly svc: TimeTrackingService) {}

  // ── Per-task endpoints ────────────────────────────────────────────────────

  @Post('tasks/:taskId/start')
  @ApiOperation({ summary: 'Iniciar timer na tarefa' })
  startTimer(
    @Param('taskId') taskId: string,
    @Body() dto: StartTimerDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.svc.startTimer(taskId, userId, dto);
  }

  @Post('tasks/:taskId/stop')
  @ApiOperation({ summary: 'Parar timer ativo na tarefa' })
  stopTimer(
    @Param('taskId') taskId: string,
    @Body() dto: StopTimerDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.svc.stopTimer(taskId, userId, dto);
  }

  @Post('tasks/:taskId/manual')
  @ApiOperation({ summary: 'Adicionar entrada manual de tempo' })
  addManual(
    @Param('taskId') taskId: string,
    @Body() dto: ManualEntryDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.svc.addManual(taskId, userId, dto);
  }

  @Get('tasks/:taskId')
  @ApiOperation({ summary: 'Listar entradas de tempo da tarefa' })
  listByTask(
    @Param('taskId') taskId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.svc.listByTask(taskId, userId);
  }

  @Get('tasks/:taskId/active')
  @ApiOperation({ summary: 'Timer ativo do usuário na tarefa' })
  getActiveTimer(
    @Param('taskId') taskId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.svc.getActiveTimer(taskId, userId);
  }

  // ── Entry CRUD ────────────────────────────────────────────────────────────

  @Patch('entries/:id')
  @ApiOperation({ summary: 'Editar entrada de tempo' })
  updateEntry(
    @Param('id') id: string,
    @Body() dto: UpdateTimeEntryDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.svc.updateEntry(id, userId, dto);
  }

  @Delete('entries/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deletar entrada de tempo' })
  deleteEntry(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.svc.deleteEntry(id, userId);
  }

  // ── Reports ───────────────────────────────────────────────────────────────

  @Get('projects/:projectId/report')
  @ApiOperation({ summary: 'Relatório de tempo do projeto' })
  projectReport(
    @Param('projectId') projectId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.svc.projectReport(projectId, userId);
  }

  @Get('my-log')
  @ApiOperation({ summary: 'Meu histórico de tempo' })
  myLog(
    @CurrentUser('id') userId: string,
    @Query('companyId') companyId?: string,
  ) {
    return this.svc.myLog(userId, companyId);
  }
}
