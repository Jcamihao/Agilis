import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { startOfDay, endOfDay, eachDayOfInterval, format } from 'date-fns';

@Injectable()
export class CalendarService {
  constructor(private readonly prisma: PrismaService) {}

  async getRange(companyId: string, userId: string, startDate: string, endDate: string) {
    const start = startOfDay(new Date(startDate));
    const end = endOfDay(new Date(endDate));

    const tasks = await this.prisma.task.findMany({
      where: {
        project: { companyId },
        dueDate: { gte: start, lte: end },
        OR: [
          { assigneeId: userId },
          { creatorId: userId },
        ],
      },
      include: {
        project: { select: { id: true, name: true, color: true } },
        assignee: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { dueDate: 'asc' },
    });

    // Agrupar por dia (YYYY-MM-DD)
    const grouped: Record<string, typeof tasks> = {};

    const allDays = eachDayOfInterval({ start, end });
    for (const day of allDays) {
      grouped[format(day, 'yyyy-MM-dd')] = [];
    }

    for (const task of tasks) {
      if (!task.dueDate) continue;
      const key = format(new Date(task.dueDate), 'yyyy-MM-dd');
      if (grouped[key]) {
        grouped[key].push(task);
      }
    }

    return {
      start: startDate,
      end: endDate,
      tasks,
      grouped,
    };
  }

  async getUpcoming(userId: string, companyId: string, days = 7) {
    const start = startOfDay(new Date());
    const end = endOfDay(new Date(Date.now() + days * 86_400_000));

    return this.prisma.task.findMany({
      where: {
        project: { companyId },
        assigneeId: userId,
        dueDate: { gte: start, lte: end },
        status: { not: 'DONE' },
      },
      include: {
        project: { select: { id: true, name: true, color: true } },
      },
      orderBy: { dueDate: 'asc' },
    });
  }
}
