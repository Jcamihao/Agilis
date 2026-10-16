import {
  Component,
  signal,
  inject,
  OnInit,
  ChangeDetectionStrategy,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { CompaniesService } from '../../core/services/companies.service';
import { TasksService } from '../../core/services/tasks.service';
import { InsightsService } from '../../core/services/insights.service';
import { Insight } from '../../core/models';
import {
  DashboardStats,
  Task,
  PRIORITY_CONFIG,
  TASK_STATUS_CONFIG,
} from '../../core/models';
import { formatDate, timeAgo } from '../../core/utils/format';

@Component({
  selector: 'ag-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly companiesService = inject(CompaniesService);
  private readonly tasksService = inject(TasksService);
  private readonly insightsSvc = inject(InsightsService);

  readonly PRIORITY_CONFIG = PRIORITY_CONFIG;
  readonly STATUS_CONFIG = TASK_STATUS_CONFIG;

  loading = signal(true);
  myTasksLoading = signal(true);
  stats = signal<DashboardStats | null>(null);
  myTasks = signal<Task[]>([]);
  productivityData = computed(() => this.stats()?.productivity ?? []);
  teamWorkload = computed(() => this.stats()?.teamWorkload ?? []);
  topInsights = signal<Insight[]>([]);

  today = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  readonly firstName = () => this.auth.user()?.name?.split(' ')[0] ?? '';

  showOnboarding = signal(true);

  readonly isNewUser = computed(() => {
    const s = this.stats();
    if (!s) return false;
    const total = (s as any).totalProjects ?? (s as any).activeProjects ?? 0;
    return total === 0 && this.myTasks().length === 0 && this.showOnboarding();
  });

  dismissOnboarding() { this.showOnboarding.set(false); }

  totalProductivity = computed(() =>
    this.productivityData().reduce((sum, d) => sum + d.count, 0),
  );

  maxProductivity = computed(() =>
    Math.max(...this.productivityData().map((d) => d.count), 1),
  );

  ngOnInit() {
    const companyId = this.auth.currentCompanyId();

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

    // Load top insights
    if (companyId) {
      this.insightsSvc.list(companyId).subscribe({
        next: (res: any) => {
          const list: Insight[] = res?.data ?? res ?? [];
          this.topInsights.set(list.filter(i => i.severity === 'CRITICAL' || i.severity === 'HIGH').slice(0, 3));
        },
      });
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

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
  readonly formatDate = formatDate;
  formatShortDate(date: string): string {
    return new Date(date)
      .toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
      .slice(0, 5);
  }
  readonly timeAgo = timeAgo;
  getActivityLabel(action: string): string {
    const map: Record<string, string> = {
      task_created: ' criou uma tarefa',
      task_updated: ' atualizou uma tarefa',
      status_changed: ' moveu uma tarefa',
      comment_added: ' comentou em uma tarefa',
    };
    return map[action] ?? ` fez: ${action}`;
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
