import { Component, signal, inject, computed, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { PortfolioService, PortfolioProject } from '../../core/services/portfolio.service';
import { AiService } from '../../core/services/ai.service';

type SortKey = 'name' | 'progress' | 'overdue' | 'health' | 'forecast';

@Component({
  selector: 'ag-portfolio',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './portfolio.component.html',
  styleUrls: ['./portfolio.component.scss'],
})
export class PortfolioComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly portfolioSvc = inject(PortfolioService);
  private readonly aiSvc = inject(AiService);

  loading = signal(true);
  projects = signal<PortfolioProject[]>([]);
  sortKey = signal<SortKey>('progress');
  sortAsc = signal(false);
  briefLoading = signal(false);
  brief = signal<any>(null);
  showBrief = signal(false);
  search = signal('');

  sorted = computed(() => {
    const q = this.search().toLowerCase();
    let list = q ? this.projects().filter((p) => p.name.toLowerCase().includes(q)) : this.projects().slice();
    const key = this.sortKey();
    list.sort((a, b) => {
      let av: any, bv: any;
      if (key === 'name')     { av = a.name;        bv = b.name; }
      if (key === 'progress') { av = a.progress;     bv = b.progress; }
      if (key === 'overdue')  { av = a.overdue;      bv = b.overdue; }
      if (key === 'health')   { av = a.health?.score ?? -1; bv = b.health?.score ?? -1; }
      if (key === 'forecast') { av = a.forecastDays ?? 9999; bv = b.forecastDays ?? 9999; }
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return this.sortAsc() ? cmp : -cmp;
    });
    return list;
  });

  kpis = computed(() => {
    const ps = this.projects();
    if (!ps.length) return null;
    return {
      totalProjects:  ps.length,
      avgProgress:    Math.round(ps.reduce((s, p) => s + p.progress, 0) / ps.length),
      totalOverdue:   ps.reduce((s, p) => s + p.overdue, 0),
      atRisk:         ps.filter((p) => p.overdue > 0 || (p.health && p.health.score < 50)).length,
      onTrack:        ps.filter((p) => p.progress >= 70 && p.overdue === 0).length,
    };
  });

  ngOnInit() { this.load(); }

  load() {
    const companyId = this.auth.currentCompanyId();
    if (!companyId) { this.loading.set(false); return; }
    this.loading.set(true);

    this.portfolioSvc.getPortfolio(companyId).subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : (res?.data ?? []);
        this.projects.set(list);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  sort(key: SortKey) {
    if (this.sortKey() === key) this.sortAsc.update((v) => !v);
    else { this.sortKey.set(key); this.sortAsc.set(false); }
  }

  generateBrief() {
    const companyId = this.auth.currentCompanyId();
    if (!companyId) return;
    this.briefLoading.set(true);
    this.showBrief.set(true);

    this.aiSvc.strategicBrief(companyId).subscribe({
      next: (res: any) => {
        this.brief.set(res?.data ?? res);
        this.briefLoading.set(false);
      },
      error: () => this.briefLoading.set(false),
    });
  }

  healthColor(score: number): string {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#f59e0b';
    if (score >= 40) return '#f97316';
    return '#ef4444';
  }

  progressColor(pct: number): string {
    if (pct >= 80) return '#10b981';
    if (pct >= 50) return '#6366f1';
    if (pct >= 25) return '#f59e0b';
    return '#ef4444';
  }

  forecastLabel(days: number | null): string {
    if (days === null) return '—';
    if (days <= 0) return 'Concluído';
    if (days <= 7) return `${days}d`;
    if (days <= 30) return `${Math.round(days / 7)}sem`;
    return `${Math.round(days / 30)}m`;
  }
}
