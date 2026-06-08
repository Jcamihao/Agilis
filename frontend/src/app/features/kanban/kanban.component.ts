import {
  Component, signal, inject, OnInit, Input,
  ChangeDetectionStrategy, ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormControl, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem,
} from '@angular/cdk/drag-drop';
import { TasksService } from '../../core/services/tasks.service';
import { ProjectsService } from '../../core/services/projects.service';
import { SprintsService } from '../../core/services/sprints.service';
import { AuthService } from '../../core/services/auth.service';
import { UsersService, CompanyMember } from '../../core/services/users.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { Router } from '@angular/router';
import { CommentSectionComponent } from '../../shared/components/comment-section/comment-section.component';
import { TimeTrackerComponent } from '../../shared/components/time-tracker/time-tracker.component';
import {
  Task, TaskStatus, KanbanBoard, TASK_STATUS_CONFIG, PRIORITY_CONFIG, Priority, Project, Sprint
} from '../../core/models';

interface Column {
  key: TaskStatus;
  label: string;
  icon: string;
  color: string;
  tasks: Task[];
}

@Component({
  selector: 'ag-kanban',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, DragDropModule, ReactiveFormsModule, CommentSectionComponent, TimeTrackerComponent],
  templateUrl: './kanban.component.html',
  styleUrls: ['./kanban.component.scss'],
})
export class KanbanComponent implements OnInit {
  @Input() id!: string;

  readonly tasksService    = inject(TasksService);
  private readonly projectsService = inject(ProjectsService);
  private readonly sprintsService  = inject(SprintsService);
  private readonly usersService    = inject(UsersService);
  private readonly auth            = inject(AuthService);
  private readonly router          = inject(Router);
  private readonly fb              = inject(FormBuilder);
  private readonly cdr             = inject(ChangeDetectorRef);
  private readonly confirm         = inject(ConfirmService);

  readonly PRIORITY_CONFIG = PRIORITY_CONFIG;
  readonly STATUS_CONFIG = TASK_STATUS_CONFIG;
  readonly Math = Math;

  // ── State ──────────────────────────────────────────────────────────────────
  loading = signal(true);
  creating = signal(false);
  showCreateModal = signal(false);
  quickCreateStatus = signal<TaskStatus>('BACKLOG');
  project = signal<Project | null>(null);
  detailTask = signal<Task | null>(null);
  editingTitle = signal(false);
  editingDesc = signal(false);
  isDragging = signal(false);
  showAssigneePicker = signal(false);
  showParticipantPicker = signal(false);
  companyMembers = signal<CompanyMember[]>([]);

  // ── Create modal pickers ───────────────────────────────────────────────────
  createAssignee = signal<CompanyMember | null>(null);
  createParticipants = signal<CompanyMember[]>([]);
  showCreateAssigneePicker = signal(false);
  showCreateParticipantPicker = signal(false);
  membersLoaded = signal(false);

  // ── Filters ────────────────────────────────────────────────────────────────
  searchQuery      = signal('');
  activeFilter     = signal<'member' | 'label' | 'more' | null>(null);
  selectedSprintId = signal<string>('');

  // ── Sprints ────────────────────────────────────────────────────────────────
  sprints          = signal<Sprint[]>([]);
  showSprintModal  = signal(false);
  creatingSprint   = signal(false);

  sprintForm = this.fb.group({
    name:      ['', Validators.required],
    goal:      [''],
    startDate: [''],
    endDate:   [''],
  });

  sprintStatusLabel: Record<string, string> = {
    PLANNED:   'Planejada',
    ACTIVE:    'Ativa',
    COMPLETED: 'Concluída',
  };

  sprintStatusColor: Record<string, string> = {
    PLANNED:   '#94a3b8',
    ACTIVE:    '#6366f1',
    COMPLETED: '#10b981',
  };

  // ── Subtasks ───────────────────────────────────────────────────────────────
  subtasks         = signal<any[]>([]);
  subtasksLoading  = signal(false);
  showSubtasks     = signal(false);
  newSubtaskTitle  = signal('');
  creatingSubtask  = signal(false);
  expandedCards    = signal<Set<string>>(new Set());

  // ── Dependencies ──────────────────────────────────────────────────────────
  dependencies     = signal<{ blockedBy: any[]; blocking: any[] }>({ blockedBy: [], blocking: [] });

