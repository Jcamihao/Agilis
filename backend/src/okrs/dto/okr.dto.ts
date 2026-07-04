import { IsString, IsOptional, IsEnum, IsDateString, IsNumber, IsArray, Min } from 'class-validator';

export enum ObjectiveStatus { DRAFT = 'DRAFT', ACTIVE = 'ACTIVE', COMPLETED = 'COMPLETED', CANCELLED = 'CANCELLED' }
export enum KeyResultType   { PERCENTAGE = 'PERCENTAGE', NUMBER = 'NUMBER', CURRENCY = 'CURRENCY', BOOLEAN = 'BOOLEAN' }

export class CreateObjectiveDto {
  @IsString()  title: string;
  @IsOptional() @IsString()  description?: string;
  @IsOptional() @IsEnum(ObjectiveStatus) status?: ObjectiveStatus;
  @IsDateString() startDate: string;
  @IsDateString() endDate: string;
}

export class UpdateObjectiveDto {
  @IsOptional() @IsString()  title?: string;
  @IsOptional() @IsString()  description?: string;
  @IsOptional() @IsEnum(ObjectiveStatus) status?: ObjectiveStatus;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() endDate?: string;
}

export class CreateKeyResultDto {
  @IsString()  title: string;
  @IsOptional() @IsEnum(KeyResultType) type?: KeyResultType;
  @IsNumber() @Min(0) targetValue: number;
  @IsOptional() @IsNumber() startValue?: number;
  @IsOptional() @IsString() unit?: string;
}

export class UpdateKeyResultDto {
  @IsOptional() @IsString()  title?: string;
  @IsOptional() @IsNumber() @Min(0) currentValue?: number;
  @IsOptional() @IsNumber() @Min(0) targetValue?: number;
  @IsOptional() @IsString() unit?: string;
}

export class LinkTasksDto {
  @IsArray() @IsString({ each: true }) taskIds: string[];
}
