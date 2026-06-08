import { Controller, Get, Query, Param, UseGuards, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuditAction } from '@prisma/client';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('audit')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('audit')
export class AuditController {
  constructor(private readonly service: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'Logs de auditoria com filtros' })
  findAll(
    @Query('companyId') companyId: string,
    @Query('userId') userId?: string,
    @Query('entityType') entityType?: string,
    @Query('action') action?: AuditAction,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit?: number,
  ) {
    return this.service.findAll(companyId, { userId, entityType, action, from, to, page, limit });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Estatísticas de auditoria (últimos 30 dias)' })
  getStats(@Query('companyId') companyId: string) {
    return this.service.getStats(companyId);
  }

  @Get(':entityType/:entityId')
  @ApiOperation({ summary: 'Histórico de uma entidade específica' })
  findByEntity(@Param('entityType') entityType: string, @Param('entityId') entityId: string) {
    return this.service.findByEntity(entityType, entityId);
  }
}
