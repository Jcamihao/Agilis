import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RiskImpact, RiskProbability, RiskStatus, RiskCategory } from '@prisma/client';

const IMPACT_SCORE: Record<RiskImpact, number> = {
  VERY_LOW: 1, LOW: 2, MEDIUM: 3, HIGH: 4, CRITICAL: 5,
};
const PROB_SCORE: Record<RiskProbability, number> = {
  VERY_LOW: 1, LOW: 2, MEDIUM: 3, HIGH: 4, VERY_HIGH: 5,
};

export interface CreateRiskDto {
  title: string;
  description?: string;
  category?: RiskCategory;
  impact?: RiskImpact;
  probability?: RiskProbability;
  status?: RiskStatus;
  ownerId?: string;
  mitigation?: string;
  dueDate?: string;
}

@Injectable()
export class RisksService {
  constructor(private readonly prisma: PrismaService) {}

  list(projectId: string) {
    return this.prisma.risk.findMany({
      where: { projectId },
      include: { owner: { select: { id: true, name: true, avatarUrl: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  create(projectId: string, dto: CreateRiskDto) {
    return this.prisma.risk.create({
      data: {
        projectId,
        title: dto.title,
        description: dto.description,
        category: dto.category ?? 'OTHER',
        impact: dto.impact ?? 'MEDIUM',
        probability: dto.probability ?? 'MEDIUM',
        status: dto.status ?? 'OPEN',
        ownerId: dto.ownerId || null,
        mitigation: dto.mitigation,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      },
      include: { owner: { select: { id: true, name: true, avatarUrl: true } } },
    });
  }

  update(id: string, dto: Partial<CreateRiskDto>) {
    return this.prisma.risk.update({
      where: { id },
      data: {
        ...dto,
        ownerId: dto.ownerId !== undefined ? (dto.ownerId || null) : undefined,
        dueDate: dto.dueDate !== undefined ? (dto.dueDate ? new Date(dto.dueDate) : null) : undefined,
      },
      include: { owner: { select: { id: true, name: true, avatarUrl: true } } },
    });
  }

  delete(id: string) {
    return this.prisma.risk.delete({ where: { id } });
  }

  async stats(projectId: string) {
    const risks = await this.prisma.risk.findMany({ where: { projectId } });

    const matrix: Record<string, string[]> = {};
    for (const r of risks) {
      const key = `${r.impact}__${r.probability}`;
      if (!matrix[key]) matrix[key] = [];
      matrix[key].push(r.id);
    }

    const byStatus = {
      OPEN:      risks.filter(r => r.status === 'OPEN').length,
      MITIGATED: risks.filter(r => r.status === 'MITIGATED').length,
      ACCEPTED:  risks.filter(r => r.status === 'ACCEPTED').length,
      CLOSED:    risks.filter(r => r.status === 'CLOSED').length,
    };

    const scored = risks.map(r => ({
      ...r,
      score: IMPACT_SCORE[r.impact] * PROB_SCORE[r.probability],
    }));

    const critical = scored.filter(r => r.score >= 15 && r.status === 'OPEN').length;
    const high     = scored.filter(r => r.score >= 10 && r.score < 15 && r.status === 'OPEN').length;

    return { total: risks.length, byStatus, critical, high, matrix };
  }

  riskScore(impact: RiskImpact, probability: RiskProbability) {
    return IMPACT_SCORE[impact] * PROB_SCORE[probability];
  }
}
