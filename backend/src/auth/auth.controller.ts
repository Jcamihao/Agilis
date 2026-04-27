import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RateLimit } from '../common/decorators/rate-limit.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RateLimitGuard } from '../common/guards/rate-limit.guard';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { AuthService } from './auth.service';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

const REFRESH_TOKEN_COOKIE = 'agilis.refresh-token';
const REFRESH_TOKEN_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @RateLimit({ limit: 5, windowMs: 15 * 60 * 1000 })
  @UseGuards(RateLimitGuard)
  async register(
    @Body() dto: RegisterDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponseDto> {
    const authResponse = await this.authService.register(
      dto,
      this.getRequestContext(request),
    );
    this.setRefreshTokenCookie(response, authResponse.refreshToken);

    return AuthResponseDto.fromValues(authResponse.accessToken, authResponse.user);
  }

  @Post('login')
  @RateLimit({ limit: 8, windowMs: 15 * 60 * 1000 })
  @UseGuards(RateLimitGuard)
  async login(
    @Body() dto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponseDto> {
    const authResponse = await this.authService.login(
      dto,
      this.getRequestContext(request),
    );
    this.setRefreshTokenCookie(response, authResponse.refreshToken);

    return AuthResponseDto.fromValues(authResponse.accessToken, authResponse.user);
  }

  @Post('refresh')
  @HttpCode(200)
  @RateLimit({ limit: 20, windowMs: 15 * 60 * 1000 })
  @UseGuards(RateLimitGuard)
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponseDto> {
    const authResponse = await this.authService.refresh(
      this.getCookie(request, REFRESH_TOKEN_COOKIE),
      this.getRequestContext(request),
    );
    this.setRefreshTokenCookie(response, authResponse.refreshToken);

    return AuthResponseDto.fromValues(authResponse.accessToken, authResponse.user);
  }

  @Post('logout')
  @HttpCode(204)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.authService.logout(this.getCookie(request, REFRESH_TOKEN_COOKIE));
    this.clearRefreshTokenCookie(response);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthenticatedUser): Promise<UserResponseDto> {
    return this.authService.me(user);
  }

  private getRequestContext(request: Request): { ipAddress?: string; userAgent?: string } {
    return {
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    };
  }

  private getCookie(request: Request, name: string): string | undefined {
    const cookieHeader = request.headers.cookie;

    if (!cookieHeader) {
      return undefined;
    }

    const cookie = cookieHeader
      .split(';')
      .map((item) => item.trim())
      .find((item) => item.startsWith(`${name}=`));

    if (!cookie) {
      return undefined;
    }

    try {
      return decodeURIComponent(cookie.slice(name.length + 1));
    } catch {
      return undefined;
    }
  }

  private setRefreshTokenCookie(response: Response, refreshToken: string): void {
    response.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/auth',
      maxAge: REFRESH_TOKEN_MAX_AGE_MS,
    });
  }

  private clearRefreshTokenCookie(response: Response): void {
    response.clearCookie(REFRESH_TOKEN_COOKIE, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/auth',
    });
  }
}
