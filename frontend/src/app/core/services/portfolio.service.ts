import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';

export interface PortfolioProject {
  id: string;
  name: string;
  color: string;
  icon: string;
  total: number;
  done: number;
  overdue: number;
  progress: number;
  memberCount: number;
  riskCount: number;
  health: { score: number; grade: string } | null;
  forecastDate: string | null;
  forecastDays: number | null;
  dailyVelocity: number;
  okrProgress: number | null;
}

export interface ProjectForecast {
  projectId: string;
  projectName: string;
  totalTasks: number;
  doneTasks: number;
  remaining: number;
  progress: number;
  dailyVelocity: number;
  weeklyVelocity: number;
  forecastDays: number | null;
  forecastDate: string | null;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

@Injectable({ providedIn: 'root' })
export class PortfolioService {
  private readonly api = inject(ApiService);

  getPortfolio(companyId: string) {
    return this.api.get<PortfolioProject[]>('/projects/portfolio', { companyId });
  }

  getForecast(projectId: string) {
    return this.api.get<ProjectForecast>(`/projects/${projectId}/forecast`);
  }
}
