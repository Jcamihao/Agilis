import {
  Component,
  signal,
  inject,
  OnInit,
  ChangeDetectionStrategy,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  CdkDragDrop,
  DragDropModule,
  moveItemInArray,
} from '@angular/cdk/drag-drop';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { CompaniesService } from '../../core/services/companies.service';
import { TasksService } from '../../core/services/tasks.service';
import { DashboardWidgetsService } from '../../core/services/dashboard-widgets.service';
import { HealthScoreService } from '../../core/services/health-score.service';
import { InsightsService } from '../../core/services/insights.service';
import { HealthScore, Insight } from '../../core/models';
import {
  DashboardStats,
  Task,
  DashboardWidget,
  WidgetType,
  PRIORITY_CONFIG,
  TASK_STATUS_CONFIG,
  WIDGET_CONFIG,
} from '../../core/models';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

@Component({
  selector: 'ag-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, DragDropModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly companiesService = inject(CompaniesService);
  private readonly tasksService = inject(TasksService);
  private readonly widgetsService = inject(DashboardWidgetsService);
  private readonly healthScoreSvc = inject(HealthScoreService);
  private readonly insightsSvc = inject(InsightsService);

  readonly PRIORITY_CONFIG = PRIORITY_CONFIG;
  readonly STATUS_CONFIG = TASK_STATUS_CONFIG;
  readonly WIDGET_CONFIG = WIDGET_CONFIG;

  loading = signal(true);
  myTasksLoading = signal(true);
  teamWorkloadLoading = signal(true);
  customizing = signal(false);
  stats = signal<DashboardStats | null>(null);
  myTasks = signal<Task[]>([]);
  widgets = signal<DashboardWidget[]>([]);
  widgetData = signal<Partial<Record<WidgetType, any>>>({});
  productivityData = signal<{ date: string; count: number }[]>([]);
  teamWorkload = signal<any[]>([]);
  companyHealthScore = signal<HealthScore | null>(null);
  topInsights = signal<Insight[]>([]);

  today = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  readonly firstName = () => this.auth.user()?.name?.split(' ')[0] ?? '';

  activeWidgets = computed(() =>
    this.widgets()
      .filter((w) => w.isActive || this.customizing())
      .sort((a, b) => a.position - b.position),
  );

  inactiveWidgets = computed(() => this.widgets().filter((w) => !w.isActive));

  totalProductivity = computed(() =>
    this.productivityData().reduce((sum, d) => sum + d.count, 0),
  );

  maxProductivity = computed(() =>
    Math.max(...this.productivityData().map((d) => d.count), 1),
  );

  ngOnInit() {
    const companyId = this.auth.currentCompanyId();

    // Load widgets config
    this.widgetsService.getWidgets().subscribe({
      next: (ws) => {
        this.widgets.set(ws);
        this.loadWidgetData(companyId);
      },
    });

    // Load stats
    if (companyId) {
      this.companiesService.getDashboard(companyId).subscribe({
        next: (data) => {
          this.stats.set(data);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
    } else {
      this.loading.set(false);
    }

    // Load my tasks
    this.tasksService.getMyTasks(companyId).subscribe({
      next: (tasks) => {
        this.myTasks.set(tasks);
        this.myTasksLoading.set(false);
      },
      error: () => this.myTasksLoading.set(false),
    });

    // Load health score + top insights
    if (companyId) {
      this.healthScoreSvc.overview(companyId).subscribe({
        next: (ov) => this.companyHealthScore.set(ov?.company ?? null),
      });
      this.insightsSvc.list(companyId).subscribe({
        next: (res: any) => {
          const list: Insight[] = res?.data ?? res ?? [];
          this.topInsights.set(list.filter(i => i.severity === 'CRITICAL' || i.severity === 'HIGH').slice(0, 3));
        },
      });
    }
  }

  loadWidgetData(companyId?: string) {
    if (!companyId) return;

    // Stat widgets
    const statTypes: WidgetType[] = [
      'OVERDUE_TASKS',
      'COMPLETED_TASKS',
      'ACTIVE_PROJECTS',
    ];
    for (const type of statTypes) {
      this.widgetsService.getWidgetData(type, companyId).subscribe({
        next: (data) => {
          this.widgetData.update((d) => ({
            ...d,
            [type]: type === 'ACTIVE_PROJECTS' ? data.length : data,
          }));
        },
      });
    }

    // Productivity chart
    this.widgetsService
      .getWidgetData('PRODUCTIVITY_CHART', companyId)
      .subscribe({
        next: (data) => this.productivityData.set(data ?? []),
      });

    // Team workload
    this.teamWorkloadLoading.set(true);
    this.widgetsService.getWidgetData('TEAM_WORKLOAD', companyId).subscribe({
      next: (data) => {
        this.teamWorkload.set(data ?? []);
        this.teamWorkloadLoading.set(false);
      },
      error: () => this.teamWorkloadLoading.set(false),
    });
  }

  toggleCustomize() {
    if (this.customizing()) {
      // Save reorder
      const order = this.widgets().map((w, i) => ({
        widgetType: w.widgetType,
        position: i,
      }));
      this.widgetsService.reorder(order).subscribe();
    }
    this.customizing.update((v) => !v);
  }

  toggleWidgetActive(widget: DashboardWidget) {
    const updated = { ...widget, isActive: !widget.isActive };
    this.widgets.update((list) =>
      list.map((w) => (w.widgetType === widget.widgetType ? updated : w)),
    );
    this.widgetsService
      .updateWidget(widget.widgetType, { isActive: updated.isActive })
      .subscribe();
  }

  onWidgetDrop(event: CdkDragDrop<DashboardWidget[]>) {
    const list = [...this.activeWidgets()];
    moveItemInArray(list, event.previousIndex, event.currentIndex);
    this.widgets.set(list);
  }

  resetWidgets() {
    this.widgetsService.reset().subscribe({
      next: (ws) => this.widgets.set(ws),
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  isStatWidget(type: WidgetType): boolean {
    return ['OVERDUE_TASKS', 'COMPLETED_TASKS', 'ACTIVE_PROJECTS'].includes(
      type,
    );
  }

  getWidgetClass(widget: DashboardWidget): string {
    const spanMap: Record<number, string> = {
      1: 'col-span-1',
      2: 'col-span-2',
      3: 'col-span-3',
      4: 'col-span-4',
    };
    return `${spanMap[widget.colSpan] ?? 'col-span-1'}`;
  }

  getStatColor(type: WidgetType): string {
    if (type === 'OVERDUE_TASKS') return 'text-red-500';
    if (type === 'COMPLETED_TASKS') return 'text-emerald-600';
    return 'text-slate-800';
  }

  getStatBg(type: WidgetType): string {
    if (type === 'OVERDUE_TASKS') return 'bg-red-50';
    if (type === 'COMPLETED_TASKS') return 'bg-emerald-50';
    return 'bg-blue-50';
  }

  getStatIconColor(type: WidgetType): string {
    if (type === 'OVERDUE_TASKS') return 'text-red-500';
    if (type === 'COMPLETED_TASKS') return 'text-emerald-600';
    return 'text-blue-600';
  }

  getBarHeight(count: number): number {
    const max = this.maxProductivity();
    return max === 0 ? 0 : Math.round((count / max) * 100);
  }

  getWorkloadPercent(count: number): number {
    const max = Math.max(
      ...this.teamWorkload().map((m) => m._count?.assignedTasks ?? 0),
      1,
    );
    return Math.round((count / max) * 100);
  }

  isOverdue(date: string): boolean {
    return new Date(date) < new Date();
  }
  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
    });
  }
  formatShortDate(date: string): string {
    return new Date(date)
      .toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
      .slice(0, 5);
  }
  timeAgo(date: string): string {
    return formatDistanceToNow(new Date(date), {
      addSuffix: true,
      locale: ptBR,
    });
  }
  getActivityLabel(action: string): string {
    const map: Record<string, string> = {
      task_created: ' criou uma tarefa',
      task_updated: ' atualizou uma tarefa',
      status_changed: ' moveu uma tarefa',
      comment_added: ' comentou em uma tarefa',
    };
    return map[action] ?? ` fez: ${action}`;
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

  insightSeverityColor(sev: string): string {
    const map: Record<string, string> = {
      CRITICAL: '#dc2626', HIGH: '#ea580c', MEDIUM: '#d97706', LOW: '#10b981',
    };
    return map[sev] ?? '#64748b';
  }

  insightIcon(type: string): string {
    const map: Record<string, string> = {
      RISK: 'crisis_alert', BOTTLENECK: 'traffic',
      DELAY_PREDICTION: 'schedule', RECOMMENDATION: 'tips_and_updates', ACHIEVEMENT: 'emoji_events',
    };
    return map[type] ?? 'info';
  }
}
