import { IsString, IsOptional, IsInt, IsDateString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class StartTimerDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;
}

export class StopTimerDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;
}

export class ManualEntryDto {
  @ApiProperty({ example: 90, description: 'Duração em minutos' })
  @IsInt()
  @Min(1)
  durationMin: number;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  startedAt?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateTimeEntryDto {
  @ApiProperty({ required: false })
  @IsInt()
  @Min(1)
  @IsOptional()
  durationMin?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;
}
