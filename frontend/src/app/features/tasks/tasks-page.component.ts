import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import {
  Task,
  TaskPriorityLabel,
  TaskStatus,
  TaskStatusOption,
} from '../../core/models/task.model';
import { User } from '../../core/models/user.model';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { TasksService } from '../../core/services/tasks.service';
import { UsersService } from '../../core/services/users.service';
import { materialImports } from '../../shared/material/material.imports';
import { SectionHeaderComponent } from '../../shared/components/section-header/section-header.component';

type MetricAccent = 'sky' | 'gold' | 'rose' | 'teal';
type DueTone = 'critical' | 'attention' | 'healthy' | 'done';

interface BoardMetric {
  key: string;
  label: string;
  value: string;
  helper: string;
  accent: MetricAccent;
}

interface DueMeta {
  label: string;
  tone: DueTone;
}

@Component({
  selector: 'agilis-tasks-page',
  standalone: true,
  imports: [...materialImports, SectionHeaderComponent],
  templateUrl: './tasks-page.component.html',
  styleUrl: './tasks-page.component.scss',
})
export class TasksPageComponent {
  private readonly authService = inject(AuthService);
  private readonly tasksService = inject(TasksService);
  private readonly usersService = inject(UsersService);
  private readonly notificationService = inject(NotificationService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly allAssigneesValue = '__ALL__';
  protected readonly allUsersFilterValue = '';
  protected readonly currentUser = this.authService.currentUser;
  protected readonly loading = signal(true);
  protected readonly submitting = signal(false);
  protected readonly search = signal('');
  protected readonly selectedUserFilter = signal('');
  protected readonly editingTaskId = signal<string | null>(null);
  protected readonly tasks = signal<Task[]>([]);
  protected readonly users = signal<User[]>([]);
  protected readonly kanbanStatuses: TaskStatusOption[] = [
    { key: 'PENDING', label: 'Pendentes', accent: 'gold' },
    { key: 'IN_PROGRESS', label: 'Em andamento', accent: 'sky' },
    { key: 'DELAYED', label: 'Atrasadas', accent: 'rose' },
    { key: 'DONE', label: 'Concluídas', accent: 'teal' },
  ];
  protected readonly connectedDropLists = this.kanbanStatuses.map((status) => status.key);
  protected readonly displayedColumns = ['title', 'priority', 'assignees', 'dueDate', 'status'];
  protected readonly filterUsers = computed(() => {
    const explicitUsers = this.users();

    if (explicitUsers.length > 0) {
      return [...explicitUsers].sort((left, right) => left.name.localeCompare(right.name));
    }

    const uniqueUsers = new Map<string, User>();

    for (const task of this.tasks()) {
      for (const assignee of task.assignees) {
        if (!uniqueUsers.has(assignee.id)) {
          uniqueUsers.set(assignee.id, {
            id: assignee.id,
            name: assignee.name,
            email: assignee.email,
            role: assignee.role,
            organizationId: '',
            createdAt: '',
            updatedAt: '',
          });
        }
      }
    }

    return [...uniqueUsers.values()].sort((left, right) => left.name.localeCompare(right.name));
  });
  protected readonly filteredTasks = computed(() => {
    const term = this.search().trim().toLowerCase();
    const selectedUserId = this.selectedUserFilter();

    return this.tasks().filter(
      (task) =>
        this.matchesUserFilter(task, selectedUserId) &&
        (!term ||
          task.title.toLowerCase().includes(term) ||
          task.assigneeLabel.toLowerCase().includes(term) ||
          (task.description?.toLowerCase().includes(term) ?? false)),
    );
  });
  protected readonly canManageTasks = computed(() => {
    const role = this.currentUser()?.role;
    return role === 'ADMIN' || role === 'MANAGER';
  });
  protected readonly editingTask = computed(() => {
    const taskId = this.editingTaskId();

    if (!taskId) {
      return null;
    }

    return this.tasks().find((task) => task.id === taskId) ?? null;
  });
  protected readonly statusTotals = computed<Record<TaskStatus, number>>(() => {
    const totals: Record<TaskStatus, number> = {
      PENDING: 0,
      IN_PROGRESS: 0,
      DELAYED: 0,
      DONE: 0,
    };

    for (const task of this.filteredTasks()) {
      totals[task.status] += 1;
    }

    return totals;
  });
  protected readonly boardMetrics = computed<BoardMetric[]>(() => {
    const tasks = this.filteredTasks();
    const totals = this.statusTotals();
    const total = tasks.length;
    const throughput = total === 0 ? 0 : Math.round((totals.DONE / total) * 100);
    const urgent = tasks.filter(
      (task) => task.status !== 'DONE' && this.isDueWithinHours(task, 24),
    ).length;
    const critical = tasks.filter((task) => task.priority.label === 'CRITICAL').length;
    const currentUserId = this.currentUser()?.id;
    const myCards = currentUserId
      ? tasks.filter(
          (task) => this.isAssignedToUser(task, currentUserId) && task.status !== 'DONE',
        ).length
      : 0;

    return [
      {
        key: 'total',
        label: 'Cards no board',
        value: total.toString(),
        helper: 'Volume ativo da operação',
        accent: 'sky',
      },
      {
        key: 'throughput',
        label: 'Entrega do fluxo',
        value: `${throughput}%`,
        helper: 'Concluídas dentro do board',
        accent: 'teal',
      },
      {
        key: 'delayed',
        label: 'Prioridade critica',
        value: critical.toString(),
        helper: 'Cards mais urgentes do momento',
        accent: 'rose',
      },
      {
        key: 'mine',
        label: 'Minha fila aberta',
        value: myCards.toString(),
        helper:
          urgent > 0
            ? `${urgent} cards vencem em 24h`
            : 'Sem vencimentos críticos nas próximas 24h',
        accent: 'gold',
      },
    ];
  });

  protected readonly taskForm = this.formBuilder.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(3)]],
    description: [''],
    dueDate: ['', [Validators.required]],
    assignedToIds: this.formBuilder.nonNullable.control<string[]>([], [
      Validators.required,
    ]),
  });

  constructor() {
    this.loadPage();
  }

  protected setSearch(value: string): void {
    this.search.set(value);
  }

  protected setUserFilter(userId: string): void {
    this.selectedUserFilter.set(userId);
  }

  protected tasksByStatus(status: TaskStatus): Task[] {
    return [...this.filteredTasks()]
      .filter((task) => task.status === status)
      .sort(
        (left, right) =>
          right.priority.score - left.priority.score ||
          new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime(),
      );
  }

  protected statusTotal(status: TaskStatus): number {
    return this.statusTotals()[status];
  }

  protected statusShare(status: TaskStatus): number {
    const total = this.filteredTasks().length;

    if (total === 0) {
      return 0;
    }

    return Math.round((this.statusTotal(status) / total) * 100);
  }

  protected submitTask(): void {
    if (this.taskForm.invalid) {
      this.taskForm.markAllAsTouched();
      return;
    }

    const raw = this.taskForm.getRawValue();
    const editingTaskId = this.editingTaskId();
    const assignedToAll = raw.assignedToIds.includes(this.allAssigneesValue);
    this.submitting.set(true);

    const payload = {
      title: raw.title,
      description: raw.description || undefined,
      assignedToAll,
      assignedToIds: assignedToAll ? [] : raw.assignedToIds,
      dueDate: new Date(raw.dueDate).toISOString(),
    };

    const request$ = editingTaskId
      ? this.tasksService.update(editingTaskId, payload)
      : this.tasksService.create(payload);

    request$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (task) => {
          this.tasks.update((tasks) =>
            editingTaskId
              ? tasks.map((currentTask) => (currentTask.id === task.id ? task : currentTask))
              : [task, ...tasks],
          );
          this.resetTaskForm();
          this.notificationService.success(
            editingTaskId ? 'Card atualizado com sucesso.' : 'Tarefa criada com sucesso.',
          );
        },
        error: () => {
          this.submitting.set(false);
        },
        complete: () => {
          this.submitting.set(false);
        },
      });
  }

  protected startEditingTask(task: Task): void {
    this.editingTaskId.set(task.id);
    this.taskForm.reset({
      title: task.title,
      description: task.description ?? '',
      dueDate: this.toDateTimeLocalValue(task.dueDate),
      assignedToIds: task.assignedToAll
        ? [this.allAssigneesValue]
        : task.assignees.map((assignee) => assignee.id),
    });
  }

  protected cancelEditing(): void {
    this.resetTaskForm();
  }

  protected updateStatus(taskId: string, status: TaskStatus): void {
    this.tasksService
      .updateStatus(taskId, { status })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (task) => {
          this.tasks.update((tasks) =>
            tasks.map((currentTask) => (currentTask.id === task.id ? task : currentTask)),
          );
          this.notificationService.success('Status atualizado.');
        },
      });
  }

  protected drop(event: CdkDragDrop<Task[]>, targetStatus: TaskStatus): void {
    if (event.previousContainer === event.container) {
      return;
    }

    const task = event.previousContainer.data[event.previousIndex];
    this.updateStatus(task.id, targetStatus);
  }

  protected handleAssigneeSelection(values: string[]): void {
    const normalizedValues = values.includes(this.allAssigneesValue)
      ? [this.allAssigneesValue]
      : values.filter((value) => value !== this.allAssigneesValue);

    this.taskForm.controls.assignedToIds.setValue(normalizedValues, {
      emitEvent: false,
    });
  }

  protected isAllAssigneesSelected(): boolean {
    return this.taskForm.controls.assignedToIds.value.includes(this.allAssigneesValue);
  }

  protected selectedAssigneeLabel(): string {
    const selectedValues = this.taskForm.controls.assignedToIds.value;

    if (selectedValues.includes(this.allAssigneesValue)) {
      return 'TODOS';
    }

    const names = this.users()
      .filter((user) => selectedValues.includes(user.id))
      .map((user) => user.name);

    if (names.length === 0) {
      return 'Selecione os responsáveis';
    }

    return names.join(', ');
  }

  protected trackTask(_: number, task: Task): string {
    return task.id;
  }

  protected trackUser(_: number, user: User): string {
    return user.id;
  }

  protected trackMetric(_: number, metric: BoardMetric): string {
    return metric.key;
  }

  protected dueMeta(task: Task): DueMeta {
    if (task.status === 'DONE') {
      return {
        label: 'Concluída',
        tone: 'done',
      };
    }

    const dueDate = new Date(task.dueDate).getTime();
    const now = Date.now();

    if (dueDate < now) {
      return {
        label: 'Vencida',
        tone: 'critical',
      };
    }

    if (dueDate <= now + 1000 * 60 * 60 * 24) {
      return {
        label: 'Até 24h',
        tone: 'attention',
      };
    }

    return {
      label: 'No prazo',
      tone: 'healthy',
    };
  }

  protected priorityLabel(priority: TaskPriorityLabel): string {
    switch (priority) {
      case 'CRITICAL':
        return 'Critica';
      case 'HIGH':
        return 'Alta';
      case 'MEDIUM':
        return 'Media';
      default:
        return 'Baixa';
    }
  }

  protected isAssignedToCurrentUser(task: Task): boolean {
    const currentUserId = this.currentUser()?.id;
    return currentUserId ? this.isAssignedToUser(task, currentUserId) : false;
  }

  private matchesUserFilter(task: Task, userId: string): boolean {
    if (!userId) {
      return true;
    }

    return this.isAssignedToUser(task, userId);
  }

  private isAssignedToUser(task: Task, userId: string): boolean {
    return task.assignedToAll || task.assignees.some((assignee) => assignee.id === userId);
  }

  private isDueWithinHours(task: Task, hours: number): boolean {
    const dueDate = new Date(task.dueDate).getTime();
    const now = Date.now();

    return dueDate >= now && dueDate <= now + 1000 * 60 * 60 * hours;
  }

  private resetTaskForm(): void {
    this.editingTaskId.set(null);
    this.taskForm.reset({
      title: '',
      description: '',
      dueDate: '',
      assignedToIds: [],
    });
  }

  private toDateTimeLocalValue(value: string): string {
    const date = new Date(value);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  private loadPage(): void {
    if (!this.canManageTasks()) {
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

      return;
    }

    forkJoin({
      tasks: this.tasksService.list(),
      users: this.usersService.list(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ tasks, users }) => {
          this.tasks.set(tasks);
          this.users.set(users);
          this.resetTaskForm();
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
        },
      });
  }
}
