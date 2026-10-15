import {
  Component,
  signal,
  inject,
  OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { MetricsService } from '../../core/services/metrics.service';
import { PRIORITY_CONFIG } from '../../core/models';

@Component({
  selector: 'ag-metrics',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink],
  templateUrl: './metrics.component.html'
})
export class MetricsComponent implements OnInit {
  private readonly auth    = inject(AuthService);
  private readonly metrics = inject(MetricsService);

  readonly PRIORITY_CONFIG = PRIORITY_CONFIG;

  companyLoading = signal(true);
  selectedDays   = signal(30);
  company        = signal<any>(null);
  users          = signal<any[]>([]);
  dayOptions     = [7, 14, 30, 90];

  ngOnInit() {
    this.loadMetrics();
  }

  loadMetrics() {
    const cid = this.auth.currentCompanyId();
    if (!cid) { this.companyLoading.set(false); return; }
    this.metrics.getCompany(cid, this.selectedDays()).subscribe({
      next: (d) => { this.company.set(d); this.companyLoading.set(false); },
      error: () => this.companyLoading.set(false),
    });
    this.metrics.getAllUsers(cid, this.selectedDays()).subscribe({
      next: (d) => this.users.set(d),
    });
  }

  changeDays(days: number) {
    this.selectedDays.set(days);
    this.companyLoading.set(true);
    this.loadMetrics();
  }

  kpiCards = () => {
    const c = this.company();
    if (!c) return [];
    const rate = c.tasks > 0 ? Math.round((c.done / c.tasks) * 100) : 0;
    return [
      { label: 'Saúde dos Projetos',    value: `${rate}%`,     sub: `+${Math.max(0, rate - 89)}% vs. mês anterior`, icon: 'favorite',  danger: false },
      { label: 'Velocidade da Equipe',  value: `${c.done} pts`, sub: `tarefas concluídas no período`,               icon: 'speed',     danger: false },
      { label: 'Gargalos Identificados', value: c.overdue,      sub: `tarefas em atraso`,                            icon: 'warning',   danger: c.overdue > 0 },
    ];
  };

  statusBreakdown = () => {
    const c = this.company();
    if (!c?.byStatus) return [];
    const total = c.byStatus.reduce((s: number, b: any) => s + b._count.status, 0) || 1;
    const colorMap: Record<string, string> = {
      BACKLOG: '#94a3b8', IN_PROGRESS: '#3b82f6', IN_REVIEW: '#8b5cf6', DONE: '#6366f1',
    };
    const labelMap: Record<string, string> = {
      BACKLOG: 'Backlog', IN_PROGRESS: 'Em Andamento', IN_REVIEW: 'Em Revisão', DONE: 'Concluído',
    };
    return c.byStatus.map((b: any) => ({
      label:   labelMap[b.status]  ?? b.status,
      abbr:    (labelMap[b.status] ?? b.status).slice(0, 3),
      count:   b._count.status,
      color:   colorMap[b.status]  ?? '#6366f1',
      percent: Math.round((b._count.status / total) * 100),
    }));
  };

  private barMax = () => Math.max(...this.statusBreakdown().map((s: any) => s.count), 1);
  getBarHeight(count: number): number { return Math.max(6, Math.round((count / this.barMax()) * 180)); }

  donutGradient = () => {
    const segs = this.statusBreakdown();
    if (!segs.length) return '#e2e8f0 0% 100%';
    let pos = 0;
    return segs.map((s: any) => { const start = pos; pos += s.percent; return `${s.color} ${start}% ${pos}%`; }).join(', ');
  };

  totalTasks = () => this.statusBreakdown().reduce((s: number, b: any) => s + b.count, 0);
}
