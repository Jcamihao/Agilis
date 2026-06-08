import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redis: RedisService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        companies: { include: { company: true } },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const tokens = this.generateTokens(user.id, user.email);

    const { password, ...userWithoutPassword } = user;

    return {
      ...tokens,
      user: userWithoutPassword,
    };
  }

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email já cadastrado');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const slug = dto.companyName
      ? dto.companyName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')
      : `empresa-${Date.now()}`;

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name:             dto.name,
          email:            dto.email,
          password:         hashedPassword,
          phone:            dto.phone            ?? null,
          cpfCnpj:          dto.cpfCnpj          ?? null,
          cep:              dto.cep              ?? null,
          uf:               dto.uf               ?? null,
          address:          dto.address          ?? null,
          addressNumber:    dto.addressNumber    ?? null,
          addressComplement:dto.addressComplement?? null,
        },
      });

      const company = await tx.company.create({
        data: {
          name: dto.companyName || `Empresa de ${dto.name}`,
          slug: `${slug}-${user.id.slice(0, 8)}`,
          users: {
            create: { userId: user.id, role: 'OWNER' },
          },
        },
        include: { users: true },
      });

      return { user, company };
    });

    const tokens = this.generateTokens(result.user.id, result.user.email);
    const { password, ...userWithoutPassword } = result.user;

    const userCompany = await this.prisma.userCompany.findFirst({
      where: { userId: result.user.id, companyId: result.company.id },
      include: { company: true },
    });

    return {
      ...tokens,
      user: {
        ...userWithoutPassword,
        companies: [{ ...userCompany, company: result.company }],
      },
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        companies: { include: { company: true } },
        teamMemberships: { include: { team: true } },
      },
    });

    if (!user) throw new UnauthorizedException('Usuário não encontrado');

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async logout(token: string): Promise<void> {
    try {
      const decoded = this.jwtService.decode(token) as any;
      if (!decoded?.jti || !decoded?.exp) return;
      const ttl = decoded.exp - Math.floor(Date.now() / 1000);
      if (ttl > 0) await this.redis.blacklistToken(decoded.jti, ttl);
    } catch {}
  }

  private generateTokens(userId: string, email: string) {
    const jti = randomUUID();
    const expiresIn = this.configService.get('JWT_EXPIRES_IN', '7d');

    const accessToken = this.jwtService.sign(
      { sub: userId, email, jti },
      { secret: this.configService.get('JWT_SECRET'), expiresIn },
    );

    return { accessToken };
  }
}
