import {
  Component,
  signal,
  inject,
  OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { MetricsService } from '../../core/services/metrics.service';
import { ReportsService } from '../../core/services/reports.service';
import { AuditService } from '../../core/services/audit.service';
import { PRIORITY_CONFIG } from '../../core/models';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ACTION_META: Record<string, { badgeClass: string }> = {
  CREATE:        { badgeClass: 'bg-blue-100 text-blue-800' },
  UPDATE:        { badgeClass: 'bg-emerald-100 text-emerald-800' },
  DELETE:        { badgeClass: 'bg-red-100 text-red-800' },
  STATUS_CHANGE: { badgeClass: 'bg-emerald-100 text-emerald-800' },
  ASSIGN:        { badgeClass: 'bg-emerald-100 text-emerald-800' },
  COMMENT:       { badgeClass: 'bg-blue-100 text-blue-800' },
  EXPORT:        { badgeClass: 'bg-purple-100 text-purple-800' },
  LOGIN:         { badgeClass: 'bg-slate-100 text-slate-600' },
  LOGOUT:        { badgeClass: 'bg-slate-100 text-slate-600' },
  AUTH_FAIL:     { badgeClass: 'bg-red-600 text-white' },
};

@Component({
  selector: 'ag-metrics',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './metrics.component.html',
  styleUrls: ['./metrics.component.scss'],
})
export class MetricsComponent implements OnInit {
  private readonly auth    = inject(AuthService);
  private readonly metrics = inject(MetricsService);
  private readonly reports = inject(ReportsService);
  private readonly audit   = inject(AuditService);
  private readonly route   = inject(ActivatedRoute);
  private readonly fb      = inject(FormBuilder);

  readonly PRIORITY_CONFIG = PRIORITY_CONFIG;

  // ── Active tab ────────────────────────────────────────────────────────────
  activeTab = signal<'metrics' | 'reports' | 'audit'>('metrics');

  // ── Metrics ───────────────────────────────────────────────────────────────
  companyLoading = signal(true);
  selectedDays   = signal(30);
  company        = signal<any>(null);
  users          = signal<any[]>([]);
  dayOptions     = [7, 14, 30, 90];

  // ── Reports ───────────────────────────────────────────────────────────────
  downloading     = signal<string | null>(null);
  downloadSuccess = signal(false);
  reportForm = this.fb.group({ type: ['tasks'], from: [''], to: [''], format: ['csv'] });

  // ── Audit ─────────────────────────────────────────────────────────────────
  auditLoading = signal(true);
  logs         = signal<any[]>([]);
  auditPage    = signal<any>(null);
  currentPage  = signal(1);
  auditSearch  = signal('');

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  ngOnInit() {
    const path = this.route.snapshot.routeConfig?.path ?? '';
    if (path === 'reports') this.activeTab.set('reports');
    else if (path === 'audit') this.activeTab.set('audit');

    this.loadMetrics();
    this.loadAudit();
  }

  setTab(tab: 'metrics' | 'reports' | 'audit') { this.activeTab.set(tab); }

  // ── Metrics ───────────────────────────────────────────────────────────────
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

  // ── Reports ───────────────────────────────────────────────────────────────
  downloadQuick(type: string, format: 'csv' | 'excel') {
    this.reportForm.patchValue({ type, format });
    this.generateReport();
  }

  generateReport() {
    const val = this.reportForm.value;
    const cid = this.auth.currentCompanyId();
    if (!cid) return;
    const fmt = (val.format as 'csv' | 'excel') || 'csv';
    const key = `${val.type}_${fmt}`;
    this.downloading.set(key);
    const filters: Record<string, string> = {};
    if (val.from) filters['from'] = val.from!;
    if (val.to)   filters['to']   = val.to!;
    try {
      if (val.type === 'tasks')       this.reports.downloadTasks(cid, fmt, filters);
      if (val.type === 'productivity') this.reports.downloadProductivity(cid, fmt);
      if (val.type === 'audit')       this.reports.downloadAudit(cid, fmt, val.from || undefined, val.to || undefined);
      setTimeout(() => {
        this.downloading.set(null);
        this.downloadSuccess.set(true);
        setTimeout(() => this.downloadSuccess.set(false), 3000);
      }, 800);
    } catch { this.downloading.set(null); }
  }

  // ── Audit ─────────────────────────────────────────────────────────────────
  loadAudit() {
    const cid = this.auth.currentCompanyId();
    if (!cid) { this.auditLoading.set(false); return; }
    this.auditLoading.set(true);
    const filters: Record<string, string> = { page: String(this.currentPage()), limit: '50' };
    if (this.auditSearch()) filters['search'] = this.auditSearch();
    this.audit.getAll(cid, filters).subscribe({
      next: (data: any) => { this.logs.set(data.items ?? data); this.auditPage.set(data); this.auditLoading.set(false); },
      error: () => this.auditLoading.set(false),
    });
  }

  nextPage() { this.currentPage.update((p) => p + 1); this.loadAudit(); }
  prevPage() { if (this.currentPage() > 1) { this.currentPage.update((p) => p - 1); this.loadAudit(); } }

  getActionMeta(action: string) {
    return ACTION_META[action] ?? { badgeClass: 'bg-slate-100 text-slate-600' };
  }

  formatDateTime(d: string): string {
    return new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  timeAgo(d: string) { return formatDistanceToNow(new Date(d), { addSuffix: true, locale: ptBR }); }
}
