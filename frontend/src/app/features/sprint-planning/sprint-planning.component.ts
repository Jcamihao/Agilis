import {
  Component, OnInit, inject, signal, computed, ChangeDetectionStrategy, ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DragDropModule, CdkDragDrop, transferArrayItem } from '@angular/cdk/drag-drop';
import { SprintsService } from '../../core/services/sprints.service';
import { TasksService } from '../../core/services/tasks.service';
import { Sprint, Task, KanbanBoard, SprintStatus } from '../../core/models';

interface SprintLane {
  sprint: Sprint | null;
  tasks: Task[];
}

const STATUS_ORDER: Record<SprintStatus, number> = { ACTIVE: 0, PLANNED: 1, COMPLETED: 2 };

@Component({
  selector: 'ag-sprint-planning',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, RouterLink, DragDropModule],
  templateUrl: './sprint-planning.component.html',
  styleUrls: ['./sprint-planning.component.scss'],
})
export class SprintPlanningComponent implements OnInit {
  private readonly route    = inject(ActivatedRoute);
  private readonly sprintSvc = inject(SprintsService);
  private readonly tasksSvc  = inject(TasksService);
  private readonly cdr       = inject(ChangeDetectorRef);

  readonly id = this.route.snapshot.paramMap.get('id') ?? '';
  readonly Math = Math;

  lanes      = signal<SprintLane[]>([]);
  allSprints = signal<Sprint[]>([]);
  loading    = signal(true);
  showCreate = signal(false);
  updating   = signal<string | null>(null);

  // Create sprint form
  newName      = '';
  newGoal      = '';
  newStartDate = '';
  newEndDate   = '';

  connectedLaneIds = computed(() => this.lanes().map(l => this.laneId(l)));

  ngOnInit() { this.loadAll(); }

  loadAll() {
    this.loading.set(true);
    let sprintsLoaded = false;
    let tasksLoaded = false;
    let sprints: Sprint[] = [];
    let tasks: Task[] = [];

    const tryBuild = () => {
      if (!sprintsLoaded || !tasksLoaded) return;
      this.buildLanes(sprints, tasks);
      this.loading.set(false);
      this.cdr.markForCheck();
    };

    this.sprintSvc.getByProject(this.id).subscribe({
      next: (list) => { sprints = list; sprintsLoaded = true; this.allSprints.set(list); tryBuild(); },
      error: () => { sprintsLoaded = true; tryBuild(); },
    });

    this.tasksSvc.getKanban(this.id).subscribe({
      next: (board: KanbanBoard) => {
        tasks = [...board.BACKLOG, ...board.IN_PROGRESS, ...board.IN_REVIEW, ...board.DONE];
        tasksLoaded = true;
        tryBuild();
      },
      error: () => { tasksLoaded = true; tryBuild(); },
    });
  }

  private buildLanes(sprints: Sprint[], tasks: Task[]) {
    const sorted = [...sprints].sort((a, b) =>
      (STATUS_ORDER[a.status] ?? 3) - (STATUS_ORDER[b.status] ?? 3),
    );

    const backlog: Task[] = tasks.filter(t => !t.sprintId);
    const lanes: SprintLane[] = [{ sprint: null, tasks: backlog }];

    for (const s of sorted) {
      lanes.push({
        sprint: s,
        tasks: tasks.filter(t => t.sprintId === s.id),
      });
    }

    this.lanes.set(lanes);
  }

  laneId(lane: SprintLane): string {
    return 'lane-' + (lane.sprint?.id ?? 'backlog');
  }

  onDrop(event: CdkDragDrop<Task[]>, targetSprintId: string | null) {
    if (event.previousContainer === event.container) return;

    const task: Task = event.item.data;
    transferArrayItem(
      event.previousContainer.data,
      event.container.data,
      event.previousIndex,
      event.currentIndex,
    );

    this.updating.set(task.id);
    this.tasksSvc.update(task.id, { sprintId: targetSprintId } as any).subscribe({
      next: () => { this.updating.set(null); this.cdr.markForCheck(); },
      error: () => {
        // rollback
        transferArrayItem(event.container.data, event.previousContainer.data, event.currentIndex, event.previousIndex);
        this.updating.set(null);
        this.cdr.markForCheck();
      },
    });
  }

