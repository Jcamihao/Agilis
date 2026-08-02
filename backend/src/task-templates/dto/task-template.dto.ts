import { IsEnum, IsNotEmpty, IsOptional, IsString, IsNumber, IsUUID } from 'class-validator';
import { Priority } from '@prisma/client';

export class CreateTaskTemplateDto {
  @IsString() @IsNotEmpty() name: string;
  @IsString() @IsOptional() description?: string;
  @IsEnum(Priority) @IsOptional() priority?: Priority;
  @IsOptional() checklist?: { label: string; order: number }[];
  @IsNumber() @IsOptional() estimatedHours?: number;
  @IsUUID() @IsNotEmpty() companyId: string;
}

export class UpdateTaskTemplateDto {
  @IsString() @IsNotEmpty() @IsOptional() name?: string;
  @IsString() @IsOptional() description?: string;
  @IsEnum(Priority) @IsOptional() priority?: Priority;
  @IsOptional() checklist?: { label: string; order: number }[];
  @IsNumber() @IsOptional() estimatedHours?: number;
}

export class UseTaskTemplateDto {
  @IsUUID() @IsNotEmpty() projectId: string;
  @IsUUID() @IsOptional() assigneeId?: string;
  @IsUUID() @IsOptional() sprintId?: string;
}
