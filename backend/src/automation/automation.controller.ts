import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AutomationService, CreateAutomationDto } from './automation.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('automation')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('automation')
export class AutomationController {
  constructor(private readonly service: AutomationService) {}

  @Get()
  @ApiOperation({ summary: 'Listar regras de automação' })
  findAll(@Query('companyId') companyId: string, @CurrentUser('id') userId: string) {
    return this.service.findAll(companyId, userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe de uma regra' })
  findOne(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.findOne(id, userId);
  }

  @Post()
  @ApiOperation({ summary: 'Criar regra de automação' })
  create(@Body() dto: CreateAutomationDto, @CurrentUser('id') userId: string) {
    return this.service.create(dto, userId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar regra' })
  update(@Param('id') id: string, @Body() dto: CreateAutomationDto, @CurrentUser('id') userId: string) {
    return this.service.update(id, dto, userId);
  }

  @Patch(':id/toggle')
  @ApiOperation({ summary: 'Ativar/desativar regra' })
  toggle(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.toggleActive(id, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Excluir regra' })
  delete(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.delete(id, userId);
  }

  @Get(':id/executions')
  @ApiOperation({ summary: 'Histórico de execuções' })
  executions(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.getExecutions(id, userId);
  }
}
