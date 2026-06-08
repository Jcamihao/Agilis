import { Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InsightsService } from './insights.service';

@ApiTags('insights')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('insights')
export class InsightsController {
  constructor(private readonly service: InsightsService) {}

  @Get()
  @ApiOperation({ summary: 'Insights inteligentes ativos' })
  list(@Query('companyId') companyId: string) {
    return this.service.list(companyId);
  }

  @Post('generate')
  @ApiOperation({ summary: 'Gerar riscos, gargalos e recomendações' })
  generate(@Query('companyId') companyId: string) {
    return this.service.generate(companyId);
  }

  @Patch(':id/read')
  read(@Param('id') id: string) {
    return this.service.markRead(id);
  }

  @Patch(':id/dismiss')
  dismiss(@Param('id') id: string) {
    return this.service.dismiss(id);
  }
}
