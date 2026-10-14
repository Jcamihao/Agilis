import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { HealthScoreService } from './health-score.service';

@ApiTags('health-score')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('health-score')
export class HealthScoreController {
  constructor(private readonly service: HealthScoreService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Health Score da empresa, equipes e projetos' })
  async overview(@Query('companyId') companyId: string) {
    const [company, teams, projects] = await Promise.all([
      this.service.getCompanyScore(companyId),
      this.service.getTeamsScores(companyId),
      this.service.getProjectsScores(companyId),
    ]);
    return { company, teams, projects };
  }

  @Get('recalculate')
  async recalculate(@Query('companyId') companyId: string) {
    const score = await this.service.calculateCompanyScore(companyId);
    return { score };
  }
}
