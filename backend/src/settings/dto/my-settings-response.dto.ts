import { Role, User, UserSettings } from '@prisma/client';

type UserSource = Pick<
  User,
  'id' | 'name' | 'email' | 'role' | 'organizationId' | 'createdAt' | 'updatedAt'
>;

type SettingsSource = Pick<
  UserSettings,
  'timezone' | 'density' | 'appearance' | 'autosave' | 'twoFactor'
>;

export class MySettingsUserDto {
  id!: string;
  name!: string;
  email!: string;
  role!: Role;
  organizationId!: string;
  createdAt!: Date;
  updatedAt!: Date;
}

export class MySettingsDto {
  timezone!: string;
  density!: string;
  appearance!: string;
  autosave!: boolean;
  twoFactor!: boolean;
}

export class MySettingsResponseDto {
  user!: MySettingsUserDto;
  settings!: MySettingsDto;

  static fromValues(user: UserSource, settings: SettingsSource): MySettingsResponseDto {
    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      settings: {
        timezone: settings.timezone,
        density: settings.density,
        appearance: settings.appearance,
        autosave: settings.autosave,
        twoFactor: settings.twoFactor,
      },
    };
  }
}
