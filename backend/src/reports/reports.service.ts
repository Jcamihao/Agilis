import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as ExcelJS from 'exceljs';

type ReportFormat = 'csv' | 'excel' | 'json';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Task Report ────────────────────────────────────────────────────────────

  async getTaskData(companyId: string, filters: {
    projectId?: string;
    assigneeId?: string;
    status?: string;
    priority?: string;
    from?: string;
    to?: string;
  } = {}) {
    const where: any = { project: { companyId } };
    if (filters.projectId)  where.projectId  = filters.projectId;
    if (filters.assigneeId) where.assigneeId = filters.assigneeId;
    if (filters.status)     where.status     = filters.status;
    if (filters.priority)   where.priority   = filters.priority;
    if (filters.from || filters.to) {
      where.createdAt = {};
      if (filters.from) where.createdAt.gte = new Date(filters.from);
      if (filters.to)   where.createdAt.lte = new Date(filters.to);
    }

    return this.prisma.task.findMany({
      where,
      include: {
        project:  { select: { name: true } },
        assignee: { select: { name: true, email: true } },
        creator:  { select: { name: true } },
        sla:      true,
        _count:   { select: { comments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async exportTasks(companyId: string, format: ReportFormat, filters: any = {}) {
    const tasks = await this.getTaskData(companyId, filters);

    const rows = tasks.map((t) => ({
      id:             t.id,
      title:          t.title,
      status:         t.status,
      priority:       t.priority,
      project:        t.project?.name ?? '',
      assignee:       t.assignee?.name ?? 'Sem responsável',
      assigneeEmail:  t.assignee?.email ?? '',
      creator:        t.creator?.name ?? '',
      dueDate:        t.dueDate ? t.dueDate.toLocaleDateString('pt-BR') : '',
      createdAt:      t.createdAt.toLocaleDateString('pt-BR'),
      updatedAt:      t.updatedAt.toLocaleDateString('pt-BR'),
      comments:       t._count.comments,
      slaBreached:    t.sla?.isBreached ? 'Sim' : 'Não',
      resolutionMin:  t.sla?.resolutionMinutes ?? '',
    }));

    if (format === 'csv')   return this.toCsv(rows);
    if (format === 'excel') return this.toExcel(rows, 'Tarefas');
    return { data: rows, total: rows.length };
  }

  // ── Productivity Report ────────────────────────────────────────────────────

  async exportProductivity(companyId: string, format: ReportFormat, days = 30) {
    const since = new Date(Date.now() - days * 86_400_000);

    const members = await this.prisma.userCompany.findMany({
      where: { companyId },
      include: { user: { select: { name: true, email: true } } },
    });

    const rows = await Promise.all(
      members.map(async (m) => {
        const [completed, total, overdue] = await Promise.all([
          this.prisma.task.count({ where: { assigneeId: m.userId, project: { companyId }, status: 'DONE', updatedAt: { gte: since } } }),
          this.prisma.task.count({ where: { assigneeId: m.userId, project: { companyId } } }),
          this.prisma.task.count({ where: { assigneeId: m.userId, project: { companyId }, dueDate: { lt: new Date() }, status: { not: 'DONE' } } }),
        ]);
        const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
        return {
          name:           m.user.name,
          email:          m.user.email,
          role:           m.role,
          total,
          completed,
          overdue,
          completionRate: `${rate}%`,
        };
      }),
    );

    rows.sort((a, b) => parseInt(b.completionRate) - parseInt(a.completionRate));

    if (format === 'csv')   return this.toCsv(rows);
    if (format === 'excel') return this.toExcel(rows, `Produtividade (${days} dias)`);
    return { data: rows, total: rows.length };
  }

  // ── Audit Report ───────────────────────────────────────────────────────────

  async exportAudit(companyId: string, format: ReportFormat, from?: string, to?: string) {
    const where: any = { companyId };
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to)   where.createdAt.lte = new Date(to);
    }

    const logs = await this.prisma.auditLog.findMany({
      where,
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 5000,
    });

    const rows = logs.map((l) => ({
      timestamp:  l.createdAt.toISOString(),
      user:       l.user.name,
      email:      l.user.email,
      action:     l.action,
      entityType: l.entityType,
      entityId:   l.entityId,
      ipAddress:  l.ipAddress ?? '',
    }));

    if (format === 'csv')   return this.toCsv(rows);
    if (format === 'excel') return this.toExcel(rows, 'Auditoria');
    return { data: rows, total: rows.length };
  }

  // ── Time Tracking Report ──────────────────────────────────────────────────

  async exportTimeTracking(companyId: string, format: ReportFormat, from?: string, to?: string) {
    const where: any = { companyId };
    if (from || to) {
      where.timestamp = {};
      if (from) where.timestamp.gte = new Date(from);
      if (to)   where.timestamp.lte = new Date(to);
    }

    const [entries, records] = await Promise.all([
      this.prisma.timeEntry.findMany({
        where: { task: { project: { companyId } }, ...(from || to ? { startedAt: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } } : {}) },
        include: {
          user: { select: { name: true, email: true } },
          task: { select: { title: true, project: { select: { name: true } } } },
        },
        orderBy: { startedAt: 'desc' },
        take: 5000,
      }),
      this.prisma.timeRecord.findMany({
        where,
        include: { user: { select: { name: true, email: true } } },
        orderBy: { timestamp: 'desc' },
        take: 5000,
      }),
    ]);

    const timeEntryRows = entries.map((e) => ({
      tipo:          'Apontamento de Tarefa',
      usuario:       e.user.name,
      email:         e.user.email,
      projeto:       e.task.project.name,
      tarefa:        e.task.title,
      inicio:        e.startedAt.toISOString(),
      fim:           e.endedAt?.toISOString() ?? '',
      duracaoMin:    e.durationMin ?? '',
      descricao:     e.description ?? '',
    }));

    const clockRows = records.map((r) => ({
      tipo:          r.type,
      usuario:       r.user.name,
      email:         r.user.email,
      projeto:       '',
      tarefa:        '',
      inicio:        r.timestamp.toISOString(),
      fim:           '',
      duracaoMin:    '',
      descricao:     r.note ?? '',
    }));

    const rows = [...timeEntryRows, ...clockRows].sort((a, b) => a.inicio.localeCompare(b.inicio));

    if (format === 'csv')   return this.toCsv(rows);
    if (format === 'excel') return this.toExcel(rows, 'Time Tracking');
    return { data: rows, total: rows.length };
  }

  // ── OKRs Report ────────────────────────────────────────────────────────────

  async exportOkrs(companyId: string, format: ReportFormat) {
    const objectives = await this.prisma.objective.findMany({
      where:   { companyId },
      include: {
        owner:      { select: { name: true, email: true } },
        keyResults: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const rows: Record<string, any>[] = [];
    for (const obj of objectives) {
      for (const kr of obj.keyResults) {
        const progress = kr.targetValue > 0
          ? Math.round(((kr.currentValue - kr.startValue) / (kr.targetValue - kr.startValue)) * 100)
          : 0;
        rows.push({
          objetivo:    obj.title,
          responsavel: obj.owner.name,
          email:       obj.owner.email,
          status:      obj.status,
          inicio:      obj.startDate.toLocaleDateString('pt-BR'),
          fim:         obj.endDate.toLocaleDateString('pt-BR'),
          keyResult:   kr.title,
          tipo:        kr.type,
          valorInicial: kr.startValue,
          valorAtual:  kr.currentValue,
          meta:        kr.targetValue,
          unidade:     kr.unit ?? '',
          progresso:   `${Math.max(0, Math.min(100, progress))}%`,
        });
      }
    }

    if (format === 'csv')   return this.toCsv(rows);
    if (format === 'excel') return this.toExcel(rows, 'OKRs');
    return { data: rows, total: rows.length };
  }

  // ── Format helpers ─────────────────────────────────────────────────────────

  private toCsv(rows: Record<string, any>[]): string {
    if (!rows.length) return '';
    const headers = Object.keys(rows[0]);
    const escape = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = [
      headers.join(','),
      ...rows.map((r) => headers.map((h) => escape(r[h])).join(',')),
    ];
    return lines.join('\n');
  }

  async toExcel(rows: Record<string, any>[], sheetName: string): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Agilis';
    wb.created = new Date();

    const ws = wb.addWorksheet(sheetName);

    if (!rows.length) return Buffer.from(await wb.xlsx.writeBuffer());

    const headers = Object.keys(rows[0]);

    ws.columns = headers.map((h) => ({
      header: h,
      key: h,
      width: Math.max(h.length + 4, 18),
    }));

    // Style header row
    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6366F1' } };
    ws.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
    ws.getRow(1).height = 24;

    for (const row of rows) ws.addRow(row);

    // Zebra striping
    ws.eachRow((row, i) => {
      if (i > 1 && i % 2 === 0) {
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFF' } };
      }
    });

    ws.autoFilter = { from: 'A1', to: `${String.fromCharCode(64 + headers.length)}1` };

    return Buffer.from(await wb.xlsx.writeBuffer());
  }
}
