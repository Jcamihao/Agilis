import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface ErrorLogInput {
  source: 'SERVER' | 'CLIENT';
  message: string;
  stack?: string;
  method?: string;
  path?: string;
  userAgent?: string;
  companyId?: string;
}

/**
 * Telemetria do fundador (v3.16.0): eventos de uso + erros persistentes.
 * Nunca derruba a requisição chamada: toda gravação é fire-and-forget com catch.
 * Erros com a mesma assinatura (message+path) dentro de 60s são ignorados para
 * o log não virar negação de serviço do próprio banco numa tempestade de erro.
 */
@Injectable()
export class TelemetryService {
  private readonly logger = new Logger(TelemetryService.name);
  private static readonly DEDUPE_WINDOW_MS = 60_000;
  private static readonly DEDUPE_MAX = 500;
  private recentErrors = new Map<string, number>();

  constructor(private readonly prisma: PrismaService) {}

  track(event: string, opts: { companyId?: string; userId?: string; metadata?: Record<string, unknown> } = {}) {
    this.prisma.productEvent
      .create({ data: { event, companyId: opts.companyId, userId: opts.userId, metadata: (opts.metadata as any) ?? undefined } })
      .catch((err) => this.logger.warn(`evento ${event} não gravado: ${(err as Error).message}`));
  }

  logError(input: ErrorLogInput) {
    const message = (input.message || 'sem mensagem').slice(0, 2000);
    const key = `${input.source}|${message}|${input.path ?? ''}`;
    const now = Date.now();
    const last = this.recentErrors.get(key);
    if (last && now - last < TelemetryService.DEDUPE_WINDOW_MS) return;
    this.recentErrors.set(key, now);
    if (this.recentErrors.size > TelemetryService.DEDUPE_MAX) {
      // descarta os mais antigos para o mapa não crescer sem limite
      const oldest = [...this.recentErrors.entries()].sort((a, b) => a[1] - b[1]).slice(0, 100);
      for (const [k] of oldest) this.recentErrors.delete(k);
    }

    this.prisma.errorLog
      .create({
        data: {
          source: input.source,
          message,
          stack: input.stack?.slice(0, 8000),
          method: input.method,
          path: input.path?.slice(0, 500),
          userAgent: input.userAgent?.slice(0, 300),
          companyId: input.companyId,
        },
      })
      .catch((err) => this.logger.warn(`erro não persistido: ${(err as Error).message}`));
  }

  // ── Leitura (endpoint só para OWNER/ADMIN da empresa) ─────────────────────

  async requireAdmin(companyId: string, userId: string) {
    const membership = await this.prisma.userCompany.findFirst({
      where: { companyId, userId, role: { in: ['OWNER', 'ADMIN'] } },
    });
    if (!membership) throw new ForbiddenException('Apenas admins veem o diagnóstico');
  }

  async recentErrorsList(days: number, limit: number) {
    const from = new Date(Date.now() - days * 86_400_000);
    const rows = await this.prisma.errorLog.groupBy({
      by: ['message', 'source'],
      where: { createdAt: { gte: from } },
      _count: { _all: true },
      _max: { createdAt: true },
      orderBy: [{ _max: { createdAt: 'desc' } }],
      take: limit,
    });
    const details = await this.prisma.errorLog.findMany({
      where: { createdAt: { gte: from } },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: { id: true, source: true, message: true, path: true, createdAt: true },
    });
    return { groups: rows, recent: details };
  }

  /** Contagem por evento nos últimos N dias — o dado do corte do dia 60. */
  async usageSummary(companyId: string, days: number) {
    const from = new Date(Date.now() - days * 86_400_000);
    const rows = await this.prisma.productEvent.groupBy({
      by: ['event'],
      where: { companyId, createdAt: { gte: from } },
      _count: { _all: true },
      _max: { createdAt: true },
      orderBy: [{ _count: { event: 'desc' } }],
    });
    const ai = await this.prisma.aiUsageLog.groupBy({
      by: ['feature'],
      where: { companyId, createdAt: { gte: from } },
      _count: { _all: true },
      _sum: { requestChars: true },
    });
    return { events: rows, ai };
  }

  /** Estado do banco para health check (Kuma). */
  async dbOk(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}
