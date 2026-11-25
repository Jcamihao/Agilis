import { NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { hashInviteToken } from '../invites/invite-token';
import { hashResetToken, RESET_INVALID_MESSAGE } from './password-reset-token';

type Row = Record<string, any>;

const matches = (row: Row, where: Record<string, any>) =>
  Object.entries(where).every(([k, v]) => {
    if (v === null) return row[k] == null;
    if (v && typeof v === 'object' && 'gt' in v) return row[k] > v.gt;
    return row[k] === v;
  });

const DAY = 86_400_000;

const build = () => {
  const invites: Row[] = [];
  const memberships: Row[] = [];
  const companies: Row[] = [{ id: 'acme', name: 'Acme', users: [] }];

  const prisma: any = {
    user: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn(async ({ data }) => ({ id: 'u-new', ...data })),
    },
    company: {
      create: jest.fn(async ({ data }) => ({ id: 'c-new', name: data.name, users: [] })),
      findUniqueOrThrow: jest.fn(async ({ where }) => companies.find((c) => c.id === where.id)),
    },
    companyInvite: {
      findFirst: jest.fn(async ({ where }) => invites.find((r) => matches(r, where)) ?? null),
    },
    userCompany: {
      create: jest.fn(async ({ data }) => {
        memberships.push({ ...data });
        return data;
      }),
      findFirst: jest.fn(async ({ where }) => memberships.find((m) => matches(m, where)) ?? null),
    },
  };
  prisma.$transaction = jest.fn(async (fn) => fn(prisma));

  const jwt: any = { sign: jest.fn(() => 'jwt') };
  const config: any = { get: jest.fn((_k: string, d?: string) => d ?? 'x') };
  const mail: any = { send: jest.fn().mockResolvedValue(undefined) };
  const service = new AuthService(prisma, jwt, config, {} as any, mail);

  const addInvite = (token: string, extra: Partial<Row> = {}) =>
    invites.push({
      companyId: 'acme',
      tokenHash: hashInviteToken(token),
      expiresAt: new Date(Date.now() + DAY),
      revokedAt: null,
      ...extra,
    });

  return { service, prisma, memberships, addInvite };
};

const dto = (extra: Partial<RegisterDto> = {}): RegisterDto =>
  ({ name: 'Bia', email: 'bia@x.com', password: 'Senha@123', companyName: 'Outra Ltda', ...extra }) as RegisterDto;

describe('AuthService.register com inviteToken', () => {
  it('valid token: no new company, user joins invite company as MEMBER', async () => {
    const { service, prisma, memberships, addInvite } = build();
    addInvite('convite-ok');

    const res = await service.register(dto({ inviteToken: 'convite-ok' }));

    expect(prisma.company.create).not.toHaveBeenCalled();
    expect(memberships).toEqual([{ userId: 'u-new', companyId: 'acme', role: 'MEMBER' }]);
    expect(res.user.companies).toHaveLength(1);
    expect(res.user.companies[0]).toMatchObject({ companyId: 'acme', role: 'MEMBER', company: { id: 'acme', name: 'Acme' } });
    expect(res.accessToken).toBe('jwt');
  });

  it.each([
    ['desconhecido', null],
    ['expirado', { expiresAt: new Date(Date.now() - DAY) }],
    ['revogado', { revokedAt: new Date(Date.now() - DAY) }],
  ])('invalid token (%s): 404 and no user created', async (_, extra) => {
    const { service, prisma, addInvite } = build();
    if (extra) addInvite('token-ruim', extra);

    await expect(service.register(dto({ inviteToken: 'token-ruim' }))).rejects.toThrow(NotFoundException);
    await expect(service.register(dto({ inviteToken: 'token-ruim' }))).rejects.toThrow('Convite inválido ou expirado');
    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(prisma.company.create).not.toHaveBeenCalled();
  });

  it('without token: keeps the old flow, new company with user as OWNER', async () => {
    const { service, prisma, memberships } = build();

    await service.register(dto());

    expect(prisma.company.create).toHaveBeenCalledTimes(1);
    expect(prisma.company.create.mock.calls[0][0].data.users.create).toEqual({ userId: 'u-new', role: 'OWNER' });
    expect(memberships).toEqual([]);
  });
});

// ── Recuperação de senha ─────────────────────────────────────────────────────

