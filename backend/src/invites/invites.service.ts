import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { findActiveInvite, generateInviteToken, hashInviteToken } from './invite-token';

const DAY_MS = 86_400_000;

@Injectable()
export class InvitesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(companyId: string, userId: string, expiresInDays = 7) {
    await this.checkAdminAccess(companyId, userId);

    const token = generateInviteToken();
    const invite = await this.prisma.companyInvite.create({
      data: {
        companyId,
        createdById: userId,
        tokenHash: hashInviteToken(token),
        expiresAt: new Date(Date.now() + expiresInDays * DAY_MS),
      },
      select: { id: true, expiresAt: true },
    });

    return { id: invite.id, token, expiresAt: invite.expiresAt };
  }

  async list(companyId: string, userId: string) {
    await this.checkAdminAccess(companyId, userId);

    return this.prisma.companyInvite.findMany({
      where: { companyId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        createdAt: true,
        expiresAt: true,
        createdBy: { select: { id: true, name: true } },
      },
    });
  }

  async revoke(id: string, userId: string) {
    const invite = await this.prisma.companyInvite.findUnique({
      where: { id },
      select: { id: true, companyId: true, revokedAt: true },
    });
    if (!invite) throw new NotFoundException('Convite não encontrado');

    await this.checkAdminAccess(invite.companyId, userId);

    if (!invite.revokedAt) {
      await this.prisma.companyInvite.update({ where: { id }, data: { revokedAt: new Date() } });
    }
    return { revoked: true };
  }

  async preview(token: string) {
    const invite = await findActiveInvite(this.prisma, token);
    return { companyName: invite.company.name, invitedBy: invite.createdBy.name };
  }

  async accept(token: string, userId: string) {
    const invite = await findActiveInvite(this.prisma, token);
    const { companyId } = invite;

    const existing = await this.prisma.userCompany.findUnique({
      where: { userId_companyId: { userId, companyId } },
      select: { id: true },
    });
    if (existing) return { companyId, alreadyMember: true };

    try {
      await this.prisma.userCompany.create({ data: { userId, companyId, role: 'MEMBER' } });
    } catch (err) {
      // Corrida: dois aceites ao mesmo tempo. O segundo vira "já é membro".
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        return { companyId, alreadyMember: true };
      }
      throw err;
    }
    return { companyId, alreadyMember: false };
  }

  // Mesma regra de UsersService.checkAdminAccess (OWNER ou ADMIN da empresa).
  private async checkAdminAccess(companyId: string, userId: string) {
    const m = await this.prisma.userCompany.findFirst({
      where: { companyId, userId, role: { in: ['OWNER', 'ADMIN'] } },
    });
    if (!m) throw new ForbiddenException('Apenas admins podem gerenciar membros');
  }
}