  // ── Config modal ──────────────────────────────────────────────────────────
  showConfig    = signal(false);
  configTab     = signal<'general' | 'columns' | 'members' | 'danger'>('general');
  configSaving  = signal(false);
  configToast   = signal('');
  memberSearch  = signal('');
  addMemberSearch = signal('');
  private configToastTimer: any;

  readonly DEFAULT_COLUMNS: Record<string, string> = {
    BACKLOG:     'Backlog',
    IN_PROGRESS: 'Em Progresso',
    IN_REVIEW:   'Em Revisão',
    DONE:        'Concluído',
  };

  columnLabels = signal<Record<string, string>>({ ...this.DEFAULT_COLUMNS });

  openMenuMemberId = signal<string | null>(null);

  configForm = this.fb.group({
    name:  ['', Validators.required],
    color: ['#6366f1'],
    icon:  ['folder'],
    description: [''],
  });

  private wasDragged = false;

  columns = signal<Column[]>([
    { key: 'BACKLOG',     label: 'Backlog',      icon: 'circle',       color: '#94a3b8', tasks: [] },
    { key: 'IN_PROGRESS', label: 'Em Progresso', icon: 'autorenew',    color: '#4648d4', tasks: [] },
    { key: 'IN_REVIEW',   label: 'Em Revisão',   icon: 'rate_review',  color: '#8b5cf6', tasks: [] },
    { key: 'DONE',        label: 'Concluído',    icon: 'check_circle', color: '#10b981', tasks: [] },
  ]);

  connectedLists: TaskStatus[] = ['BACKLOG', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];

  statusOptions   = Object.entries(TASK_STATUS_CONFIG).map(([k, v]) => ({ key: k as TaskStatus, label: v.label }));
  priorityOptions = Object.entries(PRIORITY_CONFIG).map(([k, v])    => ({ key: k as Priority,   label: v.label }));

  titleControl = new FormControl('', Validators.required);
  descControl  = new FormControl('');

  createForm = this.fb.group({
    title:       ['', Validators.required],
    description: [''],
    status:      ['BACKLOG'],
    priority:    ['MEDIUM'],
    dueDate:     [''],
    sprintId:    [''],
  });

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  ngOnInit() {
    this.projectsService.getOne(this.id).subscribe({
      next: (p) => {
        this.project.set(p);
        const cfg = (p as any).columnConfig as Record<string, string> | null;
        if (cfg) this.columnLabels.set({ ...this.DEFAULT_COLUMNS, ...cfg });
        this.cdr.markForCheck();
      },
    });
    this.loadBoard();
    this.loadCompanyMembers();
    this.loadSprints();
  }

  // ── Sprint methods ────────────────────────────────────────────────────────
  loadSprints() {
    this.sprintsService.getByProject(this.id).subscribe({
      next: (list) => { this.sprints.set(list); this.cdr.markForCheck(); },
    });
  }

  openSprintModal() {
    this.sprintForm.reset();
    this.showSprintModal.set(true);
  }

  closeSprintModal() {
    this.showSprintModal.set(false);
    this.creatingSprint.set(false);
  }

  createSprint() {
    if (this.sprintForm.invalid) return;
    const v = this.sprintForm.value;
    this.creatingSprint.set(true);
    this.sprintsService.create({
      name: v.name!,
      goal: v.goal || undefined,
      startDate: v.startDate || undefined,
      endDate: v.endDate || undefined,
      projectId: this.id,
    }).subscribe({
      next: (sprint) => {
        this.sprints.update((list) => [sprint, ...list]);
        this.closeSprintModal();
        this.cdr.markForCheck();
      },
      error: () => this.creatingSprint.set(false),
    });
  }

  assignTaskToSprint(sprintId: string | null) {
    const task = this.detailTask();
    if (!task) return;
    this.tasksService.update(task.id, { sprintId } as any).subscribe({
      next: (updated) => {
        const sprint = sprintId ? this.sprints().find((s) => s.id === sprintId) ?? null : null;
        this.detailTask.update((t) => t ? { ...t, sprintId: sprintId ?? undefined, sprint: sprint ?? undefined } : t);
        this.updateCardInBoard(updated);
        this.cdr.markForCheck();
      },
    });
  }

