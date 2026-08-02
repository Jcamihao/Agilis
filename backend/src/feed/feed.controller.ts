import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FeedService } from './feed.service';

@Controller('feed')
@UseGuards(JwtAuthGuard)
export class FeedController {
  constructor(private readonly svc: FeedService) {}

  @Get(':companyId')
  list(
    @Param('companyId') companyId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.svc.list(companyId, page ? +page : 1, limit ? +limit : 20);
  }

  @Post(':companyId')
  create(
    @Param('companyId') companyId: string,
    @Req() req: any,
    @Body() dto: { content: string; imageUrl?: string; isPinned?: boolean },
  ) {
    return this.svc.create(companyId, req.user.id, dto);
  }

  @Patch('posts/:id')
  update(@Param('id') id: string, @Req() req: any, @Body() dto: { content?: string; isPinned?: boolean }) {
    return this.svc.update(id, req.user.id, dto);
  }

  @Delete('posts/:id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.svc.delete(id, req.user.id);
  }

  @Post('posts/:id/react')
  react(@Param('id') postId: string, @Req() req: any, @Body() dto: { emoji: string }) {
    return this.svc.react(postId, req.user.id, dto.emoji ?? '👍');
  }

  @Post('posts/:id/comments')
  comment(@Param('id') postId: string, @Req() req: any, @Body() dto: { content: string }) {
    return this.svc.comment(postId, req.user.id, dto.content);
  }

  @Delete('comments/:id')
  deleteComment(@Param('id') id: string, @Req() req: any) {
    return this.svc.deleteComment(id, req.user.id);
  }
}
