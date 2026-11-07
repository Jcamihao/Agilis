import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { InvitesService } from './invites.service';
import { CreateInviteDto } from './dto/create-invite.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthThrottlerGuard } from '../auth/guards/auth-throttler.guard';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('invites')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('invites')
export class InvitesController {
  constructor(private readonly invitesService: InvitesService) {}

  @Post()
  @ApiOperation({ summary: 'Gera link de convite para a empresa (admin)' })
  create(
    @Query('companyId', ParseUUIDPipe) companyId: string,
    @Body() dto: CreateInviteDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.invitesService.create(companyId, userId, dto.expiresInDays);
  }

  @Get()
  @ApiOperation({ summary: 'Lista convites ativos da empresa (admin)' })
  list(@Query('companyId', ParseUUIDPipe) companyId: string, @CurrentUser('id') userId: string) {
    return this.invitesService.list(companyId, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Revoga convite (admin da empresa dona)' })
  revoke(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') userId: string) {
    return this.invitesService.revoke(id, userId);
  }

  @Public()
  @UseGuards(AuthThrottlerGuard)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Get(':token/preview')
  @ApiOperation({ summary: 'Dados públicos do convite (nome da empresa e de quem convidou)' })
  preview(@Param('token') token: string) {
    return this.invitesService.preview(token);
  }

  @UseGuards(AuthThrottlerGuard)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post(':token/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Entra na empresa do convite como MEMBER (idempotente)' })
  accept(@Param('token') token: string, @CurrentUser('id') userId: string) {
    return this.invitesService.accept(token, userId);
  }
}
