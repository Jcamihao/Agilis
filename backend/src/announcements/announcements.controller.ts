import { Controller, Get, Post, Patch, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AnnouncementsService, CreateAnnouncementDto } from './announcements.service';

@UseGuards(JwtAuthGuard)
@Controller('announcements')
export class AnnouncementsController {
  constructor(private readonly svc: AnnouncementsService) {}

  @Get()
  list(@Req() req: any) {
    return this.svc.list(req.user.companyId);
  }

  @Get('unread')
  unread(@Req() req: any) {
    return this.svc.unreadCount(req.user.companyId, req.user.userId);
  }

  @Post()
  create(@Req() req: any, @Body() dto: CreateAnnouncementDto) {
    return this.svc.create(req.user.companyId, req.user.userId, dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateAnnouncementDto>) {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.svc.delete(id);
  }

  @Post(':id/read')
  markRead(@Param('id') id: string, @Req() req: any) {
    return this.svc.markRead(id, req.user.userId);
  }
}
