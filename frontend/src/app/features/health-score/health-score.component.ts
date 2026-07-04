import {
  Component, OnInit, signal, inject, computed, ChangeDetectionStrategy, ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HealthScoreService } from '../../core/services/health-score.service';
import { InsightsService } from '../../core/services/insights.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { HealthScoreOverview, Insight } from '../../core/models';

@Component({
  selector: 'ag-health-score',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  templateUrl: './health-score.component.html',
  styleUrls: ['./health-score.component.scss'],
})
export class HealthScoreComponent implements OnInit {
  readonly Math = Math;
  private readonly svc     = inject(HealthScoreService);
  private readonly insightsSvc = inject(InsightsService);
  private readonly auth    = inject(AuthService);
  private readonly toast   = inject(ToastService);
  private readonly cdr     = inject(ChangeDetectorRef);

  loading         = signal(true);
  recalculating   = signal(false);
  overview        = signal<HealthScoreOverview | null>(null);
  insights        = signal<Insight[]>([]);

  readonly companyScore = computed(() => this.overview()?.company ?? null);
  readonly teams        = computed(() => this.overview()?.teams ?? []);
  readonly projects     = computed(() => this.overview()?.projects ?? []);

  readonly criticalInsights = computed(() =>
    this.insights().filter(i => i.severity === 'CRITICAL' || i.severity === 'HIGH')
  );

  ngOnInit() {
    this.load();
  }

  load() {
    const cid = this.auth.currentCompanyId();
    if (!cid) return;
    this.loading.set(true);

    Promise.all([
      this.svc.overview(cid).toPromise(),
      this.insightsSvc.list(cid).toPromise(),
    ]).then(([ov, ins]) => {
      this.overview.set(ov!);
      this.insights.set((ins as any)?.data ?? ins ?? []);
      this.loading.set(false);
      this.cdr.markForCheck();
    }).catch(() => {
      this.loading.set(false);
      this.cdr.markForCheck();
    });
  }

  recalculate() {
    const cid = this.auth.currentCompanyId();
    if (!cid) return;
    this.recalculating.set(true);
    this.svc.recalculate(cid).subscribe({
      next: () => {
        this.toast.success('Score recalculado');
        this.load();
        this.recalculating.set(false);
        this.cdr.markForCheck();
      },
      error: () => { this.recalculating.set(false); },
    });
  }

  dismissInsight(id: string) {
    this.insightsSvc.dismiss(id).subscribe(() => {
      this.insights.update(l => l.filter(i => i.id !== id));
      this.cdr.markForCheck();
    });
  }

  scoreGrade(score: number): string {
    if (score >= 85) return 'A';
    if (score >= 70) return 'B';
    if (score >= 50) return 'C';
    if (score >= 30) return 'D';
    return 'F';
  }

  scoreColor(score: number): string {
    if (score >= 85) return '#10b981';
    if (score >= 70) return '#3b82f6';
    if (score >= 50) return '#f59e0b';
    if (score >= 30) return '#ef4444';
    return '#7f1d1d';
  }

  scoreLabel(score: number): string {
    if (score >= 85) return 'Excelente';
    if (score >= 70) return 'Bom';
    if (score >= 50) return 'Regular';
    if (score >= 30) return 'Crítico';
    return 'Alerta Máximo';
  }

  severityConfig(sev: string): { label: string; color: string; bg: string; icon: string } {
    const map: Record<string, { label: string; color: string; bg: string; icon: string }> = {
      CRITICAL: { label: 'Crítico',    color: '#dc2626', bg: '#fef2f2', icon: 'crisis_alert' },
      HIGH:     { label: 'Alto',       color: '#ea580c', bg: '#fff7ed', icon: 'warning' },
      MEDIUM:   { label: 'Médio',      color: '#d97706', bg: '#fffbeb', icon: 'info' },
      LOW:      { label: 'Baixo',      color: '#10b981', bg: '#f0fdf4', icon: 'check_circle' },
    };
    return map[sev] ?? map['LOW'];
  }

  typeIcon(type: string): string {
    const map: Record<string, string> = {
      RISK:             'crisis_alert',
      BOTTLENECK:       'traffic',
      DELAY_PREDICTION: 'schedule',
      RECOMMENDATION:   'tips_and_updates',
      ACHIEVEMENT:      'emoji_events',
    };
    return map[type] ?? 'info';
  }

  breakdownItems(breakdown: Record<string, number>): { label: string; value: number; positive: boolean }[] {
    const labels: Record<string, { label: string; positive: boolean }> = {
      overdueDeduction:    { label: 'Tarefas atrasadas',   positive: false },
      slaDeduction:        { label: 'Violações de SLA',    positive: false },
      backlogDeduction:    { label: 'Backlog acumulado',   positive: false },
      inactivityDeduction: { label: 'Inatividade',         positive: false },
      completionBonus:     { label: 'Taxa de conclusão',   positive: true },
    };
    return Object.entries(breakdown)
      .filter(([k]) => k !== 'base')
      .map(([k, v]) => ({
        label: labels[k]?.label ?? k,
        value: v,
        positive: labels[k]?.positive ?? false,
      }));
  }

  dashWidth(score: number): string {
    return `${score}%`;
  }
}
