import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TelegramService } from './telegram.service';

class SendTestDto {
  @IsString() chatId: string;
  @IsString() message: string;
}

@ApiTags('telegram')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('telegram')
export class TelegramController {
  constructor(private readonly service: TelegramService) {}

  @Get('updates')
  @ApiOperation({ summary: 'Listar usuários que interagiram com o bot (para obter chat IDs)' })
  updates() {
    return this.service.getRecentUpdates();
  }

  @Post('test')
  @ApiOperation({ summary: 'Enviar mensagem de teste para um chat ID' })
  test(@Body() dto: SendTestDto) {
    return this.service.sendMessage(dto.chatId, `🧪 <b>Teste Agilis</b>\n\n${dto.message || 'Conexão funcionando!'}`);
  }
}
