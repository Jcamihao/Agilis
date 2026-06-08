import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IsOptional, IsString, MinLength } from 'class-validator';
import * as bcrypt from 'bcryptjs';

export class UpdateProfileDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() bio?: string;
  @IsOptional() @IsString() avatarUrl?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() telegramChatId?: string;
  @IsOptional() @IsString() cpfCnpj?: string;
  @IsOptional() @IsString() cep?: string;
  @IsOptional() @IsString() uf?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() addressNumber?: string;
  @IsOptional() @IsString() addressComplement?: string;
  @IsOptional() @IsString() currentPassword?: string;
  @IsOptional() @IsString() @MinLength(8) newPassword?: string;
}

export class InviteMemberDto {
  email!: string;
  name?: string;
  role?: 'ADMIN' | 'MEMBER' | 'VIEWER';
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        bio: true,
        createdAt: true,
        companies: { include: { company: true } },
        teamMemberships: { include: { team: true } },
        _count: { select: { assignedTasks: true, createdTasks: true } },
      },
    });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return user;
  }

  async updateProfile(id: string, dto: UpdateProfileDto) {
    const data: any = {};
    if (dto.name) data.name = dto.name;
    if (dto.bio !== undefined) data.bio = dto.bio;
    if (dto.avatarUrl !== undefined) data.avatarUrl = dto.avatarUrl;
    if (dto.phone            !== undefined) data.phone             = dto.phone;
    if (dto.telegramChatId  !== undefined) data.telegramChatId    = dto.telegramChatId;
    if (dto.cpfCnpj         !== undefined) data.cpfCnpj           = dto.cpfCnpj;
    if (dto.cep             !== undefined) data.cep               = dto.cep;
    if (dto.uf              !== undefined) data.uf                = dto.uf;
    if (dto.address         !== undefined) data.address           = dto.address;
    if (dto.addressNumber   !== undefined) data.addressNumber     = dto.addressNumber;
    if (dto.addressComplement !== undefined) data.addressComplement = dto.addressComplement;

    if (dto.currentPassword && dto.newPassword) {
      const user = await this.prisma.user.findUnique({ where: { id } });
      const isValid = await bcrypt.compare(dto.currentPassword, user.password);
      if (!isValid) throw new Error('Senha atual incorreta');
      data.password = await bcrypt.hash(dto.newPassword, 10);
    }

    return this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true, name: true, email: true, avatarUrl: true, bio: true,
        phone: true, telegramChatId: true,
        cpfCnpj: true, cep: true, uf: true, address: true, addressNumber: true, addressComplement: true,
      },
    });
  }

  // ── Company members with roles ────────────────────────────────────────────
  async findCompanyMembers(companyId: string) {
    return this.prisma.user.findMany({
      where: { companies: { some: { companyId } } },
      select: { id: true, name: true, email: true, avatarUrl: true },
    });
  }

  async findCompanyMembersWithRoles(companyId: string) {
    const memberships = await this.prisma.userCompany.findMany({
      where: { companyId },
      include: {
        user: {
          select: {
            id: true, name: true, email: true, avatarUrl: true, createdAt: true,
            _count: { select: { assignedTasks: true } },
            teamMemberships: { where: { team: { companyId } }, include: { team: { select: { id: true, name: true, color: true } } } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    return memberships.map((m) => ({ ...m.user, role: m.role, membershipId: m.id, joinedAt: m.createdAt }));
  }

  async inviteMember(companyId: string, dto: InviteMemberDto, requesterId: string) {
    await this.checkAdminAccess(companyId, requesterId);

    let user = await this.prisma.user.findUnique({ where: { email: dto.email } });

    if (!user) {
      const tempPassword = await bcrypt.hash(`Agilis@${Date.now()}`, 10);
      user = await this.prisma.user.create({
        data: {
          name: dto.name || dto.email.split('@')[0],
          email: dto.email,
          password: tempPassword,
        },
      });
    } else {
      const existing = await this.prisma.userCompany.findFirst({ where: { companyId, userId: user.id } });
      if (existing) throw new ConflictException('Usuário já é membro desta organização');
    }

    await this.prisma.userCompany.create({
      data: { userId: user.id, companyId, role: (dto.role || 'MEMBER') as any },
    });

    return this.findCompanyMembersWithRoles(companyId);
  }

  async removeMember(companyId: string, targetUserId: string, requesterId: string) {
    await this.checkAdminAccess(companyId, requesterId);

    const membership = await this.prisma.userCompany.findFirst({ where: { companyId, userId: targetUserId } });
    if (!membership) throw new NotFoundException('Membro não encontrado');
    if (membership.role === 'OWNER') throw new ForbiddenException('Não é possível remover o proprietário');

    await this.prisma.userCompany.delete({ where: { id: membership.id } });
    return this.findCompanyMembersWithRoles(companyId);
  }

  async updateMemberRole(companyId: string, targetUserId: string, role: string, requesterId: string) {
    await this.checkAdminAccess(companyId, requesterId);

    const membership = await this.prisma.userCompany.findFirst({ where: { companyId, userId: targetUserId } });
    if (!membership) throw new NotFoundException('Membro não encontrado');
    if (membership.role === 'OWNER') throw new ForbiddenException('Não é possível alterar o papel do proprietário');

    await this.prisma.userCompany.update({ where: { id: membership.id }, data: { role: role as any } });
    return this.findCompanyMembersWithRoles(companyId);
  }

  private async checkAdminAccess(companyId: string, userId: string) {
    const m = await this.prisma.userCompany.findFirst({ where: { companyId, userId, role: { in: ['OWNER', 'ADMIN'] } } });
    if (!m) throw new ForbiddenException('Apenas admins podem gerenciar membros');
  }
}
