import {
  Component, signal, inject, OnInit, Input, computed,
  ChangeDetectionStrategy, ChangeDetectorRef, ElementRef, ViewChild, AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { TasksService } from '../../core/services/tasks.service';
import { ProjectsService } from '../../core/services/projects.service';
import { SprintsService } from '../../core/services/sprints.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import {
  Task, KanbanBoard, PRIORITY_CONFIG, TASK_STATUS_CONFIG, Priority, Project, Sprint, TaskStatus,
} from '../../core/models';

export type ZoomLevel = 'week' | 'month' | 'quarter';

interface GanttTask {
  task: Task;
  left: number;
  width: number;
  rowIndex: number;
  hasStart: boolean;
}

interface Dependency {
  fromTask: GanttTask;
  toTask: GanttTask;
  rowHeight: number;
}

const ROW_H = 44;
const SIDEBAR_W = 260;

// pixels per day for each zoom
const PX_PER_DAY: Record<ZoomLevel, number> = { week: 56, month: 28, quarter: 14 };

// days shown for each zoom
const DAYS_SHOWN: Record<ZoomLevel, number> = { week: 28, month: 90, quarter: 180 };

@Component({
  selector: 'ag-gantt',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './gantt.component.html',
  styleUrls: ['./gantt.component.scss'],
})
export class GanttComponent implements OnInit, AfterViewInit {
  @Input() id!: string;
  @ViewChild('timelineEl') timelineEl!: ElementRef<HTMLDivElement>;
  @ViewChild('rowsEl')     rowsEl!: ElementRef<HTMLDivElement>;
  @ViewChild('sidebarRows') sidebarRows!: ElementRef<HTMLDivElement>;

  private readonly tasksSvc    = inject(TasksService);
  private readonly projSvc     = inject(ProjectsService);
  private readonly sprintsSvc  = inject(SprintsService);
  private readonly auth        = inject(AuthService);
  private readonly toast       = inject(ToastService);
  private readonly cdr         = inject(ChangeDetectorRef);

  readonly PRIORITY_CONFIG  = PRIORITY_CONFIG;
  readonly STATUS_CONFIG    = TASK_STATUS_CONFIG;
  readonly ROW_H            = ROW_H;
  readonly SIDEBAR_W        = SIDEBAR_W;
  readonly legendStatuses: { key: TaskStatus; label: string }[] = [
    { key: 'BACKLOG',     label: 'Backlog' },
    { key: 'IN_PROGRESS', label: 'Em Andamento' },
    { key: 'IN_REVIEW',   label: 'Em Revisão' },
    { key: 'DONE',        label: 'Concluído' },
  ];

  // ── State ──────────────────────────────────────────────────────────────────
  loading         = signal(true);
  project         = signal<Project | null>(null);
  allTasks        = signal<Task[]>([]);
  sprints         = signal<Sprint[]>([]);
  zoom            = signal<ZoomLevel>('month');
  viewStart       = signal<Date>(this.startOfWeek(new Date()));
  searchQuery     = signal('');

  // ── Inline date edit ──────────────────────────────────────────────────────
  editingStartId  = signal<string | null>(null);
  editingDueId    = signal<string | null>(null);
  dateCtrl        = new FormControl('');

  // ── Derived ───────────────────────────────────────────────────────────────
  readonly pxPerDay = computed(() => PX_PER_DAY[this.zoom()]);
  readonly daysShown = computed(() => DAYS_SHOWN[this.zoom()]);
  readonly timelineW = computed(() => this.daysShown() * this.pxPerDay());