  createSprint() {
    if (!this.newName.trim()) return;
    this.sprintSvc.create({
      projectId: this.id,
      name: this.newName.trim(),
      goal: this.newGoal || undefined,
      startDate: this.newStartDate || undefined,
      endDate: this.newEndDate || undefined,
    }).subscribe({
      next: (sprint) => {
        this.allSprints.update(list => [sprint, ...list]);
        this.lanes.update(list => [...list, { sprint, tasks: [] }]);
        this.newName = '';
        this.newGoal = '';
        this.newStartDate = '';
        this.newEndDate = '';
        this.showCreate.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  updateSprintStatus(sprint: Sprint, status: SprintStatus) {
    this.sprintSvc.updateStatus(sprint.id, status).subscribe({
      next: () => {
        const updated = { ...sprint, status };
        this.allSprints.update(list => list.map(s => s.id === sprint.id ? updated : s));
        this.lanes.update(list =>
          list.map(l => l.sprint?.id === sprint.id ? { ...l, sprint: updated } : l),
        );
        this.cdr.markForCheck();
      },
    });
  }

  burndownData = signal<{ sprintId: string; sprintName: string; total: number; days: { date: string; ideal: number; actual: number }[] } | null>(null);
  burndownLoading = signal(false);
  activeBurndownSprintId = signal<string | null>(null);

  loadBurndown(sprintId: string) {
    if (this.activeBurndownSprintId() === sprintId) {
      this.activeBurndownSprintId.set(null);
      this.burndownData.set(null);
      return;
    }
    this.burndownLoading.set(true);
    this.activeBurndownSprintId.set(sprintId);
    this.sprintSvc.getBurndown(sprintId).subscribe({
      next: (data: any) => {
        this.burndownData.set(data?.data ?? data);
        this.burndownLoading.set(false);
        this.cdr.markForCheck();
      },
      error: () => this.burndownLoading.set(false),
    });
  }

  burndownPath(key: 'ideal' | 'actual'): string {
    const d = this.burndownData();
    if (!d || !d.days.length) return '';
    const W = 600, H = 200;
    const maxY = d.total || 1;
    const pts = d.days.map((day, i) => {
      const x = (i / (d.days.length - 1)) * W;
      const y = H - (day[key] / maxY) * H;
      return `${x},${y}`;
    });
    return 'M' + pts.join('L');
  }

  burndownXLabels(): { x: number; label: string }[] {
    const d = this.burndownData();
    if (!d || !d.days.length) return [];
    const W = 600;
    const step = Math.max(1, Math.floor(d.days.length / 6));
    return d.days
      .filter((_, i) => i % step === 0 || i === d.days.length - 1)
      .map((day, _, arr) => {
        const i = d.days.indexOf(day);
        return { x: (i / (d.days.length - 1)) * W, label: day.date.slice(5) };
      });
  }

  doneTasks(lane: SprintLane): number {
    return lane.tasks.filter(t => t.status === 'DONE').length;
  }

  progressPct(lane: SprintLane): number {
    if (!lane.tasks.length) return 0;
    return Math.round((this.doneTasks(lane) / lane.tasks.length) * 100);
  }

  priorityColor(p: string): string {
    const m: Record<string, string> = {
      CRITICAL: '#ef4444',
      HIGH:     '#f97316',
      MEDIUM:   '#f59e0b',
      LOW:      '#22c55e',
    };
    return m[p] ?? '#94a3b8';
  }

  statusLabel(s: string): string {
    const m: Record<string, string> = {
      BACKLOG:     'Backlog',
      IN_PROGRESS: 'Em Progresso',
      IN_REVIEW:   'Em Revisão',
      DONE:        'Concluída',
    };
    return m[s] ?? s;
  }

  statusColor(s: string): string {
    const m: Record<string, string> = {
      BACKLOG:     '#64748b',
      IN_PROGRESS: '#3b82f6',
      IN_REVIEW:   '#8b5cf6',
      DONE:        '#22c55e',
    };
    return m[s] ?? '#64748b';
  }

  sprintStatusLabel(s: SprintStatus): string {
    const m: Record<SprintStatus, string> = { PLANNED: 'Planejado', ACTIVE: 'Ativo', COMPLETED: 'Concluído' };
    return m[s] ?? s;
  }

  sprintStatusColor(s: SprintStatus): string {
    const m: Record<SprintStatus, string> = { PLANNED: '#64748b', ACTIVE: '#22c55e', COMPLETED: '#818cf8' };
    return m[s] ?? '#64748b';
  }

  formatDate(d?: string): string {
    if (!d) return '';
    return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  }

  isOverdue(dueDate: string): boolean {
    return new Date(dueDate) < new Date();
  }
}
