import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash } from 'crypto';
import { InvitesService } from './invites.service';
import { hashInviteToken } from './invite-token';

type Row = Record<string, any>;

// Aplica o subset de operadores do Prisma usado pelo service (valor, null, gt, in).
const matches = (row: Row, where: Record<string, any>) =>
  Object.entries(where).every(([k, v]) => {
    if (v === null) return row[k] == null;
    if (v && typeof v === 'object' && 'gt' in v) return row[k] > v.gt;
    if (v && typeof v === 'object' && 'in' in v) return v.in.includes(row[k]);
    return row[k] === v;
  });

const DAY = 86_400_000;
const future = () => new Date(Date.now() + DAY);
const past = () => new Date(Date.now() - DAY);

const build = () => {
  const invites: Row[] = [];
  const memberships: Row[] = [];

  const prisma: any = {
    companyInvite: {
      create: jest.fn(async ({ data }) => {
        const row = { id: `inv-${invites.length + 1}`, createdAt: new Date(), revokedAt: null, company: { id: data.companyId, name: 'Acme' }, createdBy: { name: 'Ana' }, ...data };
        invites.push(row);
        return { id: row.id, expiresAt: row.expiresAt };
      }),
      findMany: jest.fn(async ({ where }) =>
        invites
          .filter((r) => matches(r, where))
          .map((r) => ({ id: r.id, createdAt: r.createdAt, expiresAt: r.expiresAt, createdBy: { id: r.createdById, name: r.createdBy.name } })),
      ),
      findFirst: jest.fn(async ({ where }) => invites.find((r) => matches(r, where)) ?? null),
      findUnique: jest.fn(async ({ where }) => invites.find((r) => r.id === where.id) ?? null),
      update: jest.fn(async ({ where, data }) => Object.assign(invites.find((r) => r.id === where.id), data)),
    },
    userCompany: {
      findFirst: jest.fn(async ({ where }) => memberships.find((m) => matches(m, where)) ?? null),
      findUnique: jest.fn(async ({ where }) => {
        const { userId, companyId } = where.userId_companyId;
        return memberships.find((m) => m.userId === userId && m.companyId === companyId) ?? null;
      }),
      create: jest.fn(async ({ data }) => {
        memberships.push({ ...data });
        return data;
      }),
    },
  };

  const addInvite = (token: string, extra: Partial<Row> = {}) => {
    const row = {
      id: `inv-${invites.length + 1}`,
      companyId: 'c1',
      createdById: 'admin1',
      tokenHash: hashInviteToken(token),
      expiresAt: future(),
      revokedAt: null,
      createdAt: new Date(),
      company: { id: 'c1', name: 'Acme' },
      createdBy: { name: 'Ana' },
      ...extra,
    };
    invites.push(row);
    return row;
  };

  const addMember = (userId: string, companyId: string, role: string) => memberships.push({ userId, companyId, role });

  addMember('admin1', 'c1', 'ADMIN');
  addMember('member1', 'c1', 'MEMBER');

  return { service: new InvitesService(prisma), prisma, invites, memberships, addInvite, addMember };
};

