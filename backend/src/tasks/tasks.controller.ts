import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto, UpdateTaskDto, MoveTaskDto, CreateSubtaskDto, AddDependencyDto, BulkUpdateTasksDto } from './dto/create-task.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('tasks')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get('kanban/:projectId')
  @ApiOperation({ summary: 'Buscar tarefas do kanban por projeto' })
  findKanban(@Param('projectId') projectId: string, @CurrentUser('id') userId: string) {
    return this.tasksService.findByProject(projectId, userId);
  }

  @Get('my-tasks')
  @ApiOperation({ summary: 'Minhas tarefas' })
  findMyTasks(
    @CurrentUser('id') userId: string,
    @Query('companyId') companyId?: string,
  ) {
    return this.tasksService.findMyTasks(userId, companyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar tarefa por ID' })
  findOne(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.tasksService.findOne(id, userId);
  }

  @Post()
  @ApiOperation({ summary: 'Criar nova tarefa' })
  create(@Body() dto: CreateTaskDto, @CurrentUser('id') userId: string) {
    return this.tasksService.create(dto, userId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar tarefa' })
  update(@Param('id') id: string, @Body() dto: UpdateTaskDto, @CurrentUser('id') userId: string) {
    return this.tasksService.update(id, dto, userId);
  }

  @Patch(':id/move')
  @ApiOperation({ summary: 'Mover tarefa no kanban' })
  moveTask(@Param('id') id: string, @Body() dto: MoveTaskDto, @CurrentUser('id') userId: string) {
    return this.tasksService.moveTask(id, dto, userId);
  }

  @Patch('bulk')
  @ApiOperation({ summary: 'Atualizar múltiplas tarefas' })
  bulkUpdate(@Body() dto: BulkUpdateTasksDto, @CurrentUser('id') userId: string) {
    return this.tasksService.bulkUpdate(dto, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deletar tarefa' })
  delete(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.tasksService.delete(id, userId);
  }

  @Post(':id/participants/:participantId')
  @ApiOperation({ summary: 'Adicionar co-participante' })
  addParticipant(
    @Param('id') id: string,
    @Param('participantId') participantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.tasksService.addParticipant(id, participantId, userId);
  }

  @Delete(':id/participants/:participantId')
  @ApiOperation({ summary: 'Remover co-participante' })
  removeParticipant(
    @Param('id') id: string,
    @Param('participantId') participantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.tasksService.removeParticipant(id, participantId, userId);
  }

  // ── Subtasks ──────────────────────────────────────────────────────────────

  @Get(':id/subtasks')
  @ApiOperation({ summary: 'Listar subtarefas' })
  listSubtasks(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.tasksService.listSubtasks(id, userId);
  }

  @Post(':id/subtasks')
  @ApiOperation({ summary: 'Criar subtarefa' })
  createSubtask(
    @Param('id') parentId: string,
    @Body() dto: CreateSubtaskDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.tasksService.createSubtask(parentId, dto, userId);
  }

  @Delete(':id/subtasks/:subtaskId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover subtarefa' })
  deleteSubtask(
    @Param('id') parentId: string,
    @Param('subtaskId') subtaskId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.tasksService.deleteSubtask(parentId, subtaskId, userId);
  }

  // ── Dependencies ──────────────────────────────────────────────────────────

  @Get(':id/dependencies')
  @ApiOperation({ summary: 'Listar dependências da tarefa' })
  listDependencies(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.tasksService.listDependencies(id, userId);
  }

  @Post(':id/dependencies')
  @ApiOperation({ summary: 'Adicionar dependência' })
  addDependency(
    @Param('id') taskId: string,
    @Body() dto: AddDependencyDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.tasksService.addDependency(taskId, dto, userId);
  }

  @Delete(':id/dependencies/:dependsOnId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover dependência' })
  removeDependency(
    @Param('id') taskId: string,
    @Param('dependsOnId') dependsOnId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.tasksService.removeDependency(taskId, dependsOnId, userId);
  }
}
