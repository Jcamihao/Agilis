import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChatService } from './chat.service';

@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('rooms')
  listRooms(@Req() req: any) {
    return this.chatService.listRooms(req.user.companyId);
  }

  @Post('rooms/general')
  getOrCreateGeneral(@Req() req: any) {
    return this.chatService.getOrCreateGeneralRoom(req.user.companyId);
  }

  @Post('rooms/project/:projectId')
  getOrCreateProject(
    @Req() req: any,
    @Param('projectId') projectId: string,
    @Body('projectName') projectName: string,
  ) {
    return this.chatService.getOrCreateProjectRoom(req.user.companyId, projectId, projectName);
  }

  @Get('rooms/:roomId/messages')
  getMessages(
    @Param('roomId') roomId: string,
    @Query('before') before?: string,
    @Query('limit') limit?: string,
  ) {
    return this.chatService.getMessages(roomId, limit ? +limit : 50, before);
  }

  @Post('rooms/:roomId/read')
  markRead(@Param('roomId') roomId: string, @Req() req: any) {
    return this.chatService.markRead(roomId, req.user.userId);
  }

  @Patch('messages/:id')
  editMessage(
    @Param('id') id: string,
    @Body('content') content: string,
    @Req() req: any,
  ) {
    return this.chatService.editMessage(id, req.user.userId, content);
  }

  @Delete('messages/:id')
  deleteMessage(@Param('id') id: string, @Req() req: any) {
    return this.chatService.deleteMessage(id, req.user.userId);
  }
}
