import { Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkloadService } from './workload.service';

@ApiTags('workload')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('workload')
export class WorkloadController {
  constructor(private readonly svc: WorkloadService) {}

  @Get()
  getWorkload(@Req() req: any, @Query('projectId') projectId?: string) {
    return this.svc.getCompanyWorkload(req.user.companyId, projectId);
  }

  @Post('suggest')
  suggest(@Req() req: any) {
    return this.svc.suggestRedistribution(req.user.companyId);
  }
}
