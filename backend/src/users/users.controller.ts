import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsersService, UpdateProfileDto, InviteMemberDto } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Meu perfil' })
  getProfile(@CurrentUser('id') userId: string) {
    return this.usersService.findOne(userId);
  }

  @Put('profile')
  @ApiOperation({ summary: 'Atualizar perfil' })
  updateProfile(@CurrentUser('id') userId: string, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(userId, dto);
  }

  @Get('company-members')
  @ApiOperation({ summary: 'Membros da empresa (simples)' })
  getCompanyMembers(@Query('companyId') companyId: string) {
    return this.usersService.findCompanyMembers(companyId);
  }

  @Get('company-members/detailed')
  @ApiOperation({ summary: 'Membros da empresa com papéis e detalhes' })
  getCompanyMembersDetailed(@Query('companyId') companyId: string) {
    return this.usersService.findCompanyMembersWithRoles(companyId);
  }

  @Post('company-members/invite')
  @ApiOperation({ summary: 'Convidar membro para a empresa' })
  inviteMember(
    @Query('companyId') companyId: string,
    @Body() dto: InviteMemberDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.usersService.inviteMember(companyId, dto, userId);
  }

  @Patch('company-members/:targetUserId/role')
  @ApiOperation({ summary: 'Alterar papel do membro' })
  updateMemberRole(
    @Query('companyId') companyId: string,
    @Param('targetUserId') targetUserId: string,
    @Body('role') role: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.usersService.updateMemberRole(companyId, targetUserId, role, userId);
  }

  @Delete('company-members/:targetUserId')
  @ApiOperation({ summary: 'Remover membro da empresa' })
  removeMember(
    @Query('companyId') companyId: string,
    @Param('targetUserId') targetUserId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.usersService.removeMember(companyId, targetUserId, userId);
  }
}
