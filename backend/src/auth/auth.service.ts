import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { MailService } from '../mail/mail.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { findActiveInvite } from '../invites/invite-token';
import { generateResetToken, hashResetToken, RESET_INVALID_MESSAGE } from './password-reset-token';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redis: RedisService,
    private readonly mail: MailService,
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
      // Token inválido lança 404 aqui, antes de qualquer insert: nenhum usuário é criado.
      const invite = dto.inviteToken ? await findActiveInvite(tx, dto.inviteToken) : null;

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

      if (invite) {
        // Convidado: não cria empresa nova; entra na empresa do convite como MEMBER.
        await tx.userCompany.create({
          data: { userId: user.id, companyId: invite.companyId, role: 'MEMBER' },
        });
        const company = await tx.company.findUniqueOrThrow({
          where: { id: invite.companyId },
          include: { users: true },
        });
        return { user, company };
      }

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

  // Resposta idêntica com e-mail existente ou não: nunca revelar cadastro.
  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true, email: true },
    });
    if (!user) return;

    const rawToken = generateResetToken();
    await this.prisma.$transaction(async (tx) => {
      // Um único token válido por usuário: os anteriores deixam de funcionar.
      await tx.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });
      await tx.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: hashResetToken(rawToken),
          expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hora
        },
      });
    });

    const appUrl = this.configService.get<string>('APP_BASE_URL', 'http://localhost:4200').replace(/\/$/, '');
    const link = `${appUrl}/redefinir-senha/${rawToken}`;
    await this.mail.send({
      to: user.email,
      subject: 'Redefinição de senha — Agilis',
      html: `<p>Recebemos um pedido para redefinir a senha da sua conta Agilis.</p>
<p><a href="${link}">Redefinir minha senha</a></p>
<p>Este link expira em 1 hora e só pode ser usado uma vez. Se você não pediu isso, ignore este e-mail — sua senha atual continua valendo.</p>`,
    });
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const tokenHash = hashResetToken(dto.token);
    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      const token = await tx.passwordResetToken.findFirst({
        where: { tokenHash, usedAt: null, expiresAt: { gt: now } },
      });
      if (!token) throw new BadRequestException(RESET_INVALID_MESSAGE);

      await tx.user.update({
        where: { id: token.userId },
        // tokensInvalidBefore derruba todos os JWT emitidos antes daqui (sessões em outros dispositivos).
        data: { password: hashedPassword, tokensInvalidBefore: now },
      });
      await tx.passwordResetToken.update({ where: { id: token.id }, data: { usedAt: now } });
    });
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
