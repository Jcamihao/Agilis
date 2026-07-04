import {
  Component, OnInit, signal, inject, ChangeDetectionStrategy, ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { InsightsService } from '../../core/services/insights.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { Insight, InsightType, InsightSeverity } from '../../core/models';

@Component({
  selector: 'ag-insights-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  templateUrl: './insights-page.component.html',
  styleUrls: ['./insights-page.component.scss'],
})
export class InsightsPageComponent implements OnInit {
  private readonly svc   = inject(InsightsService);
  private readonly auth  = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly cdr   = inject(ChangeDetectorRef);

  loading    = signal(true);
  generating = signal(false);
  all        = signal<Insight[]>([]);
  filterType = signal<InsightType | 'ALL'>('ALL');

  readonly filtered = () => {
    const t = this.filterType();
    return t === 'ALL' ? this.all() : this.all().filter(i => i.type === t);
  };

  readonly typeFilters: { key: InsightType | 'ALL'; label: string; icon: string }[] = [
    { key: 'ALL',             label: 'Todos',          icon: 'list' },
    { key: 'RISK',            label: 'Riscos',         icon: 'crisis_alert' },
    { key: 'BOTTLENECK',      label: 'Gargalos',       icon: 'traffic' },
    { key: 'DELAY_PREDICTION',label: 'Atrasos',        icon: 'schedule' },
    { key: 'RECOMMENDATION',  label: 'Recomendações',  icon: 'tips_and_updates' },
    { key: 'ACHIEVEMENT',     label: 'Conquistas',     icon: 'emoji_events' },
  ];

  ngOnInit() { this.load(); }

  load() {
    const cid = this.auth.currentCompanyId();
    if (!cid) return;
    this.loading.set(true);
    this.svc.list(cid).subscribe({
      next: (res) => {
        this.all.set((res as any)?.data ?? res ?? []);
        this.loading.set(false);
        this.cdr.markForCheck();
      },
      error: () => { this.loading.set(false); this.cdr.markForCheck(); },
    });
  }

  generate() {
    const cid = this.auth.currentCompanyId();
    if (!cid) return;
    this.generating.set(true);
    this.svc.generate(cid).subscribe({
      next: (res) => {
        this.all.set((res as any)?.data ?? res ?? []);
        this.generating.set(false);
        this.toast.success('Insights atualizados');
        this.cdr.markForCheck();
      },
      error: () => { this.generating.set(false); },
    });
  }

  dismiss(id: string) {
    this.svc.dismiss(id).subscribe(() => {
      this.all.update(l => l.filter(i => i.id !== id));
      this.cdr.markForCheck();
    });
  }

  markRead(id: string) {
    this.svc.markRead(id).subscribe(() => {
      this.all.update(l => l.map(i => i.id === id ? { ...i, isRead: true } : i));
      this.cdr.markForCheck();
    });
  }

  severityConfig(sev: InsightSeverity) {
    const map: Record<InsightSeverity, { label: string; color: string; bg: string; icon: string; order: number }> = {
      CRITICAL: { label: 'Crítico',  color: '#dc2626', bg: '#fef2f2', icon: 'crisis_alert',      order: 0 },
      HIGH:     { label: 'Alto',     color: '#ea580c', bg: '#fff7ed', icon: 'warning',            order: 1 },
      MEDIUM:   { label: 'Médio',    color: '#d97706', bg: '#fffbeb', icon: 'info',               order: 2 },
      LOW:      { label: 'Baixo',    color: '#10b981', bg: '#f0fdf4', icon: 'check_circle',       order: 3 },
    };
    return map[sev] ?? map.LOW;
  }

  typeIcon(type: InsightType): string {
    const map: Record<InsightType, string> = {
      RISK:             'crisis_alert',
      BOTTLENECK:       'traffic',
      DELAY_PREDICTION: 'schedule',
      RECOMMENDATION:   'tips_and_updates',
      ACHIEVEMENT:      'emoji_events',
    };
    return map[type] ?? 'info';
  }

  countByType(key: InsightType | 'ALL'): number {
    if (key === 'ALL') return this.all().length;
    return this.all().filter(i => i.type === key).length;
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }
}
