import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsOptional, IsString, IsUrl } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WebhookService } from './webhook.service';

const VALID_EVENTS = [
  'task.created',
  'task.status_changed',
  'task.assigned',
  'task.overdue',
  'comment.created',
  'process.completed',
  '*',
];

class CreateWebhookDto {
  @IsString() name: string;
  @IsUrl({ require_tld: false }) url: string;
  @IsString() companyId: string;
  @IsArray() events: string[];
  @IsString() @IsOptional() secret?: string;
}

class UpdateWebhookDto {
  @IsString() @IsOptional() name?: string;
  @IsUrl({ require_tld: false }) @IsOptional() url?: string;
  @IsArray() @IsOptional() events?: string[];
  @IsBoolean() @IsOptional() isActive?: boolean;
}

@ApiTags('webhooks')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('webhooks')
export class WebhookController {
  constructor(private readonly service: WebhookService) {}

  @Get()
  @ApiOperation({ summary: 'Listar webhooks da empresa' })
  list(@Query('companyId') companyId: string) {
    return this.service.list(companyId);
  }

  @Get('events')
  @ApiOperation({ summary: 'Listar eventos disponíveis' })
  events() {
    return { events: VALID_EVENTS };
  }

  @Get(':id/deliveries')
  @ApiOperation({ summary: 'Histórico de entregas do webhook' })
  deliveries(@Param('id') id: string, @Query('limit') limit?: string) {
    return this.service.getDeliveries(id, limit ? parseInt(limit) : 50);
  }

  @Post()
  @ApiOperation({ summary: 'Criar webhook' })
  create(@Body() dto: CreateWebhookDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar webhook' })
  update(@Param('id') id: string, @Body() dto: UpdateWebhookDto) {
    return this.service.update(id, dto);
  }

  @Post(':id/test')
  @ApiOperation({ summary: 'Disparar evento de teste' })
  test(@Param('id') id: string) {
    return this.service.test(id);
  }

  @Post(':id/regenerate-secret')
  @ApiOperation({ summary: 'Regenerar secret do webhook' })
  regenerateSecret(@Param('id') id: string) {
    return this.service.regenerateSecret(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deletar webhook' })
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }
}
