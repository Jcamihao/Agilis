import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { DashboardOverview } from '../../core/models/dashboard.model';
import { Task, TaskLog, TaskStatus } from '../../core/models/task.model';
import { DashboardService } from '../../core/services/dashboard.service';
import { TasksService } from '../../core/services/tasks.service';
import { materialImports } from '../../shared/material/material.imports';
import { SectionHeaderComponent } from '../../shared/components/section-header/section-header.component';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';

@Component({
  selector: 'agilis-dashboard-page',
  standalone: true,
  imports: [RouterLink, ...materialImports, SectionHeaderComponent, StatCardComponent],
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.scss',
})
export class DashboardPageComponent {
  private readonly dashboardService = inject(DashboardService);
  private readonly tasksService = inject(TasksService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loading = signal(true);
  protected readonly overview = signal<DashboardOverview | null>(null);
  protected readonly tasks = signal<Task[]>([]);
  protected readonly statusOrder: TaskStatus[] = [
    'PENDING',
    'IN_PROGRESS',
    'DELAYED',
    'DONE',
  ];
  protected readonly delayedTasks = computed(() =>
    this.tasks()
      .filter((task) => task.status === 'DELAYED')
      .slice(0, 4),
  );
  protected readonly dueSoonTasks = computed(() =>
    this.tasks()
      .filter((task) => {
        const dueDate = new Date(task.dueDate).getTime();
        const now = Date.now();
        return dueDate >= now && dueDate <= now + 1000 * 60 * 60 * 24 * 2;
      })
      .slice(0, 4),
  );
  protected readonly recentLogs = computed(() =>
    this.tasks()
      .flatMap((task) =>
        task.logs.map((log) => ({
          taskTitle: task.title,
          ...log,
        })),
      )
      .sort(
        (left, right) =>
          new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
      )
      .slice(0, 6),
  );
  protected readonly completionRate = computed(() => {
    const overview = this.overview();

    if (!overview || overview.totalTasks === 0) {
      return 0;
    }

    return Math.round((overview.completedTasks / overview.totalTasks) * 100);
  });

  protected readonly statusConfig: Record<
    TaskStatus,
    { label: string; color: string; progress: () => number }
  > = {
    PENDING: {
      label: 'Pendentes',
      color: '#f59e0b',
      progress: () => this.getProgress('PENDING'),
    },
    IN_PROGRESS: {
      label: 'Em andamento',
      color: '#38bdf8',
      progress: () => this.getProgress('IN_PROGRESS'),
    },
    DELAYED: {
      label: 'Atrasadas',
      color: '#f43f5e',
      progress: () => this.getProgress('DELAYED'),
    },
    DONE: {
      label: 'Concluídas',
      color: '#14b8a6',
      progress: () => this.getProgress('DONE'),
    },
  };

  constructor() {
    this.loadDashboard();
  }

  private loadDashboard(): void {
    forkJoin({
      overview: this.dashboardService.getOverview(),
      tasks: this.tasksService.list(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ overview, tasks }) => {
          this.overview.set(overview);
          this.tasks.set(tasks);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
        },
      });
  }

  protected getProgress(status: TaskStatus): number {
    const overview = this.overview();

    if (!overview || overview.totalTasks === 0) {
      return 0;
    }

    const match = overview.byStatus.find((item) => item.status === status);
    return match ? Math.round((match.total / overview.totalTasks) * 100) : 0;
  }

  protected trackLog(_: number, log: TaskLog & { taskTitle: string }): string {
    return log.id;
  }

  protected trackTask(_: number, task: Task): string {
    return task.id;
  }
}
