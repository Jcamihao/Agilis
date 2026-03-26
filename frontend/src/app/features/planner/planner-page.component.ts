import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PlannerGroup, Task } from '../../core/models/task.model';
import { TasksService } from '../../core/services/tasks.service';
import { materialImports } from '../../shared/material/material.imports';
import { SectionHeaderComponent } from '../../shared/components/section-header/section-header.component';

@Component({
  selector: 'agilis-planner-page',
  standalone: true,
  imports: [...materialImports, SectionHeaderComponent],
  templateUrl: './planner-page.component.html',
  styleUrl: './planner-page.component.scss',
})
export class PlannerPageComponent {
  private readonly tasksService = inject(TasksService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loading = signal(true);
  protected readonly tasks = signal<Task[]>([]);
  protected readonly groups = computed(() => this.buildGroups(this.tasks()));

  constructor() {
    this.tasksService
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (tasks) => {
          this.tasks.set(tasks);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
        },
      });
  }

  protected trackGroup(_: number, group: PlannerGroup): string {
    return group.title;
  }

  protected trackTask(_: number, task: Task): string {
    return task.id;
  }

  private buildGroups(tasks: Task[]): PlannerGroup[] {
    const now = new Date();
    const tomorrow = now.getTime() + 1000 * 60 * 60 * 24;
    const week = now.getTime() + 1000 * 60 * 60 * 24 * 7;

    const activeTasks = [...tasks].sort(
      (left, right) => new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime(),
    );

    return [
      {
        title: 'Hoje',
        description: 'O que precisa acontecer ainda hoje.',
        tasks: activeTasks.filter((task) => this.isSameDay(task.dueDate, now) && task.status !== 'DONE'),
      },
      {
        title: 'Proximas 24 horas',
        description: 'Tarefas que vao puxar o ritmo operacional.',
        tasks: activeTasks.filter((task) => {
          const dueDate = new Date(task.dueDate).getTime();
          return dueDate > now.getTime() && dueDate <= tomorrow && task.status !== 'DONE';
        }),
      },
      {
        title: 'Esta semana',
        description: 'Compromissos que exigem acompanhamento continuo.',
        tasks: activeTasks.filter((task) => {
          const dueDate = new Date(task.dueDate).getTime();
          return dueDate > tomorrow && dueDate <= week && task.status !== 'DONE';
        }),
      },
      {
        title: 'Proximas entregas',
        description: 'Roadmap da próxima janela operacional.',
        tasks: activeTasks.filter(
          (task) => new Date(task.dueDate).getTime() > week && task.status !== 'DONE',
        ),
      },
      {
        title: 'Concluidas',
        description: 'Tudo o que ja foi entregue pelo time.',
        tasks: activeTasks.filter((task) => task.status === 'DONE'),
      },
    ];
  }

  private isSameDay(dateValue: string, baseDate: Date): boolean {
    const date = new Date(dateValue);

    return (
      date.getDate() === baseDate.getDate() &&
      date.getMonth() === baseDate.getMonth() &&
      date.getFullYear() === baseDate.getFullYear()
    );
  }
}
