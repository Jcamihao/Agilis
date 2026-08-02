import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';

export type RiskImpact      = 'VERY_LOW' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type RiskProbability = 'VERY_LOW' | 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
export type RiskStatus      = 'OPEN' | 'MITIGATED' | 'ACCEPTED' | 'CLOSED';
export type RiskCategory    = 'TECHNICAL' | 'SCHEDULE' | 'BUDGET' | 'RESOURCE' | 'EXTERNAL' | 'QUALITY' | 'OTHER';

export interface Risk {
  id:          string;
  projectId:   string;
  title:       string;
  description: string | null;
  category:    RiskCategory;
  impact:      RiskImpact;
  probability: RiskProbability;
  status:      RiskStatus;
  ownerId:     string | null;
  mitigation:  string | null;
  dueDate:     string | null;
  createdAt:   string;
  owner?:      { id: string; name: string; avatar: string | null } | null;
}

export interface RiskStats {
  total:    number;
  byStatus: Record<RiskStatus, number>;
  critical: number;
  high:     number;
  matrix:   Record<string, string[]>;
}

export interface CreateRiskDto {
  title:       string;
  description?: string;
  category?:   RiskCategory;
  impact?:     RiskImpact;
  probability?: RiskProbability;
  status?:     RiskStatus;
  ownerId?:    string;
  mitigation?: string;
  dueDate?:    string;
}

@Injectable({ providedIn: 'root' })
export class RisksService {
  private readonly api = inject(ApiService);

  list(projectId: string)                         { return this.api.get<Risk[]>(`/projects/${projectId}/risks`); }
  stats(projectId: string)                        { return this.api.get<RiskStats>(`/projects/${projectId}/risks/stats`); }
  create(projectId: string, dto: CreateRiskDto)   { return this.api.post<Risk>(`/projects/${projectId}/risks`, dto); }
  update(projectId: string, id: string, dto: Partial<CreateRiskDto>) {
    return this.api.patch<Risk>(`/projects/${projectId}/risks/${id}`, dto);
  }
  delete(projectId: string, id: string) {
    return this.api.delete<void>(`/projects/${projectId}/risks/${id}`);
  }

  readonly IMPACT_LABELS: Record<RiskImpact, string> = {
    VERY_LOW: 'Mínimo', LOW: 'Baixo', MEDIUM: 'Médio', HIGH: 'Alto', CRITICAL: 'Crítico',
  };
  readonly PROB_LABELS: Record<RiskProbability, string> = {
    VERY_LOW: 'Muito Baixa', LOW: 'Baixa', MEDIUM: 'Média', HIGH: 'Alta', VERY_HIGH: 'Muito Alta',
  };
  readonly STATUS_LABELS: Record<RiskStatus, string> = {
    OPEN: 'Aberto', MITIGATED: 'Mitigado', ACCEPTED: 'Aceito', CLOSED: 'Fechado',
  };
  readonly CATEGORY_LABELS: Record<RiskCategory, string> = {
    TECHNICAL: 'Técnico', SCHEDULE: 'Cronograma', BUDGET: 'Orçamento',
    RESOURCE: 'Recursos', EXTERNAL: 'Externo', QUALITY: 'Qualidade', OTHER: 'Outro',
  };

  readonly IMPACT_ORDER: RiskImpact[]      = ['VERY_LOW','LOW','MEDIUM','HIGH','CRITICAL'];
  readonly PROB_ORDER: RiskProbability[]   = ['VERY_LOW','LOW','MEDIUM','HIGH','VERY_HIGH'];

  scoreOf(impact: RiskImpact, prob: RiskProbability): number {
    return (this.IMPACT_ORDER.indexOf(impact) + 1) * (this.PROB_ORDER.indexOf(prob) + 1);
  }

  colorOf(score: number): string {
    if (score >= 15) return '#dc2626';   // critical — red
    if (score >= 9)  return '#f97316';   // high — orange
    if (score >= 5)  return '#eab308';   // medium — yellow
    return '#22c55e';                    // low — green
  }
}