  // ── Config modal ──────────────────────────────────────────────────────────
  openConfig() {
    const p = this.project();
    if (!p) return;
    this.configForm.reset({ name: p.name, color: p.color, icon: p.icon, description: p.description ?? '' });
    this.configTab.set('general');
    this.memberSearch.set('');
    this.addMemberSearch.set('');
    this.showConfig.set(true);
  }

  closeConfig() {
    this.showConfig.set(false);
    this.openMenuMemberId.set(null);
  }

  // ── General settings ──────────────────────────────────────────────────────
  saveGeneral() {
    if (this.configForm.invalid) return;
    this.configSaving.set(true);
    this.projectsService.update(this.id, this.configForm.value as any).subscribe({
      next: (updated) => {
        this.project.update((p) => p ? { ...p, ...updated } : p);
        this.configForm.markAsPristine();
        this.configSaving.set(false);
        this.showConfigToast('Projeto atualizado!');
        this.cdr.markForCheck();
      },
      error: () => this.configSaving.set(false),
    });
  }

  projectColors = ['#6366f1', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#0ea5e9', '#84cc16'];

  // ── Columns ───────────────────────────────────────────────────────────────
  setColumnLabel(key: string, value: string) {
    this.columnLabels.update((c) => ({ ...c, [key]: value }));
  }

  saveColumns() {
    this.configSaving.set(true);
    this.projectsService.updateColumns(this.id, this.columnLabels()).subscribe({
      next: (updated) => {
        const cfg = (updated as any).columnConfig as Record<string, string> | null;
        if (cfg) this.columnLabels.set({ ...this.DEFAULT_COLUMNS, ...cfg });
        // update column display labels on the board
        this.columns.update((cols) => cols.map((col) => ({ ...col, label: this.columnLabels()[col.key] ?? col.label })));
        this.configSaving.set(false);
        this.showConfigToast('Colunas atualizadas!');
        this.cdr.markForCheck();
      },
      error: () => this.configSaving.set(false),
    });
  }

  resetColumnLabel(key: string) {
    this.columnLabels.update((c) => ({ ...c, [key]: this.DEFAULT_COLUMNS[key] }));
  }

  // ── Members ───────────────────────────────────────────────────────────────
  projectMembers() {
    const q = this.memberSearch().toLowerCase().trim();
    const members = (this.project() as any)?.members ?? [];
    if (!q) return members;
    return members.filter((m: any) => m.user?.name?.toLowerCase().includes(q) || m.user?.email?.toLowerCase().includes(q));
  }

  availableToAddProject(): CompanyMember[] {
    const existing = new Set(((this.project() as any)?.members ?? []).map((m: any) => m.userId));
    const q = this.addMemberSearch().toLowerCase().trim();
    return this.companyMembers().filter((c) => {
      if (existing.has(c.id)) return false;
      if (!q) return true;
      return c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q);
    });
  }

  addProjectMember(member: CompanyMember) {
    this.projectsService.addMember(this.id, member.id).subscribe({
      next: (updated) => {
        this.project.set(updated);
        this.addMemberSearch.set('');
        this.showConfigToast(`${member.name} adicionado!`);
        this.cdr.markForCheck();
      },
    });
  }

  removeProjectMember(userId: string, name: string) {
    this.openMenuMemberId.set(null);
    this.projectsService.removeMember(this.id, userId).subscribe({
      next: (updated) => {
        this.project.set(updated);
        this.showConfigToast(`${name} removido do projeto`);
        this.cdr.markForCheck();
      },
    });
  }

  changeProjectMemberRole(userId: string, role: string) {
    this.openMenuMemberId.set(null);
    this.projectsService.addMember(this.id, userId, role).subscribe({
      next: (updated) => { this.project.set(updated); this.showConfigToast('Papel atualizado!'); this.cdr.markForCheck(); },
    });
  }

  // ── Archive ───────────────────────────────────────────────────────────────
  async archiveProject() {
    const ok = await this.confirm.open({
      title: 'Arquivar projeto',
      message: `Arquivar o projeto "${this.project()?.name}"? Ele ficará oculto mas pode ser restaurado.`,
      confirmLabel: 'Arquivar',
      danger: true,
    });
    if (!ok) return;
    this.projectsService.archive(this.id).subscribe({
      next: () => { this.router.navigate(['/projects']); },
    });
  }

