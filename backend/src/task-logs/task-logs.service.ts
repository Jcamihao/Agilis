import { Injectable } from '@nestjs/common';
import { TaskLog } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskLogInput } from './interfaces/create-task-log.input';

@Injectable()
export class TaskLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateTaskLogInput): Promise<TaskLog> {
    const client = input.client ?? this.prisma;

    return client.taskLog.create({
      data: {
        taskId: input.taskId,
        organizationId: input.organizationId,
        action: input.action,
        description: input.description,
        fromStatus: input.fromStatus,
        toStatus: input.toStatus,
        performedById: input.performedById,
      },
    });
  }
}
