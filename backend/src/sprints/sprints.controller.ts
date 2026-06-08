import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SprintsService } from './sprints.service';
import { CreateSprintDto } from './dto/create-sprint.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SprintStatus } from '@prisma/client';

@ApiTags('sprints')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('sprints')
export class SprintsController {
  constructor(private readonly sprintsService: SprintsService) {}

  @Get()
  findByProject(@Query('projectId') projectId: string, @CurrentUser('id') userId: string) {
    return this.sprintsService.findByProject(projectId, userId);
  }

  @Post()
  create(@Body() dto: CreateSprintDto, @CurrentUser('id') userId: string) {
    return this.sprintsService.create(dto, userId);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: SprintStatus,
    @CurrentUser('id') userId: string,
  ) {
    return this.sprintsService.updateStatus(id, status, userId);
  }
}
