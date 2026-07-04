import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  // ── Rooms ──────────────────────────────────────────────────────────────────

  async listRooms(companyId: string) {
    return this.prisma.chatRoom.findMany({
      where: { companyId },
      include: {
        project: { select: { id: true, name: true } },
        _count: { select: { messages: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getOrCreateGeneralRoom(companyId: string) {
    let room = await this.prisma.chatRoom.findFirst({
      where: { companyId, type: 'GENERAL' },
    });
    if (!room) {
      room = await this.prisma.chatRoom.create({
        data: { companyId, name: 'Geral', type: 'GENERAL' },
      });
    }
    return room;
  }

  async getOrCreateProjectRoom(companyId: string, projectId: string, projectName: string) {
    let room = await this.prisma.chatRoom.findFirst({
      where: { companyId, projectId, type: 'PROJECT' },
    });
    if (!room) {
      room = await this.prisma.chatRoom.create({
        data: { companyId, projectId, name: projectName, type: 'PROJECT' },
      });
    }
    return room;
  }

  // ── Messages ───────────────────────────────────────────────────────────────

  async getMessages(roomId: string, limit = 50, before?: string) {
    const messages = await this.prisma.chatMessage.findMany({
      where: {
        roomId,
        deletedAt: null,
        ...(before ? { createdAt: { lt: new Date(before) } } : {}),
      },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return messages.reverse();
  }

  async createMessage(roomId: string, userId: string, content: string) {
    return this.prisma.chatMessage.create({
      data: { roomId, userId, content },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
    });
  }

  async editMessage(messageId: string, userId: string, content: string) {
    const msg = await this.prisma.chatMessage.findUnique({ where: { id: messageId } });
    if (!msg) throw new NotFoundException('Mensagem não encontrada');
    if (msg.userId !== userId) throw new ForbiddenException();
    return this.prisma.chatMessage.update({
      where: { id: messageId },
      data: { content, editedAt: new Date() },
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    });
  }

  async deleteMessage(messageId: string, userId: string) {
    const msg = await this.prisma.chatMessage.findUnique({ where: { id: messageId } });
    if (!msg) throw new NotFoundException();
    if (msg.userId !== userId) throw new ForbiddenException();
    return this.prisma.chatMessage.update({
      where: { id: messageId },
      data: { deletedAt: new Date() },
    });
  }

  async markRead(roomId: string, userId: string) {
    await this.prisma.chatRoomMember.upsert({
      where: { roomId_userId: { roomId, userId } },
      update: { lastReadAt: new Date() },
      create: { roomId, userId },
    });
  }

  // ── Presence (delegates to RedisService) ──────────────────────────────────

  setOnline(userId: string) {
    return this.redis.setPresence(userId, 'ONLINE');
  }

  setOffline(userId: string) {
    return this.redis.setPresence(userId, 'OFFLINE');
  }

  getOnlineUsers(userIds: string[]) {
    return this.redis.getManyPresence(userIds);
  }
}
