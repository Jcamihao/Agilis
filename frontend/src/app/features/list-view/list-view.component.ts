import {
  Component, signal, inject, OnInit, Input, computed,
  ChangeDetectionStrategy, ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TasksService } from '../../core/services/tasks.service';
import { ProjectsService } from '../../core/services/projects.service';
import { SprintsService } from '../../core/services/sprints.service';
import { UsersService, CompanyMember } from '../../core/services/users.service';
import { AuthService } from '../../core/services/auth.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { ToastService } from '../../core/services/toast.service';
import {
  Task, TaskStatus, KanbanBoard, TASK_STATUS_CONFIG, PRIORITY_CONFIG, Priority, Project, Sprint,
} from '../../core/models';

type SortField = 'title' | 'status' | 'priority' | 'assignee' | 'dueDate' | 'createdAt' | 'sprint';
type SortDir = 'asc' | 'desc';

const PRIORITY_ORDER: Record<Priority, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
const STATUS_ORDER: Record<TaskStatus, number> = { BACKLOG: 1, IN_PROGRESS: 2, IN_REVIEW: 3, DONE: 4 };

@Component({
  selector: 'ag-list-view',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './list-view.component.html',
})
export class ListViewComponent implements OnInit {
  @Input() id!: string;

  readonly tasksService    = inject(TasksService);
  private readonly projectsService = inject(ProjectsService);
  private readonly sprintsService  = inject(SprintsService);
  private readonly usersService    = inject(UsersService);
  private readonly auth            = inject(AuthService);
  private readonly confirm         = inject(ConfirmService);
  private readonly toast           = inject(ToastService);
  private readonly fb              = inject(FormBuilder);
  private readonly cdr             = inject(ChangeDetectorRef);

  readonly PRIORITY_CONFIG = PRIORITY_CONFIG;
  readonly STATUS_CONFIG = TASK_STATUS_CONFIG;
  readonly statusOptions = Object.entries(TASK_STATUS_CONFIG).map(([k, v]) => ({ key: k as TaskStatus, ...v }));
  readonly priorityOptions = Object.entries(PRIORITY_CONFIG).map(([k, v]) => ({ key: k as Priority, ...v }));

  // ── State ──────────────────────────────────────────────────────────────────
  loading        = signal(true);
  project        = signal<Project | null>(null);
  allTasks       = signal<Task[]>([]);
  sprints        = signal<Sprint[]>([]);
  companyMembers = signal<CompanyMember[]>([]);
  membersLoaded  = signal(false);

  // ── Sorting ────────────────────────────────────────────────────────────────
  sortField = signal<SortField>('createdAt');
  sortDir   = signal<SortDir>('desc');

  // ── Filters ────────────────────────────────────────────────────────────────
  searchQuery      = signal('');
  filterStatus     = signal<TaskStatus | ''>('');
  filterPriority   = signal<Priority | ''>('');
  filterAssigneeId = signal<string>('');
  selectedSprintId = signal<string>('');

  // ── Bulk selection ─────────────────────────────────────────────────────────
  selectedIds    = signal<Set<string>>(new Set());
  bulkStatus     = signal<TaskStatus | ''>('');

  // ── Inline editing ────────────────────────────────────────────────────────
  editingTitleId = signal<string | null>(null);
  titleControl   = new FormControl('', Validators.required);

  // ── Detail modal (re-uses kanban service flow) ────────────────────────────
  detailTask = signal<Task | null>(null);

  // ── Create modal ──────────────────────────────────────────────────────────
  showCreateModal = signal(false);
  creating = signal(false);
  createForm = this.fb.group({
    title:       ['', Validators.required],
    description: [''],
    status:      ['BACKLOG'],
    priority:    ['MEDIUM'],
    dueDate:     [''],
    sprintId:    [''],
    assigneeId:  [''],
  });

