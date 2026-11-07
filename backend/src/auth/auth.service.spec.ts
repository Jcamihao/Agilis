import { NotFoundException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { hashInviteToken } from '../invites/invite-token';

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
  const service = new AuthService(prisma, jwt, config, {} as any);

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
