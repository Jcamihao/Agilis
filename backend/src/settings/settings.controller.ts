import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { MySettingsResponseDto } from './dto/my-settings-response.dto';
import { UpdateMySettingsDto } from './dto/update-my-settings.dto';
import { SettingsService } from './settings.service';

@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('me')
  getMine(@CurrentUser() user: AuthenticatedUser): Promise<MySettingsResponseDto> {
    return this.settingsService.getMine(user);
  }

  @Patch('me')
  updateMine(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateMySettingsDto,
  ): Promise<MySettingsResponseDto> {
    return this.settingsService.updateMine(user, dto);
  }
}
