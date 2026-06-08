import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TeamsService } from './teams.service';
import { CreateTeamDto, AddTeamMemberDto } from './dto/create-team.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('teams')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar equipes da empresa' })
  findAll(@Query('companyId') companyId: string, @CurrentUser('id') userId: string) {
    return this.teamsService.findAll(companyId, userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar equipe por ID' })
  findOne(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.teamsService.findOne(id, userId);
  }

  @Post()
  @ApiOperation({ summary: 'Criar nova equipe' })
  create(@Body() dto: CreateTeamDto, @CurrentUser('id') userId: string) {
    return this.teamsService.create(dto, userId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar equipe' })
  update(@Param('id') id: string, @Body() dto: CreateTeamDto, @CurrentUser('id') userId: string) {
    return this.teamsService.update(id, dto, userId);
  }

  @Post(':id/members')
  @ApiOperation({ summary: 'Adicionar membro à equipe' })
  addMember(@Param('id') id: string, @Body() dto: AddTeamMemberDto, @CurrentUser('id') userId: string) {
    return this.teamsService.addMember(id, dto, userId);
  }

  @Delete(':id/members/:memberId')
  @ApiOperation({ summary: 'Remover membro da equipe' })
  removeMember(@Param('id') id: string, @Param('memberId') memberId: string, @CurrentUser('id') userId: string) {
    return this.teamsService.removeMember(id, memberId, userId);
  }
}
