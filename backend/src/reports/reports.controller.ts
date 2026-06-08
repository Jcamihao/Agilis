import { Controller, Get, Query, Res, UseGuards, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

type Format = 'csv' | 'excel' | 'json';

@ApiTags('reports')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get('tasks')
  @ApiOperation({ summary: 'Relatório de tarefas (csv | excel | json)' })
  async tasks(
    @Query('companyId') companyId: string,
    @Query('format') format: Format = 'json',
    @Query('projectId') projectId?: string,
    @Query('assigneeId') assigneeId?: string,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Res() res?: Response,
  ) {
    const result = await this.service.exportTasks(companyId, format, {
      projectId, assigneeId, status, priority, from, to,
    });
    return this.send(res!, result, format, 'tasks');
  }

  @Get('productivity')
  @ApiOperation({ summary: 'Relatório de produtividade por usuário' })
  async productivity(
    @Query('companyId') companyId: string,
    @Query('format') format: Format = 'json',
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
    @Res() res?: Response,
  ) {
    const result = await this.service.exportProductivity(companyId, format, days);
    return this.send(res!, result, format, 'productivity');
  }

  @Get('audit')
  @ApiOperation({ summary: 'Relatório de auditoria' })
  async audit(
    @Query('companyId') companyId: string,
    @Query('format') format: Format = 'json',
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Res() res?: Response,
  ) {
    const result = await this.service.exportAudit(companyId, format, from, to);
    return this.send(res!, result, format, 'audit');
  }

  private send(res: Response, result: any, format: Format, name: string) {
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${name}-${Date.now()}.csv"`);
      return res.send('﻿' + result); // BOM for Excel UTF-8
    }

    if (format === 'excel') {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${name}-${Date.now()}.xlsx"`);
      return res.send(result);
    }

    return res.json({ success: true, data: result });
  }
}
