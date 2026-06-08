import { Controller, Get, Put, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { WidgetType } from '@prisma/client';
import { DashboardWidgetsService, UpdateWidgetDto } from './dashboard-widgets.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('dashboard-widgets')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('dashboard-widgets')
export class DashboardWidgetsController {
  constructor(private readonly service: DashboardWidgetsService) {}

  @Get()
  @ApiOperation({ summary: 'Configuração de widgets do usuário' })
  getWidgets(@CurrentUser('id') userId: string) {
    return this.service.getWidgets(userId);
  }

  @Put(':widgetType')
  @ApiOperation({ summary: 'Atualizar widget (posição, tamanho, ativo)' })
  updateWidget(
    @Param('widgetType') widgetType: WidgetType,
    @Body() dto: UpdateWidgetDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.updateWidget(userId, widgetType, dto);
  }

  @Post('reorder')
  @ApiOperation({ summary: 'Reordenar widgets' })
  reorder(
    @Body() body: { order: { widgetType: WidgetType; position: number }[] },
    @CurrentUser('id') userId: string,
  ) {
    return this.service.reorder(userId, body.order);
  }

  @Delete('reset')
  @ApiOperation({ summary: 'Resetar widgets para o padrão' })
  reset(@CurrentUser('id') userId: string) {
    return this.service.resetToDefault(userId);
  }

  @Get(':widgetType/data')
  @ApiOperation({ summary: 'Dados de um widget específico' })
  getData(
    @Param('widgetType') widgetType: WidgetType,
    @Query('companyId') companyId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.getWidgetData(userId, companyId, widgetType);
  }
}
