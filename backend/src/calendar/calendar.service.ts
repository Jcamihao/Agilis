import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { startOfDay, endOfDay, eachDayOfInterval, format } from 'date-fns';
import * as crypto from 'crypto';

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

  async exportIcal(companyId: string): Promise<string> {
    const tasks = await this.prisma.task.findMany({
      where: { project: { companyId }, dueDate: { not: null } },
      include: {
        project: { select: { name: true } },
        assignee: { select: { name: true } },
      },
      orderBy: { dueDate: 'asc' },
      take: 2000,
    });

    const stamp = format(new Date(), "yyyyMMdd'T'HHmmss'Z'");
    const lines: string[] = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Agilis//Agilis Calendar//PT',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:Agilis',
      'X-WR-TIMEZONE:America/Sao_Paulo',
    ];

    for (const task of tasks) {
      if (!task.dueDate) continue;
      const uid = crypto.createHash('md5').update(task.id).digest('hex');
      const due = format(new Date(task.dueDate), "yyyyMMdd");
      const title = this.escapeIcal(task.title);
      const desc  = this.escapeIcal(`[${task.project.name}] Prioridade: ${task.priority} | Status: ${task.status}`);
      const assignee = task.assignee?.name ? `ORGANIZER;CN=${task.assignee.name}:MAILTO:noreply@agilis.app\r\n` : '';
      lines.push(
        'BEGIN:VEVENT',
        `UID:${uid}@agilis`,
        `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${due}`,
        `DTEND;VALUE=DATE:${due}`,
        `SUMMARY:${title}`,
        `DESCRIPTION:${desc}`,
        ...(assignee ? [assignee.trimEnd()] : []),
        'END:VEVENT',
      );
    }

    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  }

  private escapeIcal(v: string): string {
    return v.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
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
