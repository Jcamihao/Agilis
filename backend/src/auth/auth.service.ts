import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { PrismaService } from '../prisma/prisma.service';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { UsersService } from '../users/users.service';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

const REFRESH_TOKEN_TTL_DAYS = 30;

export interface AuthRequestContext {
  ipAddress?: string;
  userAgent?: string;
}

export interface AuthSessionResponse extends AuthResponseDto {
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(
    dto: RegisterDto,
    context: AuthRequestContext,
  ): Promise<AuthSessionResponse> {
    const existingUser = await this.usersService.findByEmail(dto.email);

    if (existingUser) {
      throw new ConflictException('Ja existe um usuario com este email.');
    }

    const password = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.$transaction(async (transaction) => {
      const organization = await transaction.organization.create({
        data: {
          name: dto.organizationName,
        },
      });

      return transaction.user.create({
        data: {
          name: dto.name,
          email: dto.email,
          password,
          role: Role.ADMIN,
          organizationId: organization.id,
        },
      });
    });

    return this.buildAuthResponse(user, context);
  }

  async login(
    dto: LoginDto,
    context: AuthRequestContext,
  ): Promise<AuthSessionResponse> {
    const user = await this.validateCredentials(dto.email, dto.password);
    return this.buildAuthResponse(user, context);
  }

  async refresh(
    refreshToken: string | undefined,
    context: AuthRequestContext,
  ): Promise<AuthSessionResponse> {
    if (!refreshToken) {
      throw new UnauthorizedException('Sessao expirada.');
    }

    const refreshTokenHash = this.hashRefreshToken(refreshToken);
    const session = await this.prisma.authSession.findUnique({
      where: { refreshTokenHash },
      include: { user: true },
    });

    if (!session || session.revokedAt || session.expiresAt <= new Date()) {
      throw new UnauthorizedException('Sessao expirada.');
    }

    const nextRefreshToken = this.createRefreshToken();
    const nextRefreshTokenHash = this.hashRefreshToken(nextRefreshToken);
    const nextExpiresAt = this.getRefreshTokenExpiresAt();

    await this.prisma.authSession.update({
      where: { id: session.id },
      data: {
        refreshTokenHash: nextRefreshTokenHash,
        expiresAt: nextExpiresAt,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      },
    });

    const accessToken = await this.signAccessToken(session.user, session.id);

    return {
      accessToken,
      refreshToken: nextRefreshToken,
      user: UserResponseDto.fromUser(session.user),
    };
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) {
      return;
    }

    await this.prisma.authSession.updateMany({
      where: {
        refreshTokenHash: this.hashRefreshToken(refreshToken),
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  async me(user: AuthenticatedUser): Promise<UserResponseDto> {
    const currentUser = await this.usersService.findByIdWithinOrganization(
      user.id,
      user.organizationId,
    );

    return UserResponseDto.fromUser(currentUser);
  }

  private async validateCredentials(email: string, password: string): Promise<User> {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Credenciais invalidas.');
    }

    const passwordMatches = await bcrypt.compare(password, user.password);

    if (!passwordMatches) {
      throw new UnauthorizedException('Credenciais invalidas.');
    }

    return user;
  }

  private async buildAuthResponse(
    user: User,
    context: AuthRequestContext,
  ): Promise<AuthSessionResponse> {
    const refreshToken = this.createRefreshToken();
    const session = await this.prisma.authSession.create({
      data: {
        userId: user.id,
        organizationId: user.organizationId,
        refreshTokenHash: this.hashRefreshToken(refreshToken),
        expiresAt: this.getRefreshTokenExpiresAt(),
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      },
    });

    const accessToken = await this.signAccessToken(user, session.id);

    return {
      accessToken,
      refreshToken,
      user: UserResponseDto.fromUser(user),
    };
  }

  private async signAccessToken(user: User, sessionId: string): Promise<string> {
    const payload: JwtPayload = {
      sub: user.id,
      sessionId,
      name: user.name,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>('JWT_SECRET'),
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN') ?? '15m',
    });

    return accessToken;
  }

  private createRefreshToken(): string {
    return randomBytes(64).toString('hex');
  }

  private hashRefreshToken(refreshToken: string): string {
    return createHash('sha256').update(refreshToken).digest('hex');
  }

  private getRefreshTokenExpiresAt(): Date {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_TTL_DAYS);
    return expiresAt;
  }
}
