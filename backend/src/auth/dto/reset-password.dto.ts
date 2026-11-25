import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({ description: 'Token recebido por e-mail' })
  @IsString() @IsNotEmpty()
  token: string;

  @ApiProperty({ example: 'SenhaNova@123' })
  @IsString() @MinLength(6, { message: 'Senha deve ter no mínimo 6 caracteres' })
  password: string;
}