describe('InvitesService.create', () => {
  it('returns the raw token once and stores only its sha256 hash', async () => {
    const { service, prisma } = build();

    const res = await service.create('c1', 'admin1');

    expect(res.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const data = prisma.companyInvite.create.mock.calls[0][0].data;
    expect(data.tokenHash).toBe(createHash('sha256').update(res.token).digest('hex'));
    expect(data).not.toHaveProperty('token');
    expect(JSON.stringify(data)).not.toContain(res.token);
  });

  it('defaults to 7 days and honors 1 and 30', async () => {
    const { service } = build();
    const now = Date.now();

    const def = await service.create('c1', 'admin1');
    const one = await service.create('c1', 'admin1', 1);
    const thirty = await service.create('c1', 'admin1', 30);

    expect(def.expiresAt.getTime()).toBeGreaterThanOrEqual(now + 7 * DAY - 1000);
    expect(def.expiresAt.getTime()).toBeLessThanOrEqual(now + 7 * DAY + 5000);
    expect(one.expiresAt.getTime() - now).toBeLessThan(2 * DAY);
    expect(thirty.expiresAt.getTime() - now).toBeGreaterThan(29 * DAY);
  });

  it('refuses non-admin members with 403', async () => {
    const { service, prisma } = build();

    await expect(service.create('c1', 'member1')).rejects.toThrow(ForbiddenException);
    await expect(service.create('c1', 'member1')).rejects.toThrow('Apenas admins podem gerenciar membros');
    expect(prisma.companyInvite.create).not.toHaveBeenCalled();
  });
});

describe('InvitesService.list', () => {
  it('returns only active invites, without token or hash', async () => {
    const { service, prisma, addInvite } = build();
    addInvite('ativo', { id: 'ativo' });
    addInvite('revogado', { id: 'revogado', revokedAt: past() });
    addInvite('expirado', { id: 'expirado', expiresAt: past() });

    const list = await service.list('c1', 'admin1');

    expect(list.map((i) => i.id)).toEqual(['ativo']);
    expect(Object.keys(list[0]).sort()).toEqual(['createdAt', 'createdBy', 'expiresAt', 'id']);
    expect(JSON.stringify(list)).not.toContain('tokenHash');
    const { select } = prisma.companyInvite.findMany.mock.calls[0][0];
    expect(select).not.toHaveProperty('tokenHash');
    expect(select).not.toHaveProperty('token');
  });

  it('refuses non-admin members with 403', async () => {
    const { service } = build();

    await expect(service.list('c1', 'member1')).rejects.toThrow(ForbiddenException);
  });
});

describe('InvitesService.revoke', () => {
  it('sets revokedAt and answers { revoked: true }', async () => {
    const { service, invites, addInvite } = build();
    addInvite('t', { id: 'inv-x' });

    await expect(service.revoke('inv-x', 'admin1')).resolves.toEqual({ revoked: true });
    expect(invites.find((i) => i.id === 'inv-x')?.revokedAt).toBeInstanceOf(Date);
  });

  it('answers the same again when already revoked, without rewriting', async () => {
    const { service, prisma, addInvite } = build();
    addInvite('t', { id: 'inv-x', revokedAt: past() });

    await expect(service.revoke('inv-x', 'admin1')).resolves.toEqual({ revoked: true });
    expect(prisma.companyInvite.update).not.toHaveBeenCalled();
  });

  it('returns 404 when the invite does not exist', async () => {
    const { service } = build();

    await expect(service.revoke('nao-existe', 'admin1')).rejects.toThrow(NotFoundException);
  });

  it('refuses admins of another company and non-admin members with 403', async () => {
    const { service, invites, addInvite, addMember } = build();
    addMember('admin2', 'c2', 'OWNER');
    addInvite('t', { id: 'inv-x' });

    await expect(service.revoke('inv-x', 'admin2')).rejects.toThrow(ForbiddenException);
    await expect(service.revoke('inv-x', 'member1')).rejects.toThrow(ForbiddenException);
    expect(invites.find((i) => i.id === 'inv-x')?.revokedAt).toBeNull();
  });

  it('checks admin on the company that owns the invite, not on the caller company', async () => {
    const { service, invites, addInvite, addMember } = build();
    addMember('admin2', 'c2', 'OWNER');
    addInvite('t', { id: 'inv-c2', companyId: 'c2' });

    // admin1 é admin só de c1; o convite é de c2.
    await expect(service.revoke('inv-c2', 'admin1')).rejects.toThrow(ForbiddenException);
    expect(invites.find((i) => i.id === 'inv-c2')?.revokedAt).toBeNull();
    await expect(service.revoke('inv-c2', 'admin2')).resolves.toEqual({ revoked: true });
  });

  it('does not let an admin of another company list invites of this one', async () => {
    const { service, addMember } = build();
    addMember('admin2', 'c2', 'OWNER');

    await expect(service.list('c1', 'admin2')).rejects.toThrow(ForbiddenException);
  });
});

describe('InvitesService.preview', () => {
  it('returns company name and inviter name for a valid token', async () => {
    const { service, addInvite } = build();
    addInvite('valido');

    await expect(service.preview('valido')).resolves.toEqual({ companyName: 'Acme', invitedBy: 'Ana' });
  });

  it.each([
    ['desconhecido', null],
    ['expirado', { expiresAt: past() }],
    ['revogado', { revokedAt: past() }],
  ])('answers 404 "Convite inválido ou expirado" for %s token', async (_, extra) => {
    const { service, addInvite } = build();
    if (extra) addInvite('token-ruim', extra);

    await expect(service.preview('token-ruim')).rejects.toThrow(NotFoundException);
    await expect(service.preview('token-ruim')).rejects.toThrow('Convite inválido ou expirado');
  });
});

describe('InvitesService.accept', () => {
  it('adds the user as MEMBER of the invite company', async () => {
    const { service, memberships, addInvite } = build();
    addInvite('valido');

    await expect(service.accept('valido', 'novo')).resolves.toEqual({ companyId: 'c1', alreadyMember: false });
    expect(memberships).toContainEqual({ userId: 'novo', companyId: 'c1', role: 'MEMBER' });
  });

  it('is idempotent: already a member gives alreadyMember true and creates nothing', async () => {
    const { service, prisma, addInvite } = build();
    addInvite('valido');

    await expect(service.accept('valido', 'member1')).resolves.toEqual({ companyId: 'c1', alreadyMember: true });
    expect(prisma.userCompany.create).not.toHaveBeenCalled();
  });

  it('treats a unique-constraint race as already a member', async () => {
    const { service, prisma, addInvite } = build();
    addInvite('valido');
    prisma.userCompany.create.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: '5.22.0' }),
    );

    await expect(service.accept('valido', 'novo')).resolves.toEqual({ companyId: 'c1', alreadyMember: true });
  });

  it.each([
    ['desconhecido', null],
    ['expirado', { expiresAt: past() }],
    ['revogado', { revokedAt: past() }],
  ])('answers 404 and adds nobody for %s token', async (_, extra) => {
    const { service, prisma, addInvite } = build();
    if (extra) addInvite('token-ruim', extra);

    await expect(service.accept('token-ruim', 'novo')).rejects.toThrow('Convite inválido ou expirado');
    expect(prisma.userCompany.create).not.toHaveBeenCalled();
  });
});