  private showConfigToast(msg: string) {
    this.configToast.set(msg);
    clearTimeout(this.configToastTimer);
    this.configToastTimer = setTimeout(() => this.configToast.set(''), 3000);
  }

  projectRoleOptions = [
    { key: 'OWNER', label: 'Dono' },
    { key: 'ADMIN', label: 'Admin' },
    { key: 'MEMBER', label: 'Membro' },
    { key: 'VIEWER', label: 'Visualizador' },
  ];

  resetAllColumns() { this.columnLabels.set({ ...this.DEFAULT_COLUMNS }); }

  hasManyProjectMembers(): boolean {
    return ((this.project() as any)?.members ?? []).length > 4;
  }

  // ── Board load ─────────────────────────────────────────────────────────────
  loadBoard() {
    this.loading.set(true);
    this.tasksService.getKanban(this.id).subscribe({
      next: (board: KanbanBoard) => {
        this.columns.update((cols) =>
          cols.map((col) => ({
            ...col,
            tasks: (board[col.key] ?? []).sort((a, b) => a.position - b.position),
          }))
        );
        this.loading.set(false);
        this.cdr.markForCheck();
      },
      error: () => this.loading.set(false),
    });
  }

  // ── Filter ─────────────────────────────────────────────────────────────────
  filteredTasks(column: Column): Task[] {
    let tasks = column.tasks;
    const sprintId = this.selectedSprintId();
    if (sprintId) tasks = tasks.filter((t) => t.sprintId === sprintId);
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return tasks;
    return tasks.filter((t) =>
      t.title.toLowerCase().includes(q) ||
      t.description?.toLowerCase().includes(q)
    );
  }

  filterBy(filter: 'member' | 'label' | 'more') {
    this.activeFilter.set(this.activeFilter() === filter ? null : filter);
  }

  // ── Drag & Drop ────────────────────────────────────────────────────────────
  onDragStart() {
    this.wasDragged = true;
    this.isDragging.set(true);
  }

  onDragEnd() {
    this.isDragging.set(false);
    setTimeout(() => { this.wasDragged = false; }, 0);
  }

