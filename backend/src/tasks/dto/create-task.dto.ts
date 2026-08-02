import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, IsDateString, IsNumber, Allow, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DependencyType, Priority, TaskStatus } from '@prisma/client';

export class UpdateTaskDto {
  @IsString() @IsNotEmpty() @IsOptional() title?: string;
  @IsString() @IsOptional() description?: string;
  @IsEnum(TaskStatus) @IsOptional() status?: TaskStatus;
  @IsEnum(Priority) @IsOptional() priority?: Priority;
  @IsDateString() @IsOptional() startDate?: string;
  @IsDateString() @IsOptional() dueDate?: string;
  @IsUUID() @IsOptional() assigneeId?: string | null;
  @IsUUID() @IsOptional() sprintId?: string;
  @Allow() @IsOptional() position?: number;
  @IsString() @IsOptional() recurrence?: string;
}

export class CreateTaskDto {
  @ApiProperty({ example: 'Implementar autenticação' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: TaskStatus, default: TaskStatus.BACKLOG })
  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus;

  @ApiProperty({ enum: Priority, default: Priority.MEDIUM })
  @IsEnum(Priority)
  @IsOptional()
  priority?: Priority;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  projectId: string;

  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  assigneeId?: string;

  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  sprintId?: string;

  @ApiProperty({ required: false, default: 'NONE' })
  @IsString()
  @IsOptional()
  recurrence?: string;
}

export class UpdateTaskStatusDto {
  @ApiProperty({ enum: TaskStatus })
  @IsEnum(TaskStatus)
  status: TaskStatus;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  position?: number;
}

export class MoveTaskDto {
  @ApiProperty({ enum: TaskStatus })
  @IsEnum(TaskStatus)
  status: TaskStatus;

  @ApiProperty()
  @IsNumber()
  position: number;
}

export class CreateSubtaskDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: Priority, required: false })
  @IsEnum(Priority)
  @IsOptional()
  priority?: Priority;

  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  assigneeId?: string;
}

export class BulkUpdateTasksDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsUUID(undefined, { each: true })
  ids: string[];

  @ApiProperty({ enum: TaskStatus, required: false })
  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus;

  @ApiProperty({ enum: Priority, required: false })
  @IsEnum(Priority)
  @IsOptional()
  priority?: Priority;

  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  assigneeId?: string | null;

  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  sprintId?: string | null;
}

export class AddDependencyDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  dependsOnId: string;

  @ApiProperty({ enum: DependencyType, default: DependencyType.BLOCKS })
  @IsEnum(DependencyType)
  @IsOptional()
  type?: DependencyType;
}
