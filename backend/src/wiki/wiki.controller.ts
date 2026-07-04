import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards, Request,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WikiService, CreatePageDto, UpdatePageDto } from './wiki.service';

@ApiTags('wiki')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('projects/:projectId/wiki')
export class WikiController {
  constructor(private readonly svc: WikiService) {}

  @Get()
  tree(@Param('projectId') projectId: string) {
    return this.svc.listTree(projectId);
  }

  @Get('search')
  search(@Param('projectId') projectId: string, @Query('q') q: string) {
    return this.svc.searchPages(projectId, q ?? '');
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.svc.getPage(id);
  }

  @Post()
  create(
    @Param('projectId') projectId: string,
    @Request() req: any,
    @Body() dto: CreatePageDto,
  ) {
    return this.svc.createPage(projectId, req.user.id, dto);
  }

  @Patch('reorder')
  reorder(
    @Param('projectId') projectId: string,
    @Body('orderedIds') orderedIds: string[],
  ) {
    return this.svc.reorder(projectId, orderedIds);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Request() req: any,
    @Body() dto: UpdatePageDto,
  ) {
    return this.svc.updatePage(id, req.user.id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.svc.deletePage(id);
  }
}