  onDrop(event: CdkDragDrop<Task[]>, targetStatus: TaskStatus) {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex,
      );
    }
    this.cdr.markForCheck();

    const task = event.container.data[event.currentIndex];
    const position = this.calculatePosition(event.container.data, event.currentIndex);

    this.tasksService.moveTask(task.id, targetStatus, position).subscribe({
      next: (updated) => {
        event.container.data[event.currentIndex] = { ...task, ...updated };
        if (this.detailTask()?.id === task.id) {
          this.detailTask.update((t) => t ? { ...t, status: targetStatus, position } : t);
        }
        this.cdr.markForCheck();
      },
    });
  }

  // ── Task Detail Modal ──────────────────────────────────────────────────────
  openDetail(task: Task) {
    if (this.wasDragged) return;
    this.tasksService.getOne(task.id).subscribe({
      next: (full) => { this.detailTask.set(full); this.cdr.markForCheck(); },
      error: () => this.detailTask.set(task),
    });
    this.loadCompanyMembers();
  }

  closeDetail() {
    this.detailTask.set(null);
    this.editingTitle.set(false);
    this.editingDesc.set(false);
    this.showAssigneePicker.set(false);
    this.showParticipantPicker.set(false);
  }

  loadCompanyMembers() {
    if (this.membersLoaded()) return;
    const cid = this.auth.currentCompanyId();
    if (!cid) return;
    this.usersService.getCompanyMembers(cid).subscribe({
      next: (m) => { this.companyMembers.set(m); this.membersLoaded.set(true); this.cdr.markForCheck(); },
    });
  }

  toggleAssigneePicker() {
    this.showAssigneePicker.update((v) => !v);
    this.showParticipantPicker.set(false);
  }

  selectAssignee(member: CompanyMember) {
    if (!this.detailTask()) return;
    this.tasksService.update(this.detailTask()!.id, { assigneeId: member.id } as any).subscribe({
      next: (updated) => {
        this.detailTask.update((t) => t ? { ...t, assignee: { id: member.id, name: member.name, avatarUrl: member.avatarUrl } } : t);
        this.updateCardInBoard(updated);
        this.showAssigneePicker.set(false);
        this.cdr.markForCheck();
      },
      error: (err) => console.error('Erro ao atribuir responsável:', err?.error?.message ?? err),
    });
  }

  removeAssignee() {
    if (!this.detailTask()) return;
    this.tasksService.update(this.detailTask()!.id, { assigneeId: null } as any).subscribe({
      next: (updated) => {
        this.detailTask.update((t) => t ? { ...t, assignee: undefined } : t);
        this.updateCardInBoard(updated);
        this.showAssigneePicker.set(false);
        this.cdr.markForCheck();
      },
      error: (err) => console.error('Erro ao remover responsável:', err?.error?.message ?? err),
    });
  }

  toggleParticipantPicker() {
    this.showParticipantPicker.update((v) => !v);
    this.showAssigneePicker.set(false);
  }

  addParticipant(member: CompanyMember) {
    if (!this.detailTask()) return;
    const alreadyIn = (this.detailTask()! as any).participants?.some((p: any) => p.userId === member.id);
    if (alreadyIn) return;
    this.tasksService.addParticipant(this.detailTask()!.id, member.id).subscribe({
      next: (updated) => { this.detailTask.set(updated); this.showParticipantPicker.set(false); this.cdr.markForCheck(); },
    });
  }

  removeParticipant(participantId: string) {
    if (!this.detailTask()) return;
    this.tasksService.removeParticipant(this.detailTask()!.id, participantId).subscribe({
      next: (updated) => { this.detailTask.set(updated); this.cdr.markForCheck(); },
    });
  }

  participantsOf(): any[] {
    return (this.detailTask() as any)?.participants ?? [];
  }

  availableMembersForParticipant(): CompanyMember[] {
    const participants = this.participantsOf().map((p: any) => p.userId);
    const assigneeId = this.detailTask()?.assigneeId;
    return this.companyMembers().filter((m) => !participants.includes(m.id) && m.id !== assigneeId);
  }

  // ── Inline edit: title ─────────────────────────────────────────────────────
  startEditTitle() {
    this.titleControl.setValue(this.detailTask()!.title);
    this.editingTitle.set(true);
  }

  saveTitle() {
    const title = this.titleControl.value?.trim();
    if (!title || !this.detailTask()) { this.cancelTitle(); return; }
    this.tasksService.update(this.detailTask()!.id, { title }).subscribe({
      next: (updated) => {
        this.detailTask.update((t) => t ? { ...t, title: updated.title } : t);
        this.updateCardInBoard(updated);
        this.editingTitle.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  cancelTitle() { this.editingTitle.set(false); }

  // ── Inline edit: description ───────────────────────────────────────────────
  startEditDesc() {
    this.descControl.setValue(this.detailTask()!.description ?? '');
    this.editingDesc.set(true);
  }

  saveDesc() {
    const description = this.descControl.value ?? '';
    if (!this.detailTask()) { this.cancelDesc(); return; }
    this.tasksService.update(this.detailTask()!.id, { description }).subscribe({
      next: (updated) => {
        this.detailTask.update((t) => t ? { ...t, description: updated.description } : t);
        this.editingDesc.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  cancelDesc() { this.editingDesc.set(false); }

  // ── Sidebar quick-updates ──────────────────────────────────────────────────
  updateStatus(event: Event) {
    const status = (event.target as HTMLSelectElement).value as TaskStatus;
    if (!this.detailTask()) return;
    this.tasksService.moveTask(this.detailTask()!.id, status, this.detailTask()!.position).subscribe({
      next: (updated) => {
        const old = this.detailTask()!;
        this.detailTask.update((t) => t ? { ...t, status } : t);
        this.moveCardBetweenColumns(old, updated);
        this.cdr.markForCheck();
      },
    });
  }

  updatePriority(event: Event) {
    const priority = (event.target as HTMLSelectElement).value as Priority;
    if (!this.detailTask()) return;
    this.tasksService.update(this.detailTask()!.id, { priority }).subscribe({
      next: (updated) => {
        this.detailTask.update((t) => t ? { ...t, priority } : t);
        this.updateCardInBoard(updated);
        this.cdr.markForCheck();
      },
    });
  }

  updateDueDate(event: Event) {
    const dueDate = (event.target as HTMLInputElement).value || undefined;
    if (!this.detailTask()) return;
    this.tasksService.update(this.detailTask()!.id, { dueDate } as any).subscribe({
      next: (updated) => {
        this.detailTask.update((t) => t ? { ...t, dueDate: updated.dueDate } : t);
        this.updateCardInBoard(updated);
        this.cdr.markForCheck();
      },
    });
  }

  deleteDetailTask() {
    const task = this.detailTask();
    if (!task) return;
    this.deleteTask(task);
    this.closeDetail();
  }

  // ── Create Modal ───────────────────────────────────────────────────────────
  openCreate(status: TaskStatus = 'BACKLOG') {
    this.quickCreateStatus.set(status);
    this.createForm.reset({ status, priority: 'MEDIUM' });
    this.createAssignee.set(null);
    this.createParticipants.set([]);
    this.showCreateAssigneePicker.set(false);
    this.showCreateParticipantPicker.set(false);
    this.showCreateModal.set(true);
  }

  closeModal() {
    this.showCreateModal.set(false);
    this.creating.set(false);
    this.createForm.reset({ status: 'BACKLOG', priority: 'MEDIUM' });
    this.createAssignee.set(null);
    this.createParticipants.set([]);
    this.showCreateAssigneePicker.set(false);
    this.showCreateParticipantPicker.set(false);
  }

  setCreateAssignee(member: CompanyMember) {
    this.createAssignee.set(member);
    this.showCreateAssigneePicker.set(false);
    this.cdr.markForCheck();
  }

  clearCreateAssignee() {
    this.createAssignee.set(null);
    this.showCreateAssigneePicker.set(false);
  }

  toggleCreateAssigneePicker() {
    this.showCreateAssigneePicker.update((v) => !v);
    this.showCreateParticipantPicker.set(false);
  }

  toggleCreateParticipantPicker() {
    this.showCreateParticipantPicker.update((v) => !v);
    this.showCreateAssigneePicker.set(false);
  }

  toggleCreateParticipant(member: CompanyMember) {
    this.createParticipants.update((list) => {
      const exists = list.some((m) => m.id === member.id);
      return exists ? list.filter((m) => m.id !== member.id) : [...list, member];
    });
  }

  createParticipantCandidates() {
    const assigneeId = this.createAssignee()?.id;
    return this.companyMembers().filter((m) => m.id !== assigneeId);
  }

  isCreateParticipantSelected(memberId: string): boolean {
    return this.createParticipants().some((p) => p.id === memberId);
  }

  createTask() {
    if (this.createForm.invalid) return;
    this.creating.set(true);
    const v = this.createForm.value;
    const assigneeId = this.createAssignee()?.id;
    this.tasksService.create({
      ...(v as any),
      projectId: this.id,
      status: (v.status || this.quickCreateStatus()) as TaskStatus,
      sprintId: v.sprintId || undefined,
      assigneeId: assigneeId || undefined,
    }).subscribe({
      next: (task) => {
        const participantIds = this.createParticipants().map((m) => m.id);
        const addAll = participantIds.map((pid) =>
          this.tasksService.addParticipant(task.id, pid).toPromise().catch(() => {})
        );
        Promise.all(addAll).then(() => {
          this.columns.update((cols) =>
            cols.map((col) =>
              col.key === task.status ? { ...col, tasks: [task, ...col.tasks] } : col
            )
          );
          this.closeModal();
          this.cdr.markForCheck();
        });
      },
      error: () => this.creating.set(false),
    });
  }

  // ── Subtask methods ────────────────────────────────────────────────────────
  toggleCardExpanded(taskId: string) {
    this.expandedCards.update((s) => {
      const next = new Set(s);
      if (next.has(taskId)) { next.delete(taskId); } else { next.add(taskId); }
      return next;
    });
  }

  isCardExpanded(taskId: string): boolean {
    return this.expandedCards().has(taskId);
  }

  openDetailWithSubtasks(task: Task) {
    this.openDetail(task);
    this.loadSubtasks(task.id);
    this.loadDependencies(task.id);
  }

  loadSubtasks(taskId: string) {
    this.subtasksLoading.set(true);
    this.tasksService.listSubtasks(taskId).subscribe({
      next: (list) => { this.subtasks.set(list); this.subtasksLoading.set(false); this.cdr.markForCheck(); },
      error: () => this.subtasksLoading.set(false),
    });
  }

  loadDependencies(taskId: string) {
    this.tasksService.listDependencies(taskId).subscribe({
      next: (deps) => { this.dependencies.set(deps); this.cdr.markForCheck(); },
    });
  }

  addSubtask() {
    const title = this.newSubtaskTitle().trim();
    const task = this.detailTask();
    if (!title || !task) return;
    this.creatingSubtask.set(true);
    this.tasksService.createSubtask(task.id, { title }).subscribe({
      next: (subtask) => {
        this.subtasks.update((list) => [...list, subtask]);
        this.newSubtaskTitle.set('');
        this.creatingSubtask.set(false);
        this.updateSubtaskCountInBoard(task.id, this.subtasks().length);
        this.cdr.markForCheck();
      },
      error: () => this.creatingSubtask.set(false),
    });
  }

  toggleSubtaskDone(subtask: any) {
    const newStatus = subtask.status === 'DONE' ? 'BACKLOG' : 'DONE';
    this.tasksService.update(subtask.id, { status: newStatus } as any).subscribe({
      next: (updated) => {
        this.subtasks.update((list) => list.map((s) => s.id === subtask.id ? { ...s, status: updated.status } : s));
        this.cdr.markForCheck();
      },
    });
  }

  async removeSubtask(subtask: any) {
    const task = this.detailTask();
    if (!task) return;
    const ok = await this.confirm.open({ title: 'Remover subtarefa', message: `Remover "${subtask.title}"?`, danger: true });
    if (!ok) return;
    this.tasksService.deleteSubtask(task.id, subtask.id).subscribe({
      next: () => {
        this.subtasks.update((list) => list.filter((s) => s.id !== subtask.id));
        this.updateSubtaskCountInBoard(task.id, this.subtasks().length);
        this.cdr.markForCheck();
      },
    });
  }

  subtaskProgress(): number {
    const list = this.subtasks();
    if (!list.length) return 0;
    return Math.round((list.filter((s) => s.status === 'DONE').length / list.length) * 100);
  }

  private updateSubtaskCountInBoard(taskId: string, count: number) {
    this.columns.update((cols) =>
      cols.map((col) => ({
        ...col,
        tasks: col.tasks.map((t) =>
          t.id === taskId ? { ...t, _count: { ...((t as any)._count ?? {}), subtasks: count } } : t
        ),
      }))
    );
  }

  subtaskCount(task: Task): number {
    return (task as any)._count?.subtasks ?? 0;
  }

  isBlocked(task: Task): boolean {
    const blockedBy: any[] = (task as any).blockedBy ?? [];
    return blockedBy.some((d: any) => d.dependsOn?.status !== 'DONE');
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  deleteTask(task: Task) {
    this.tasksService.delete(task.id).subscribe({
      next: () => {
        this.columns.update((cols) =>
          cols.map((col) => ({ ...col, tasks: col.tasks.filter((t) => t.id !== task.id) }))
        );
        this.cdr.markForCheck();
      },
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  priorityCfg(priority: string) {
    return PRIORITY_CONFIG[priority as Priority] ?? PRIORITY_CONFIG['MEDIUM'];
  }

  taskProgress(position: number): number {
    return Math.min(Math.round((position % 1000) / 10), 100);
  }

  isOverdue(date: string | undefined): boolean {
    return !!date && new Date(date) < new Date();
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  }

  formatFullDate(date: string): string {
    return new Date(date).toLocaleDateString('pt-BR', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    });
  }

  private calculatePosition(tasks: Task[], index: number): number {
    const prev = tasks[index - 1]?.position ?? 0;
    const next = tasks[index + 1]?.position ?? (prev + 2000);
    return (prev + next) / 2;
  }

  private updateCardInBoard(updated: Task) {
    this.columns.update((cols) =>
      cols.map((col) => ({
        ...col,
        tasks: col.tasks.map((t) => (t.id === updated.id ? { ...t, ...updated } : t)),
      }))
    );
  }

  private moveCardBetweenColumns(oldTask: Task, updatedTask: Task) {
    this.columns.update((cols) =>
      cols.map((col) => {
        if (col.key === oldTask.status) return { ...col, tasks: col.tasks.filter((t) => t.id !== oldTask.id) };
        if (col.key === updatedTask.status) return { ...col, tasks: [updatedTask, ...col.tasks] };
        return col;
      })
    );
  }
}
