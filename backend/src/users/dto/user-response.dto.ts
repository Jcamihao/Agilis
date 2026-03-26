import { Role, User } from '@prisma/client';

type UserResponseSource = Pick<
  User,
  'id' | 'name' | 'email' | 'role' | 'organizationId' | 'createdAt' | 'updatedAt'
>;

export class UserResponseDto {
  id!: string;
  name!: string;
  email!: string;
  role!: Role;
  organizationId!: string;
  createdAt!: Date;
  updatedAt!: Date;

  static fromUser(user: UserResponseSource): UserResponseDto {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
