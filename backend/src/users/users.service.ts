import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UserResponseDto } from './dto/user-response.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findByIdWithinOrganization(
    userId: string,
    organizationId: string,
  ): Promise<User> {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        organizationId,
      },
    });

    if (!user) {
      throw new NotFoundException('Usuario nao encontrado nesta organizacao.');
    }

    return user;
  }

  async findAllByOrganization(organizationId: string): Promise<UserResponseDto[]> {
    const users = await this.prisma.user.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'asc' },
    });

    return users.map((user) => UserResponseDto.fromUser(user));
  }

  async create(
    organizationId: string,
    actor: AuthenticatedUser,
    dto: CreateUserDto,
  ): Promise<UserResponseDto> {
    this.assertCanManageRole(actor.role, dto.role);

    const existingUser = await this.findByEmail(dto.email);

    if (existingUser) {
      throw new ConflictException('Ja existe um usuario com este email.');
    }

    const password = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        password,
        role: dto.role,
        organizationId,
      },
    });

    return UserResponseDto.fromUser(user);
  }

  async updateRole(
    organizationId: string,
    actor: AuthenticatedUser,
    userId: string,
    role: Role,
  ): Promise<UserResponseDto> {
    this.assertCanManageRole(actor.role, role);

    const targetUser = await this.findByIdWithinOrganization(userId, organizationId);

    if (targetUser.id === actor.id && role !== actor.role) {
      throw new ForbiddenException('Voce nao pode alterar o proprio papel.');
    }

    if (actor.role === Role.MANAGER && targetUser.role !== Role.USER) {
      throw new ForbiddenException('Gestores so podem alterar usuarios comuns.');
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { role },
    });

    return UserResponseDto.fromUser(user);
  }

  private assertCanManageRole(actorRole: Role, targetRole: Role): void {
    if (actorRole === Role.ADMIN) {
      return;
    }

    if (actorRole === Role.MANAGER && targetRole === Role.USER) {
      return;
    }

    throw new ForbiddenException('Voce nao possui permissao para gerenciar este papel.');
  }
}
