import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

const ONLINE_TTL = 35; // seconds
const ONLINE_KEY = (userId: string) => `chat:online:${userId}`;

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
    const cursor = before ? { createdAt: new Date(before) } : undefined;
    const messages = await this.prisma.chatMessage.findMany({
      where: {
        roomId,
        deletedAt: null,
        ...(cursor ? { createdAt: { lt: cursor.createdAt } } : {}),
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

  // ── Online presence ────────────────────────────────────────────────────────

  async setOnline(userId: string) {
    await this.redis.client.set(ONLINE_KEY(userId), '1', 'EX', ONLINE_TTL);
  }

  async setOffline(userId: string) {
    await this.redis.client.del(ONLINE_KEY(userId));
  }

  async refreshOnline(userId: string) {
    await this.redis.client.expire(ONLINE_KEY(userId), ONLINE_TTL);
  }

  async getOnlineUsers(userIds: string[]): Promise<string[]> {
    if (!userIds.length) return [];
    const pipeline = this.redis.client.pipeline();
    for (const id of userIds) pipeline.exists(ONLINE_KEY(id));
    const results = await pipeline.exec();
    return userIds.filter((_, i) => results?.[i]?.[1] === 1);
  }
}
