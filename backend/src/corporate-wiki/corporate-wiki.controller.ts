import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CorporateWikiService } from './corporate-wiki.service';

@Controller('corporate-wiki')
@UseGuards(JwtAuthGuard)
export class CorporateWikiController {
  constructor(private readonly svc: CorporateWikiService) {}

  @Get(':companyId')
  list(@Param('companyId') companyId: string) {
    return this.svc.list(companyId);
  }

  @Get('pages/:id')
  getOne(@Param('id') id: string) {
    return this.svc.getOne(id);
  }

  @Post(':companyId')
  create(
    @Param('companyId') companyId: string,
    @Req() req: any,
    @Body() dto: { title: string; content?: string; parentId?: string; icon?: string; position?: number },
  ) {
    return this.svc.create(companyId, req.user.id, dto);
  }

  @Patch('pages/:id')
  update(
    @Param('id') id: string,
    @Req() req: any,
    @Body() dto: { title?: string; content?: string; icon?: string; position?: number; parentId?: string },
  ) {
    return this.svc.update(id, req.user.id, dto);
  }

  @Delete('pages/:id')
  remove(@Param('id') id: string) {
    return this.svc.delete(id);
  }
}
