import { Controller, Get, Query, Res, UseGuards, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CalendarService } from './calendar.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('calendar')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('calendar')
export class CalendarController {
  constructor(private readonly service: CalendarService) {}

  @Get()
  @ApiOperation({ summary: 'Tarefas por intervalo de datas (agrupadas por dia)' })
  @ApiQuery({ name: 'companyId', required: true })
  @ApiQuery({ name: 'start', required: true, example: '2024-06-01' })
  @ApiQuery({ name: 'end', required: true, example: '2024-06-30' })
  getRange(
    @Query('companyId') companyId: string,
    @Query('start') start: string,
    @Query('end') end: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.getRange(companyId, userId, start, end);
  }

  @Get('ical')
  @ApiOperation({ summary: 'Exportar calendário de tarefas como feed iCal (.ics)' })
  @ApiQuery({ name: 'companyId', required: true })
  async ical(@Query('companyId') companyId: string, @Res() res: Response) {
    const ics = await this.service.exportIcal(companyId);
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="agilis-calendar-${Date.now()}.ics"`);
    return res.send(ics);
  }

  @Get('upcoming')
  @ApiOperation({ summary: 'Próximas tarefas com vencimento' })
  @ApiQuery({ name: 'companyId', required: true })
  @ApiQuery({ name: 'days', required: false })
  getUpcoming(
    @Query('companyId') companyId: string,
    @Query('days', new DefaultValuePipe(7), ParseIntPipe) days: number,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.getUpcoming(userId, companyId, days);
  }
}
