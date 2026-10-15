import { Controller, Get, Query, UseGuards, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MetricsService } from './metrics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('metrics')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('metrics')
export class MetricsController {
  constructor(private readonly service: MetricsService) {}

  @Get('company')
  @ApiOperation({ summary: 'Métricas gerais da empresa' })
  company(
    @Query('companyId') companyId: string,
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    return this.service.getCompanyMetrics(companyId, days);
  }

  @Get('company/users')
  @ApiOperation({ summary: 'Métricas de todos os usuários da empresa' })
  allUsers(
    @Query('companyId') companyId: string,
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    return this.service.getAllUsersMetrics(companyId, days);
  }
}
