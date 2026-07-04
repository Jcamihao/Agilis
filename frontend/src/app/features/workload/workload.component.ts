import {
  Component, OnInit, signal, inject, computed,
  ChangeDetectionStrategy, ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WorkloadService, WorkloadOverview, MemberWorkload } from '../../core/services/workload.service';
import { ProjectsService } from '../../core/services/projects.service';
import { ToastService } from '../../core/services/toast.service';
import { AuthService } from '../../core/services/auth.service';
import { Project } from '../../core/models';

@Component({
  selector: 'ag-workload',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  templateUrl: './workload.component.html',
  styleUrls: ['./workload.component.scss'],
})
export class WorkloadComponent implements OnInit {
  private readonly svc      = inject(WorkloadService);
  private readonly projSvc  = inject(ProjectsService);
  private readonly toast    = inject(ToastService);
  private readonly auth     = inject(AuthService);
  private readonly cdr      = inject(ChangeDetectorRef);

  loading     = signal(true);
  suggesting  = signal(false);
  overview    = signal<WorkloadOverview | null>(null);
  projects    = signal<Project[]>([]);
  filterProjectId = signal<string>('');
  suggestion  = signal<string>('');
  showSuggestion = signal(false);

  readonly members   = computed(() => this.overview()?.members ?? []);
  readonly visibleDays = computed(() => this.members()[0]?.dailyLoad ?? []);

  // 14 days header
  readonly dayHeaders = computed(() =>
    (this.members()[0]?.dailyLoad ?? []).map(d => ({
      date: d.date,
      label: new Date(d.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric' }),
      isToday: d.date === new Date().toISOString().slice(0, 10),
      isWeekend: [0, 6].includes(new Date(d.date + 'T12:00:00').getDay()),
    }))
  );

  ngOnInit() {
    const cid = this.auth.currentCompanyId();
    if (cid) {
      this.projSvc.getAll(cid).subscribe({ next: (p: any) => this.projects.set(p?.data ?? p ?? []) });
    }
    this.load();
  }

  load() {
    this.loading.set(true);
    const pid = this.filterProjectId() || undefined;
    this.svc.get(pid).subscribe({
      next: (res: any) => {
        this.overview.set(res?.data ?? res);
        this.loading.set(false);
        this.cdr.markForCheck();
      },
      error: () => { this.loading.set(false); this.cdr.markForCheck(); },
    });
  }

  suggest() {
    this.suggesting.set(true);
    this.svc.suggest().subscribe({
      next: (res: any) => {
        const r = res?.data ?? res;
        this.suggestion.set(r.suggestion);
        this.showSuggestion.set(true);
        this.suggesting.set(false);
        this.cdr.markForCheck();
      },
      error: () => { this.suggesting.set(false); this.toast.error('IA indisponível'); },
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  statusConfig(s: MemberWorkload['status']): { label: string; color: string; bg: string; barColor: string } {
    const map = {
      idle:       { label: 'Disponível',    color: '#64748b', bg: '#f8fafc', barColor: '#cbd5e1' },
      balanced:   { label: 'Equilibrado',   color: '#10b981', bg: '#f0fdf4', barColor: '#34d399' },
      busy:       { label: 'Ocupado',       color: '#f59e0b', bg: '#fffbeb', barColor: '#fbbf24' },
      overloaded: { label: 'Sobrecarregado',color: '#ef4444', bg: '#fef2f2', barColor: '#f87171' },
    };
    return map[s];
  }

  heatColor(count: number): string {
    if (count === 0) return '#f8fafc';
    if (count === 1) return '#dbeafe';
    if (count === 2) return '#93c5fd';
    if (count <= 4)  return '#6366f1';
    return '#dc2626';
  }

  heatTitle(count: number, date: string): string {
    const d = new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    return count === 0 ? `${d} — sem tarefas` : `${d} — ${count} tarefa(s) vencendo`;
  }

  formatMin(min: number): string {
    if (min === 0) return '—';
    const h = Math.floor(min / 60);
    const m = min % 60;
    return h > 0 ? `${h}h${m > 0 ? ` ${m}min` : ''}` : `${m}min`;
  }

  initials(name: string): string {
    const p = name.trim().split(' ');
    return p.length >= 2 ? p[0][0] + p[p.length - 1][0] : p[0].slice(0, 2);
  }
}
