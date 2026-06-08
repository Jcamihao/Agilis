import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCompanyDto {
  @ApiProperty({ example: 'Minha Empresa' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'minha-empresa', required: false })
  @IsString()
  @IsOptional()
  slug?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  logoUrl?: string;
}
