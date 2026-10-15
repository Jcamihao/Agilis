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
  forecastDate: string | null;
  forecastDays: number | null;
  dailyVelocity: number;
}

@Injectable({ providedIn: 'root' })
export class PortfolioService {
  private readonly api = inject(ApiService);

  getPortfolio(companyId: string) {
    return this.api.get<PortfolioProject[]>('/projects/portfolio', { companyId });
  }
}
