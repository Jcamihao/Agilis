import { UsersService } from './users.service';

const BASE_PROFILE = {
  id: 'u1', name: 'Alice', email: 'alice@test.com',
  avatarUrl: null, bio: null, phone: null, telegramChatId: null,
  notifPreferences: null, cpfCnpj: null, cep: null, uf: null,
  address: null, addressNumber: null, addressComplement: null,
};

function makeService(prismaOverrides: Partial<{ user: any }> = {}) {
  const prisma = {
    user: {
      findUnique: jest.fn().mockResolvedValue({ ...BASE_PROFILE, password: 'hashed' }),
      update: jest.fn().mockImplementation((args: any) =>
        Promise.resolve({ ...BASE_PROFILE, ...args.data }),
      ),
      ...prismaOverrides.user,
    },
  };
  return { service: new UsersService(prisma as any), prisma };
}

describe('UsersService', () => {
  describe('updateProfile', () => {
    it('updates name when provided', async () => {
      const { service, prisma } = makeService();

      await service.updateProfile('u1', { name: 'Bob' });

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ name: 'Bob' }) }),
      );
    });

    it('persists notifPreferences as-is', async () => {
      const { service, prisma } = makeService();
      const prefs = { telegram: { taskCreated: true, taskAssigned: false, taskDueSoon: true } };

      await service.updateProfile('u1', { notifPreferences: prefs });

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ notifPreferences: prefs }) }),
      );
    });

    it('does not include notifPreferences when not provided', async () => {
      const { service, prisma } = makeService();

      await service.updateProfile('u1', { name: 'Carol' });

      const callData = prisma.user.update.mock.calls[0][0].data;
      expect(callData).not.toHaveProperty('notifPreferences');
    });

    it('includes telegramChatId when provided', async () => {
      const { service, prisma } = makeService();

      await service.updateProfile('u1', { telegramChatId: '9876543210' });

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ telegramChatId: '9876543210' }) }),
      );
    });

    it('throws when current password is wrong', async () => {
      const bcrypt = await import('bcryptjs');
      const hashed = await bcrypt.hash('correct', 10);

      const { service } = makeService({
        user: { findUnique: jest.fn().mockResolvedValue({ ...BASE_PROFILE, password: hashed }) },
      });

      await expect(
        service.updateProfile('u1', { currentPassword: 'wrong', newPassword: 'NewPass123!' }),
      ).rejects.toThrow('Senha atual incorreta');
    });

    it('hashes new password when current password is correct', async () => {
      const bcrypt = await import('bcryptjs');
      const hashed = await bcrypt.hash('correct', 10);
      const { service, prisma } = makeService({
        user: { findUnique: jest.fn().mockResolvedValue({ ...BASE_PROFILE, password: hashed }) },
      });
      prisma.user.update = jest.fn().mockResolvedValue(BASE_PROFILE);

      await service.updateProfile('u1', { currentPassword: 'correct', newPassword: 'NewPass123!' });

      const saved = prisma.user.update.mock.calls[0][0].data.password;
      const isValid = await bcrypt.compare('NewPass123!', saved);
      expect(isValid).toBe(true);
    });
  });
});
