import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateAttachmentDto {
  taskId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
}

@Injectable()
export class AttachmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findByTask(taskId: string) {
    return this.prisma.attachment.findMany({
      where: { taskId },
      include: { uploadedBy: { select: { id: true, name: true, avatarUrl: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(dto: CreateAttachmentDto, userId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: dto.taskId },
      include: { project: true },
    });
    if (!task) throw new NotFoundException('Tarefa não encontrada');

    const membership = await this.prisma.userCompany.findFirst({
      where: { companyId: task.project.companyId, userId },
    });
    if (!membership) throw new ForbiddenException('Sem acesso');

    return this.prisma.attachment.create({
      data: { ...dto, uploadedById: userId },
      include: { uploadedBy: { select: { id: true, name: true } } },
    });
  }

  async delete(id: string, userId: string) {
    const attachment = await this.prisma.attachment.findUnique({
      where: { id },
      include: { task: { include: { project: true } } },
    });
    if (!attachment) throw new NotFoundException('Anexo não encontrado');

    const isOwner = attachment.uploadedById === userId;
    const isAdmin = await this.prisma.userCompany.findFirst({
      where: { companyId: attachment.task.project.companyId, userId, role: { in: ['OWNER', 'ADMIN'] } },
    });
    if (!isOwner && !isAdmin) throw new ForbiddenException('Sem permissão');

    return this.prisma.attachment.delete({ where: { id } });
  }
}
