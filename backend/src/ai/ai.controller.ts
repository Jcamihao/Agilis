import { Controller, Post, Get, Body, Param, Query, UseGuards, Sse, Res } from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { IsString, IsOptional } from 'class-validator';

class ChatDto {
  @IsString() message: string;
  @IsString() companyId: string;
  @IsString() @IsOptional() conversationId?: string;
}

@ApiTags('ai')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('ai')
export class AiController {
  constructor(private readonly service: AiService) {}

  @Post('chat')
  @ApiOperation({ summary: 'Chat com IA sobre o workspace' })
  chat(@Body() dto: ChatDto, @CurrentUser('id') userId: string) {
    return this.service.chat(dto.companyId, userId, dto.message, dto.conversationId);
  }

  @Post('chat/stream')
  @ApiOperation({ summary: 'Chat streaming (SSE) com IA' })
  async chatStream(
    @Body() dto: ChatDto,
    @CurrentUser('id') userId: string,
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const stream = this.service.chatStream(dto.companyId, userId, dto.message);
    stream.subscribe({
      next: (chunk) => res.write(`data: ${JSON.stringify({ chunk })}\n\n`),
      complete: () => { res.write('data: [DONE]\n\n'); res.end(); },
      error: () => res.end(),
    });
  }

  @Get('conversations')
  @ApiOperation({ summary: 'Listar conversas' })
  getConversations(@Query('companyId') companyId: string) {
    return this.service.getConversations(companyId);
  }

  @Get('conversations/:id')
  @ApiOperation({ summary: 'Detalhes de uma conversa' })
  getConversation(@Param('id') id: string) {
    return this.service.getConversation(id);
  }

  @Post('summarize/project/:id')
  @ApiOperation({ summary: 'Resumir projeto com IA' })
  summarizeProject(@Param('id') id: string) {
    return this.service.summarizeProject(id).then((summary) => ({ summary }));
  }

  @Post('summarize/task/:id')
  @ApiOperation({ summary: 'Resumir tarefa com IA' })
  summarizeTask(@Param('id') id: string) {
    return this.service.summarizeTask(id).then((summary) => ({ summary }));
  }

  @Post('action-plan/:projectId')
  @ApiOperation({ summary: 'Gerar plano de ação para projeto' })
  actionPlan(@Param('projectId') id: string) {
    return this.service.generateActionPlan(id).then((plan) => ({ plan }));
  }

  @Get('bottlenecks')
  @ApiOperation({ summary: 'Identificar gargalos no workspace' })
  bottlenecks(@Query('companyId') companyId: string) {
    return this.service.identifyBottlenecks(companyId).then((analysis) => ({ analysis }));
  }

  @Post('suggest-assignee/:taskId')
  @ApiOperation({ summary: 'Sugerir responsável para tarefa' })
  suggestAssignee(@Param('taskId') taskId: string) {
    return this.service.suggestAssignee(taskId).then((suggestion) => ({ suggestion }));
  }

  @Post('strategic-brief')
  @ApiOperation({ summary: 'Gerar brief estratégico executivo com IA' })
  strategicBrief(@Body('companyId') companyId: string) {
    return this.service.generateStrategicBrief(companyId);
  }

}
