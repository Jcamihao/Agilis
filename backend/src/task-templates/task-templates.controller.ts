import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TaskTemplatesService } from './task-templates.service';
import { CreateTaskTemplateDto, UpdateTaskTemplateDto, UseTaskTemplateDto } from './dto/task-template.dto';

@ApiTags('task-templates')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('task-templates')
export class TaskTemplatesController {
  constructor(private readonly svc: TaskTemplatesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar templates da empresa' })
  list(@Query('companyId') companyId: string) {
    return this.svc.list(companyId);
  }

  @Post()
  @ApiOperation({ summary: 'Criar template' })
  create(@Body() dto: CreateTaskTemplateDto, @CurrentUser('id') userId: string) {
    return this.svc.create(dto, userId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar template' })
  update(@Param('id') id: string, @Body() dto: UpdateTaskTemplateDto, @CurrentUser('id') userId: string) {
    return this.svc.update(id, dto, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Excluir template' })
  delete(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.svc.delete(id, userId);
  }

  @Post(':id/use')
  @ApiOperation({ summary: 'Criar tarefa a partir do template' })
  use(@Param('id') id: string, @Body() dto: UseTaskTemplateDto, @CurrentUser('id') userId: string) {
    return this.svc.useTemplate(id, dto, userId);
  }
}
