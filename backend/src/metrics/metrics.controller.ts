import { Controller, Get, Param, Query, UseGuards, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MetricsService } from './metrics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

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

  @Get('user/me')
  @ApiOperation({ summary: 'Minhas métricas' })
  myMetrics(
    @CurrentUser('id') userId: string,
    @Query('companyId') companyId: string,
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    return this.service.getUserMetrics(userId, companyId, days);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Métricas de um usuário específico' })
  userMetrics(
    @Param('userId') userId: string,
    @Query('companyId') companyId: string,
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    return this.service.getUserMetrics(userId, companyId, days);
  }

  @Get('team/:teamId')
  @ApiOperation({ summary: 'Métricas de uma equipe' })
  teamMetrics(
    @Param('teamId') teamId: string,
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    return this.service.getTeamMetrics(teamId, days);
  }
}