  // ── Derived: filtered + sorted list ──────────────────────────────────────
  readonly displayedTasks = computed(() => {
    let list = this.allTasks();

    const q = this.searchQuery().toLowerCase().trim();
    if (q) list = list.filter((t) => t.title.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q));

    const st = this.filterStatus();
    if (st) list = list.filter((t) => t.status === st);

    const pr = this.filterPriority();
    if (pr) list = list.filter((t) => t.priority === pr);

    const aid = this.filterAssigneeId();
    if (aid) list = list.filter((t) => t.assigneeId === aid);

    const sid = this.selectedSprintId();
    if (sid) list = list.filter((t) => t.sprintId === sid);

    const field = this.sortField();
    const dir   = this.sortDir() === 'asc' ? 1 : -1;

    list = [...list].sort((a, b) => {
      switch (field) {
        case 'title':     return dir * a.title.localeCompare(b.title);
        case 'status':    return dir * (STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
        case 'priority':  return dir * (PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
        case 'assignee':  return dir * (a.assignee?.name ?? '').localeCompare(b.assignee?.name ?? '');
        case 'sprint':    return dir * (a.sprint?.name ?? '').localeCompare(b.sprint?.name ?? '');
        case 'dueDate':   return dir * ((a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'));
        case 'createdAt': return dir * a.createdAt.localeCompare(b.createdAt);
        default:          return 0;
      }
    });

    return list;
  });

  readonly allSelected = computed(() => {
    const displayed = this.displayedTasks();
    return displayed.length > 0 && displayed.every((t) => this.selectedIds().has(t.id));
  });

  readonly someSelected = computed(() => this.selectedIds().size > 0);

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  ngOnInit() {
    this.projectsService.getOne(this.id).subscribe({
      next: (p) => { this.project.set(p); this.cdr.markForCheck(); },
    });
    this.loadBoard();
    this.sprintsService.getByProject(this.id).subscribe({
      next: (list) => { this.sprints.set(list); this.cdr.markForCheck(); },
    });
    this.loadCompanyMembers();
  }

  loadBoard() {
    this.loading.set(true);
    this.tasksService.getKanban(this.id).subscribe({
      next: (board: KanbanBoard) => {
        const flat = [
          ...board.BACKLOG, ...board.IN_PROGRESS, ...board.IN_REVIEW, ...board.DONE,
        ];
        this.allTasks.set(flat);
        this.loading.set(false);
        this.cdr.markForCheck();
      },
      error: () => this.loading.set(false),
    });
  }

  loadCompanyMembers() {
    if (this.membersLoaded()) return;
    const cid = this.auth.currentCompanyId();
    if (!cid) return;
    this.usersService.getCompanyMembers(cid).subscribe({
      next: (m) => { this.companyMembers.set(m); this.membersLoaded.set(true); this.cdr.markForCheck(); },
    });
  }

  // ── Sorting ────────────────────────────────────────────────────────────────
  sort(field: SortField) {
    if (this.sortField() === field) {
      this.sortDir.update((d) => d === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortField.set(field);
      this.sortDir.set('asc');
    }
  }

  sortIcon(field: SortField): string {
    if (this.sortField() !== field) return 'unfold_more';
    return this.sortDir() === 'asc' ? 'arrow_upward' : 'arrow_downward';
  }

  // ── Selection ─────────────────────────────────────────────────────────────
  toggleSelect(id: string) {
    this.selectedIds.update((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  toggleSelectAll() {
    if (this.allSelected()) {
      this.selectedIds.set(new Set());
    } else {
      this.selectedIds.set(new Set(this.displayedTasks().map((t) => t.id)));
    }
  }

  clearSelection() {
    this.selectedIds.set(new Set());
    this.bulkStatus.set('');
  }

  // ── Bulk actions ──────────────────────────────────────────────────────────
  async bulkDelete() {
    const count = this.selectedIds().size;
    const ok = await this.confirm.open({
      title: 'Deletar tarefas',
      message: `Deletar ${count} tarefa(s) selecionada(s)? Esta ação é irreversível.`,
      danger: true,
      confirmLabel: `Deletar ${count}`,
    });
    if (!ok) return;

    const ids = [...this.selectedIds()];
    await Promise.all(ids.map((id) => this.tasksService.delete(id).toPromise().catch(() => {})));
    this.allTasks.update((list) => list.filter((t) => !ids.includes(t.id)));
    this.clearSelection();
    this.toast.success(`${count} tarefa(s) removida(s).`);
    this.cdr.markForCheck();
  }

  async bulkChangeStatus(status: TaskStatus) {
    const ids = [...this.selectedIds()];
    await Promise.all(
      ids.map((id) =>
        this.tasksService.moveTask(id, status, 0).toPromise().catch(() => {})
      )
    );
    this.allTasks.update((list) => list.map((t) => ids.includes(t.id) ? { ...t, status } : t));
    this.clearSelection();
    this.toast.success(`Status atualizado para ${TASK_STATUS_CONFIG[status].label}.`);
    this.cdr.markForCheck();
  }

  // ── Inline title edit ─────────────────────────────────────────────────────
  startEditTitle(task: Task) {
    this.titleControl.setValue(task.title);
    this.editingTitleId.set(task.id);
  }

  saveTitle(task: Task) {
    const title = this.titleControl.value?.trim();
    if (!title) { this.cancelTitle(); return; }
    this.tasksService.update(task.id, { title } as any).subscribe({
      next: (updated) => {
        this.allTasks.update((list) => list.map((t) => t.id === task.id ? { ...t, title: updated.title } : t));
        this.editingTitleId.set(null);
        this.cdr.markForCheck();
      },
    });
  }

  cancelTitle() { this.editingTitleId.set(null); }

  // ── Inline field updates ──────────────────────────────────────────────────
  updateStatus(task: Task, event: Event) {
    const status = (event.target as HTMLSelectElement).value as TaskStatus;
    this.tasksService.moveTask(task.id, status, task.position).subscribe({
      next: (updated) => {
        this.allTasks.update((list) => list.map((t) => t.id === task.id ? { ...t, status: updated.status } : t));
        this.cdr.markForCheck();
      },
    });
  }

  updatePriority(task: Task, event: Event) {
    const priority = (event.target as HTMLSelectElement).value as Priority;
    this.tasksService.update(task.id, { priority } as any).subscribe({
      next: (updated) => {
        this.allTasks.update((list) => list.map((t) => t.id === task.id ? { ...t, priority: updated.priority } : t));
        this.cdr.markForCheck();
      },
    });
  }

  updateDueDate(task: Task, event: Event) {
    const dueDate = (event.target as HTMLInputElement).value || undefined;
    this.tasksService.update(task.id, { dueDate } as any).subscribe({
      next: (updated) => {
        this.allTasks.update((list) => list.map((t) => t.id === task.id ? { ...t, dueDate: updated.dueDate } : t));
        this.cdr.markForCheck();
      },
    });
  }

  updateAssignee(task: Task, event: Event) {
    const assigneeId = (event.target as HTMLSelectElement).value || null;
    this.tasksService.update(task.id, { assigneeId } as any).subscribe({
      next: (updated) => {
        const member = assigneeId ? this.companyMembers().find((m) => m.id === assigneeId) : undefined;
        const assignee = member ? { id: member.id, name: member.name, avatarUrl: member.avatarUrl } : undefined;
        this.allTasks.update((list) => list.map((t) =>
          t.id === task.id ? { ...t, assigneeId: assigneeId ?? undefined, assignee } : t
        ));
        this.cdr.markForCheck();
      },
    });
  }

  // ── Row delete ─────────────────────────────────────────────────────────────
  async deleteTask(task: Task, event: MouseEvent) {
    event.stopPropagation();
    const ok = await this.confirm.open({
      title: 'Deletar tarefa',
      message: `Deletar "${task.title}"?`,
      danger: true,
    });
    if (!ok) return;
    this.tasksService.delete(task.id).subscribe({
      next: () => {
        this.allTasks.update((list) => list.filter((t) => t.id !== task.id));
        this.cdr.markForCheck();
      },
    });
  }

  // ── Create modal ──────────────────────────────────────────────────────────
  openCreate() {
    this.createForm.reset({ status: 'BACKLOG', priority: 'MEDIUM' });
    this.showCreateModal.set(true);
  }

  closeCreate() {
    this.showCreateModal.set(false);
    this.creating.set(false);
  }

  createTask() {
    if (this.createForm.invalid) return;
    this.creating.set(true);
    const v = this.createForm.value;
    this.tasksService.create({
      ...(v as any),
      projectId: this.id,
      assigneeId: v.assigneeId || undefined,
      sprintId: v.sprintId || undefined,
    }).subscribe({
      next: (task) => {
        this.allTasks.update((list) => [task, ...list]);
        this.closeCreate();
        this.cdr.markForCheck();
      },
      error: () => this.creating.set(false),
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  isOverdue(date: string | undefined): boolean {
    return !!date && new Date(date) < new Date();
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  }

  subtaskCount(task: Task): number {
    return (task as any)._count?.subtasks ?? 0;
  }

  initials(name: string): string {
    const parts = name.trim().split(' ');
    return parts.length >= 2 ? parts[0][0] + parts[parts.length - 1][0] : parts[0].slice(0, 2);
  }

  trackById(_: number, t: Task) { return t.id; }
}
