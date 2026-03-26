import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { WorkAssistantOverviewDto } from './dto/work-assistant-overview.dto';
import { WorkAssistantService } from './work-assistant.service';

@Controller('work-assistant')
@UseGuards(JwtAuthGuard)
export class WorkAssistantController {
  constructor(private readonly workAssistantService: WorkAssistantService) {}

  @Get('overview')
  getOverview(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<WorkAssistantOverviewDto> {
    return this.workAssistantService.getOverview(user);
  }
}
