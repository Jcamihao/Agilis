import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: { sub: string; email: string; jti?: string; iat?: number }) {
    if (payload.jti && await this.redis.isBlacklisted(payload.jti)) {
      throw new UnauthorizedException('Token revogado');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        tokensInvalidBefore: true,
        companies: { include: { company: true } },
      },
    });

    if (!user) throw new UnauthorizedException('Token inválido');
    // Redefinição de senha marca um corte: tokens emitidos antes dele não servem mais.
    // Comparação em segundos inteiros (iat é truncado): sobrevive no máximo o token emitido
    // no mesmo segundo do reset — não dá para rejeitar login feito logo depois do reset.
    if (user.tokensInvalidBefore && payload.iat) {
      if (payload.iat < Math.floor(user.tokensInvalidBefore.getTime() / 1000)) {
        throw new UnauthorizedException('Sessão encerrada. Entre de novo.');
      }
    }
    const companyId = user.companies[0]?.companyId;
    if (!companyId) throw new UnauthorizedException('Usuário sem empresa vinculada');

    return {
      ...user,
      userId: user.id,
      companyId,
    };
  }
}