const buildReset = (user: Row | null) => {
  const b = build();
  const { service, prisma } = b;
  const tokens: Row[] = [];
  prisma.user.findUnique = jest.fn(async ({ where }: any) =>
    where.email !== undefined ? user : null,
  );
  prisma.user.update = jest.fn(async ({ where, data }) => ({ id: where.id, ...data }));
  prisma.passwordResetToken = {
    deleteMany: jest.fn(async ({ where }) => {
      const n = tokens.filter((t) => t.userId === where.userId && t.usedAt === null).length;
      for (let i = tokens.length - 1; i >= 0; i--)
        if (tokens[i].userId === where.userId && tokens[i].usedAt === null) tokens.splice(i, 1);
      return { count: n };
    }),
    create: jest.fn(async ({ data }) => { tokens.push({ id: 't1', usedAt: null, ...data }); return data; }),
    findFirst: jest.fn(async ({ where }) => tokens.find((t) => matches(t, where)) ?? null),
    update: jest.fn(async ({ where, data }) => {
      const row = tokens.find((t) => t.id === where.id);
      if (row) Object.assign(row, data);
      return row;
    }),
  };
  const mailSend = (service as any).mail.send as jest.Mock;
  return { service, prisma, tokens, mailSend };
};

describe('AuthService.forgotPassword', () => {
  it('existing email: stores only the hash, sends one email with the raw token in the link', async () => {
    const { service, tokens, mailSend } = buildReset({ id: 'u1', email: 'bia@x.com' });

    await service.forgotPassword({ email: 'bia@x.com' } as any);

    expect(tokens).toHaveLength(1);
    expect(tokens[0].tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(tokens[0].expiresAt.getTime()).toBeGreaterThan(Date.now() + 55 * 60_000);
    expect(mailSend).toHaveBeenCalledTimes(1);
    const link = String(mailSend.mock.calls[0][0].html);
    expect(link).toMatch(/redefinir-senha\/[A-Za-z0-9_-]{43}/);
    expect(link).not.toContain(tokens[0].tokenHash);
  });

  it('unknown email: no token, no email, no error (never reveals registration)', async () => {
    const { service, tokens, mailSend } = buildReset(null);

    await expect(service.forgotPassword({ email: 'ninguem@x.com' } as any)).resolves.toBeUndefined();
    expect(tokens).toHaveLength(0);
    expect(mailSend).not.toHaveBeenCalled();
  });

  it('second request replaces the previous unused token (one valid link per user)', async () => {
    const { service, tokens } = buildReset({ id: 'u1', email: 'bia@x.com' });

    await service.forgotPassword({ email: 'bia@x.com' } as any);
    await service.forgotPassword({ email: 'bia@x.com' } as any);

    expect(tokens).toHaveLength(1);
  });
});

describe('AuthService.resetPassword', () => {
  const setup = () => {
    const ctx = buildReset({ id: 'u1', email: 'bia@x.com' });
    const raw = 'TOKEN-CRU-DE-TESTE';
    ctx.tokens.push({ id: 't1', userId: 'u1', tokenHash: hashResetToken(raw), expiresAt: new Date(Date.now() + DAY), usedAt: null });
    return { ...ctx, raw };
  };

  it('valid token: changes password, marks usedAt and invalidates older sessions', async () => {
    const { service, prisma, tokens, raw } = setup();

    await service.resetPassword({ token: raw, password: 'SenhaNova@123' } as any);

    expect(prisma.user.update).toHaveBeenCalledTimes(1);
    const data = prisma.user.update.mock.calls[0][0].data;
    expect(data.tokensInvalidBefore).toBeInstanceOf(Date);
    expect(await bcrypt.compare('SenhaNova@123', data.password)).toBe(true);
    expect(tokens[0].usedAt).toBeInstanceOf(Date);
  });

  it('rejects unknown token without touching the user', async () => {
    const { service, prisma } = setup();

    await expect(service.resetPassword({ token: 'token-inexistente', password: 'SenhaNova@123' } as any))
      .rejects.toThrow(RESET_INVALID_MESSAGE);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('rejects expired token without touching the user', async () => {
    const { service, prisma, tokens, raw } = setup();
    tokens[0].expiresAt = new Date(Date.now() - DAY);

    await expect(service.resetPassword({ token: raw, password: 'SenhaNova@123' } as any))
      .rejects.toThrow(RESET_INVALID_MESSAGE);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('used token cannot be replayed', async () => {
    const { service, prisma, raw } = setup();

    await service.resetPassword({ token: raw, password: 'SenhaNova@123' } as any);
    await expect(service.resetPassword({ token: raw, password: 'Outra@123' } as any))
      .rejects.toThrow(RESET_INVALID_MESSAGE);
    expect(prisma.user.update).toHaveBeenCalledTimes(1);
  });
});
