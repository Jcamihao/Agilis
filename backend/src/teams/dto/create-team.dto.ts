import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, IsArray, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class InitialMemberDto {
  @IsUUID()
  userId: string;

  @IsString()
  @IsOptional()
  role?: string;
}

export class CreateTeamDto {
  @ApiProperty({ example: 'Equipe de Produto' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: '#6366f1', required: false })
  @IsString()
  @IsOptional()
  color?: string;

  @ApiProperty({ example: 'uuid-da-empresa' })
  @IsUUID()
  @IsNotEmpty()
  companyId: string;

  @ApiProperty({ type: [InitialMemberDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InitialMemberDto)
  members?: InitialMemberDto[];
}

export class AddTeamMemberDto {
  @ApiProperty()
  @IsUUID()
  userId: string;

  @ApiProperty({ enum: ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'], default: 'MEMBER' })
  @IsString()
  @IsOptional()
  role?: string;
}
