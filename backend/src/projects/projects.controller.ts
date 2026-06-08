import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, UseGuards, Optional } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('projects')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar projetos (companyId opcional; archived=true para arquivados)' })
  findAll(
    @Query('companyId') companyId: string | undefined,
    @Query('teamId') teamId: string | undefined,
    @Query('archived') archived: string,
    @CurrentUser('id') userId: string,
  ) {
    if (archived === 'true') {
      return this.projectsService.findArchived(companyId, userId);
    }
    return this.projectsService.findAll(companyId, userId, teamId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar projeto por ID' })
  findOne(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.projectsService.findOne(id, userId);
  }

  @Post()
  @ApiOperation({ summary: 'Criar novo projeto' })
  create(@Body() dto: CreateProjectDto, @CurrentUser('id') userId: string) {
    return this.projectsService.create(dto, userId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar projeto' })
  update(@Param('id') id: string, @Body() dto: CreateProjectDto, @CurrentUser('id') userId: string) {
    return this.projectsService.update(id, dto, userId);
  }

  @Patch(':id/archive')
  @ApiOperation({ summary: 'Arquivar projeto' })
  archive(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.projectsService.archive(id, userId);
  }

  @Patch(':id/restore')
  @ApiOperation({ summary: 'Restaurar projeto arquivado' })
  restore(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.projectsService.restore(id, userId);
  }

  @Post(':id/members/:userId')
  @ApiOperation({ summary: 'Adicionar/atualizar membro do projeto' })
  addMember(
    @Param('id') id: string,
    @Param('userId') targetUserId: string,
    @Body('role') role: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.projectsService.addMember(id, targetUserId, role || 'MEMBER', userId);
  }

  @Delete(':id/members/:userId')
  @ApiOperation({ summary: 'Remover membro do projeto' })
  removeMember(
    @Param('id') id: string,
    @Param('userId') targetUserId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.projectsService.removeMember(id, targetUserId, userId);
  }

  @Patch(':id/columns')
  @ApiOperation({ summary: 'Atualizar nomes das colunas' })
  updateColumns(
    @Param('id') id: string,
    @Body() config: Record<string, string>,
    @CurrentUser('id') userId: string,
  ) {
    return this.projectsService.updateColumnConfig(id, config, userId);
  }
}
