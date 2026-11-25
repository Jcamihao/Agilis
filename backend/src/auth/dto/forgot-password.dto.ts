import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'joao@empresa.com' })
  @IsEmail({}, { message: 'Email inválido' }) @IsNotEmpty()
  email: string;
}
