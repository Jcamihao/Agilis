import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateAnnouncementDto {
  title:    string;
  content:  string;
  isPinned?: boolean;
}

@Injectable()
export class AnnouncementsService {
  constructor(private readonly prisma: PrismaService) {}

  list(companyId: string) {
    return this.prisma.announcement.findMany({
      where: { companyId },
      include: {
        author: { select: { id: true, name: true, avatarUrl: true } },
        reads:  { select: { userId: true } },
        _count: { select: { reads: true } },
      },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    });
  }

  create(companyId: string, authorId: string, dto: CreateAnnouncementDto) {
    return this.prisma.announcement.create({
      data: { companyId, authorId, title: dto.title, content: dto.content, isPinned: dto.isPinned ?? false },
      include: {
        author: { select: { id: true, name: true, avatarUrl: true } },
        reads:  { select: { userId: true } },
        _count: { select: { reads: true } },
      },
    });
  }

  update(id: string, dto: Partial<CreateAnnouncementDto>) {
    return this.prisma.announcement.update({
      where: { id },
      data: dto,
      include: {
        author: { select: { id: true, name: true, avatarUrl: true } },
        reads:  { select: { userId: true } },
        _count: { select: { reads: true } },
      },
    });
  }

  delete(id: string) {
    return this.prisma.announcement.delete({ where: { id } });
  }

  async markRead(announcementId: string, userId: string) {
    await this.prisma.announcementRead.upsert({
      where:  { announcementId_userId: { announcementId, userId } },
      create: { announcementId, userId },
      update: {},
    });
    return { ok: true };
  }

  async unreadCount(companyId: string, userId: string) {
    const total = await this.prisma.announcement.count({ where: { companyId } });
    const read  = await this.prisma.announcementRead.count({
      where: { userId, announcement: { companyId } },
    });
    return { unread: total - read };
  }
}
