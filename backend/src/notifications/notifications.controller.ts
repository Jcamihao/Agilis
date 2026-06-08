import {
  Controller, Get, Patch, Delete, Param, Query, UseGuards, ParseIntPipe, DefaultValuePipe, Sse
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Sse('stream')
  @ApiOperation({ summary: 'SSE stream de notificações em tempo real' })
  stream(@CurrentUser('id') userId: string): Observable<MessageEvent> {
    return this.service.getStream(userId);
  }

  @Get()
  @ApiOperation({ summary: 'Listar notificações com paginação' })
  findAll(
    @CurrentUser('id') userId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.service.findAll(userId, page, limit);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Contagem de notificações não lidas' })
  unreadCount(@CurrentUser('id') userId: string) {
    return this.service.getUnreadCount(userId);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Marcar notificação como lida' })
  markAsRead(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.markAsRead(id, userId);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Marcar todas como lidas' })
  markAllAsRead(@CurrentUser('id') userId: string) {
    return this.service.markAllAsRead(userId);
  }

  @Delete('old')
  @ApiOperation({ summary: 'Remover notificações lidas com mais de 30 dias' })
  deleteOld(@CurrentUser('id') userId: string) {
    return this.service.deleteOld(userId);
  }
}
