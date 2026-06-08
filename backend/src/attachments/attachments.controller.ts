import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AttachmentsService, CreateAttachmentDto } from './attachments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('attachments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('attachments')
export class AttachmentsController {
  constructor(private readonly service: AttachmentsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar anexos de uma tarefa' })
  findByTask(@Query('taskId') taskId: string) {
    return this.service.findByTask(taskId);
  }

  @Post()
  @ApiOperation({ summary: 'Registrar metadados de anexo' })
  create(@Body() dto: CreateAttachmentDto, @CurrentUser('id') userId: string) {
    return this.service.create(dto, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover anexo' })
  delete(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.delete(id, userId);
  }
}
