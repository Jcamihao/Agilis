import { ConflictException, Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { MySettingsResponseDto } from './dto/my-settings-response.dto';
import { UpdateMySettingsDto } from './dto/update-my-settings.dto';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getMine(user: AuthenticatedUser): Promise<MySettingsResponseDto> {
    const persistedUser = await this.prisma.user.findFirstOrThrow({
      where: {
        id: user.id,
        organizationId: user.organizationId,
      },
    });

    const settings = await this.ensureSettings(user.id);

    return MySettingsResponseDto.fromValues(persistedUser, settings);
  }

  async updateMine(
    user: AuthenticatedUser,
    dto: UpdateMySettingsDto,
  ): Promise<MySettingsResponseDto> {
    if (dto.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: {
          email: dto.email,
        },
      });

      if (existingUser && existingUser.id !== user.id) {
        throw new ConflictException('Ja existe um usuario com este email.');
      }
    }

    const [updatedUser, settings] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          ...(dto.name ? { name: dto.name } : {}),
          ...(dto.email ? { email: dto.email } : {}),
        },
      }),
      this.prisma.userSettings.upsert({
        where: {
          userId: user.id,
        },
        create: {
          userId: user.id,
          timezone: dto.timezone ?? 'America/Sao_Paulo',
          density: dto.density ?? 'Comfortable',
          appearance: dto.appearance ?? 'dark',
          autosave: dto.autosave ?? false,
          twoFactor: dto.twoFactor ?? false,
        },
        update: {
          ...(dto.timezone ? { timezone: dto.timezone } : {}),
          ...(dto.density ? { density: dto.density } : {}),
          ...(dto.appearance ? { appearance: dto.appearance } : {}),
          ...(dto.autosave !== undefined ? { autosave: dto.autosave } : {}),
          ...(dto.twoFactor !== undefined ? { twoFactor: dto.twoFactor } : {}),
        },
      }),
    ]);

    return MySettingsResponseDto.fromValues(updatedUser, settings);
  }

  private ensureSettings(userId: string) {
    return this.prisma.userSettings.upsert({
      where: {
        userId,
      },
      create: {
        userId,
      },
      update: {},
    });
  }
}
