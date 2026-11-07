import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

export class CreateInviteDto {
  @ApiProperty({ enum: [1, 7, 30], required: false, default: 7 })
  @IsOptional()
  @IsIn([1, 7, 30], { message: 'expiresInDays deve ser 1, 7 ou 30' })
  expiresInDays?: number;
}
