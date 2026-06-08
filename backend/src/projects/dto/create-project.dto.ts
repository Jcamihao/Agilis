import { IsArray, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProjectDto {
  @ApiProperty({ example: 'Agilis V1' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'Descrição do projeto', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: '#6366f1', required: false })
  @IsString()
  @IsOptional()
  color?: string;

  @ApiProperty({ example: 'rocket_launch', required: false })
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  companyId: string;

  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  teamId?: string;

  @ApiProperty({ type: [String], required: false })
  @IsArray()
  @IsUUID('all', { each: true })
  @IsOptional()
  teamIds?: string[];

  @ApiProperty({ type: [String], required: false })
  @IsArray()
  @IsUUID('all', { each: true })
  @IsOptional()
  memberIds?: string[];
}
