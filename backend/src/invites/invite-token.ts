import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';

export const INVITE_INVALID_MESSAGE = 'Convite inválido ou expirado';

// Token cru só existe na resposta de criação. O banco guarda apenas o hash.
export const generateInviteToken = (): string => randomBytes(32).toString('base64url');

export const hashInviteToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex');

// Busca um convite ativo (não revogado e não expirado) pelo token cru.
// Expiração e revogação são checadas na própria query, nunca depois em JS.
// Usada pelo InvitesService e pelo cadastro (AuthService), dentro da mesma transação quando houver.
export async function findActiveInvite(
  db: Pick<Prisma.TransactionClient, 'companyInvite'>,
  token: string,
) {
  const invite = await db.companyInvite.findFirst({
    where: {
      tokenHash: hashInviteToken(token),
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    select: {
      id: true,
      companyId: true,
      company: { select: { id: true, name: true } },
      createdBy: { select: { name: true } },
    },
  });

  if (!invite) throw new NotFoundException(INVITE_INVALID_MESSAGE);
  return invite;
}