  readonly visibleDays = computed<Date[]>(() => {
    const days: Date[] = [];
    for (let i = 0; i < this.daysShown(); i++) {
      const d = new Date(this.viewStart());
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    return days;
  });

  readonly todayOffset = computed(() => {
    const diff = this.dayDiff(this.viewStart(), new Date());
    return diff * this.pxPerDay();
  });

  readonly filteredTasks = computed(() => {
    const q = this.searchQuery().toLowerCase();
    return this.allTasks().filter((t) =>
      !q || t.title.toLowerCase().includes(q)
    );
  });

  readonly ganttTasks = computed<GanttTask[]>(() => {
    const tasks = this.filteredTasks();
    const start = this.viewStart();
    const ppd    = this.pxPerDay();
    return tasks.map((task, i) => this.computeBar(task, i, start, ppd));
  });

  readonly ganttDeps = computed<Dependency[]>(() => {
    const gtMap = new Map(this.ganttTasks().map((g) => [g.task.id, g]));
    const deps: Dependency[] = [];
    for (const gt of this.ganttTasks()) {
      const blockedBy: any[] = (gt.task as any).blockedBy ?? [];
      for (const dep of blockedBy) {
        const from = gtMap.get(dep.dependsOnId ?? dep.dependsOn?.id);
        if (from) deps.push({ fromTask: from, toTask: gt, rowHeight: ROW_H });
      }
    }
    return deps;
  });

  readonly svgHeight = computed(() => this.ganttTasks().length * ROW_H + 8);

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  ngOnInit() {
    this.projSvc.getOne(this.id).subscribe({
      next: (p) => { this.project.set(p); this.cdr.markForCheck(); },
    });
    this.sprintsSvc.getByProject(this.id).subscribe({
      next: (s) => { this.sprints.set(s); this.cdr.markForCheck(); },
    });
    this.loadBoard();
  }

  ngAfterViewInit() {
    this.scrollToToday();
  }

  loadBoard() {
    this.loading.set(true);
    this.tasksSvc.getKanban(this.id).subscribe({
      next: (board: KanbanBoard) => {
        const flat = [...board.BACKLOG, ...board.IN_PROGRESS, ...board.IN_REVIEW, ...board.DONE];
        this.allTasks.set(flat);
        this.loading.set(false);
        this.cdr.markForCheck();
        setTimeout(() => this.scrollToToday(), 50);
      },
      error: () => this.loading.set(false),
    });
  }

  // ── Zoom & navigation ─────────────────────────────────────────────────────
  setZoom(z: ZoomLevel) {
    this.zoom.set(z);
    this.cdr.markForCheck();
    setTimeout(() => this.scrollToToday(), 50);
  }

  navigatePrev() {
    const d = new Date(this.viewStart());
    d.setDate(d.getDate() - Math.round(this.daysShown() / 2));
    this.viewStart.set(d);
  }

  navigateNext() {
    const d = new Date(this.viewStart());
    d.setDate(d.getDate() + Math.round(this.daysShown() / 2));
    this.viewStart.set(d);
  }

  goToToday() {
    this.viewStart.set(this.startOfWeek(new Date()));
    setTimeout(() => this.scrollToToday(), 50);
  }

  scrollToToday() {
    const el = this.timelineEl?.nativeElement;
    if (!el) return;
    const offset = this.todayOffset() - el.clientWidth / 2;
    el.scrollLeft = Math.max(0, offset);
  }

  onRowsScroll(event: Event) {
    const src = event.target as HTMLElement;
    if (this.sidebarRows?.nativeElement) {
      this.sidebarRows.nativeElement.scrollTop = src.scrollTop;
    }
  }

  // ── Date edit ─────────────────────────────────────────────────────────────
  startEditStart(task: Task) {
    this.editingStartId.set(task.id);
    this.editingDueId.set(null);
    this.dateCtrl.setValue(task.startDate ? task.startDate.substring(0, 10) : '');
  }

  saveStart(task: Task) {
    const v = this.dateCtrl.value || undefined;
    this.tasksSvc.update(task.id, { startDate: v } as any).subscribe({
      next: (updated) => {
        this.allTasks.update((l) => l.map((t) => t.id === task.id ? { ...t, startDate: updated.startDate } : t));
        this.editingStartId.set(null);
        this.cdr.markForCheck();
      },
    });
  }

  startEditDue(task: Task) {
    this.editingDueId.set(task.id);
    this.editingStartId.set(null);
    this.dateCtrl.setValue(task.dueDate ? task.dueDate.substring(0, 10) : '');
  }

  saveDue(task: Task) {
    const v = this.dateCtrl.value || undefined;
    this.tasksSvc.update(task.id, { dueDate: v } as any).subscribe({
      next: (updated) => {
        this.allTasks.update((l) => l.map((t) => t.id === task.id ? { ...t, dueDate: updated.dueDate } : t));
        this.editingDueId.set(null);
        this.cdr.markForCheck();
      },
    });
  }

  cancelEdit() {
    this.editingStartId.set(null);
    this.editingDueId.set(null);
  }

  // ── Bar computation ───────────────────────────────────────────────────────
  private computeBar(task: Task, rowIndex: number, viewStart: Date, ppd: number): GanttTask {
    const startD = task.startDate ? new Date(task.startDate) : task.dueDate ? new Date(task.dueDate) : null;
    const endD   = task.dueDate   ? new Date(task.dueDate)   : startD;

    if (!startD) {
      return { task, left: -9999, width: 0, rowIndex, hasStart: false };
    }

    const left  = this.dayDiff(viewStart, startD) * ppd;
    const days  = endD ? Math.max(1, this.dayDiff(startD, endD) + 1) : 1;
    const width = days * ppd;

    return { task, left, width, rowIndex, hasStart: true };
  }

  // ── SVG arrow helpers ─────────────────────────────────────────────────────
  arrowPath(dep: Dependency): string {
    const from  = dep.fromTask;
    const to    = dep.toTask;
    const x1    = from.left + from.width;
    const y1    = from.rowIndex * ROW_H + ROW_H / 2;
    const x2    = to.left;
    const y2    = to.rowIndex * ROW_H + ROW_H / 2;
    const mid   = (x1 + x2) / 2;
    return `M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`;
  }

  // ── Column header helpers ──────────────────────────────────────────────────
  isToday(d: Date): boolean {
    const t = new Date();
    return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear();
  }

  isWeekend(d: Date): boolean {
    return d.getDay() === 0 || d.getDay() === 6;
  }

  isMonthStart(d: Date): boolean {
    return d.getDate() === 1;
  }

  showDayLabel(d: Date, i: number): boolean {
    const ppd = this.pxPerDay();
    if (ppd >= 40) return true;          // week zoom: every day
    if (ppd >= 20) return d.getDay() === 1; // month: every Monday
    return d.getDate() === 1;            // quarter: 1st of month
  }

  formatDayHeader(d: Date): string {
    const ppd = this.pxPerDay();
    if (ppd >= 40) return d.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric' });
    if (ppd >= 20) return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
    return d.toLocaleDateString('pt-BR', { month: 'short' });
  }

  monthLabel(d: Date): string {
    return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  priorityCfg(p: string) { return PRIORITY_CONFIG[p as Priority] ?? PRIORITY_CONFIG['MEDIUM']; }

  barColor(task: Task): string {
    const s = TASK_STATUS_CONFIG[task.status];
    return task.status === 'DONE' ? '#94a3b8' : s.color;
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  }

  initials(name: string): string {
    const p = name.trim().split(' ');
    return p.length >= 2 ? p[0][0] + p[p.length - 1][0] : p[0].slice(0, 2);
  }

  trackById(_: number, t: { task: Task }) { return t.task.id; }

  private dayDiff(a: Date, b: Date): number {
    const ms = b.getTime() - a.getTime();
    return Math.round(ms / 86_400_000);
  }

  private startOfWeek(d: Date): Date {
    const result = new Date(d);
    const day = result.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    result.setDate(result.getDate() + diff);
    result.setHours(0, 0, 0, 0);
    return result;
  }
}
