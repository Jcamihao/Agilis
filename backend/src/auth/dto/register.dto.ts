import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'João Silva' })
  @IsString() @IsNotEmpty() @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'joao@empresa.com' })
  @IsEmail({}, { message: 'Email inválido' }) @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'Senha@123' })
  @IsString() @MinLength(6, { message: 'Senha deve ter no mínimo 6 caracteres' })
  password: string;

  @ApiProperty({ required: false })
  @IsString() @IsOptional()
  companyName?: string;

  @ApiProperty({ required: false })
  @IsString() @IsOptional()
  phone?: string;

  @ApiProperty({ required: false })
  @IsString() @IsOptional()
  cpfCnpj?: string;

  @ApiProperty({ required: false })
  @IsString() @IsOptional()
  cep?: string;

  @ApiProperty({ required: false })
  @IsString() @IsOptional()
  uf?: string;

  @ApiProperty({ required: false })
  @IsString() @IsOptional()
  address?: string;

  @ApiProperty({ required: false })
  @IsString() @IsOptional()
  addressNumber?: string;

  @ApiProperty({ required: false })
  @IsString() @IsOptional()
  addressComplement?: string;
}
