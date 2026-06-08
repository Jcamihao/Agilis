import { Component, signal, inject, OnInit, ChangeDetectionStrategy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { TasksService } from '../../core/services/tasks.service';
import { ProjectsService } from '../../core/services/projects.service';
import { Task, PRIORITY_CONFIG, TASK_STATUS_CONFIG, TaskStatus, Priority, Project } from '../../core/models';

@Component({
  selector: 'ag-my-tasks',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './my-tasks.component.html',
  styleUrls: ['./my-tasks.component.scss'],
})
export class MyTasksComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly tasksService = inject(TasksService);
  private readonly projectsService = inject(ProjectsService);
  private readonly fb = inject(FormBuilder);

  // ── State ──────────────────────────────────────────────────────────────────
  loading = signal(true);
  creating = signal(false);
  tasks = signal<Task[]>([]);
  projects = signal<Project[]>([]);
  showCreateModal = signal(false);

  // ── Filters ────────────────────────────────────────────────────────────────
  taskSearch = signal('');
  selectedPriorities = signal<string[]>([]);
  selectedStatuses = signal<string[]>([]);
  selectedProject = signal<string | null>(null);
  openDropdown = signal<'status' | 'priority' | 'project' | null>(null);
  openMenuId = signal<string | null>(null);

  // ── Config maps ────────────────────────────────────────────────────────────
  priorityFilters = Object.entries(PRIORITY_CONFIG).map(([k, v]) => ({ key: k, label: v.label, color: v.color }));
  statusFilters   = Object.entries(TASK_STATUS_CONFIG).map(([k, v]) => ({ key: k, label: v.label }));
  priorityOptions = Object.entries(PRIORITY_CONFIG).map(([k, v]) => ({ key: k, label: v.label }));

  // ── Computed ───────────────────────────────────────────────────────────────
  filteredTasks = computed(() => {
    let t = this.tasks();
    const q = this.taskSearch().toLowerCase().trim();
    if (q) t = t.filter((task) => task.title.toLowerCase().includes(q));
    if (this.selectedPriorities().length > 0) t = t.filter((task) => this.selectedPriorities().includes(task.priority));
    if (this.selectedStatuses().length > 0)   t = t.filter((task) => this.selectedStatuses().includes(task.status));
    if (this.selectedProject()) t = t.filter((task) => task.project?.name === this.selectedProject());
    return t;
  });

  hasActiveFilters = computed(() =>
    this.taskSearch().trim().length > 0 ||
    this.selectedPriorities().length > 0 ||
    this.selectedStatuses().length > 0 ||
    this.selectedProject() !== null
  );

  createForm = this.fb.group({
    title:     ['', Validators.required],
    projectId: ['', Validators.required],
    priority:  ['MEDIUM'],
    dueDate:   [''],
  });

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  ngOnInit() {
    const companyId = this.auth.currentCompanyId();
    this.tasksService.getMyTasks(companyId).subscribe({
      next: (data) => { this.tasks.set(data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
    if (companyId) {
      this.projectsService.getAll(companyId).subscribe({ next: (data) => this.projects.set(data) });
    }
    document.addEventListener('click', () => {
      this.openDropdown.set(null);
      this.openMenuId.set(null);
    });
  }

  // ── CRUD ───────────────────────────────────────────────────────────────────
  createTask() {
    if (this.createForm.invalid) return;
    this.creating.set(true);
    const value = this.createForm.value;
    const userId = this.auth.user()?.id;
    this.tasksService.create({
      title: value.title!,
      projectId: value.projectId!,
      priority: value.priority as Priority,
      dueDate: value.dueDate || undefined,
      assigneeId: userId,
    }).subscribe({
      next: (task) => {
        this.tasks.update((list) => [task, ...list]);
        this.showCreateModal.set(false);
        this.createForm.reset({ priority: 'MEDIUM' });
        this.creating.set(false);
      },
      error: () => this.creating.set(false),
    });
  }

  toggleStatus(task: Task) {
    const newStatus: TaskStatus = task.status === 'DONE' ? 'BACKLOG' : 'DONE';
    this.tasksService.moveTask(task.id, newStatus, task.position).subscribe({
      next: (updated) => this.tasks.update((list) => list.map((t) => t.id === task.id ? { ...t, status: updated.status } : t)),
    });
  }

  deleteTask(task: Task) {
    this.tasksService.delete(task.id).subscribe({
      next: () => this.tasks.update((list) => list.filter((t) => t.id !== task.id)),
    });
  }

  // ── Filters ────────────────────────────────────────────────────────────────
  toggleFilter(type: 'priority' | 'status', value: string) {
    if (type === 'priority') {
      this.selectedPriorities.update((arr) =>
        arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value]
      );
    } else {
      this.selectedStatuses.update((arr) =>
        arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value]
      );
    }
  }

  isSelected(type: 'priority' | 'status', value: string): boolean {
    return type === 'priority' ? this.selectedPriorities().includes(value) : this.selectedStatuses().includes(value);
  }

  isFilterActive(type: 'priority' | 'status'): boolean {
    return type === 'priority' ? this.selectedPriorities().length > 0 : this.selectedStatuses().length > 0;
  }

  clearFilters() {
    this.taskSearch.set('');
    this.selectedPriorities.set([]);
    this.selectedStatuses.set([]);
    this.selectedProject.set(null);
  }

  toggleDropdown(which: 'status' | 'priority' | 'project') {
    this.openDropdown.set(this.openDropdown() === which ? null : which);
  }

  // ── Row menu ───────────────────────────────────────────────────────────────
  toggleMenu(id: string | null) {
    this.openMenuId.set(this.openMenuId() === id ? null : id);
  }

  // ── Config helpers ─────────────────────────────────────────────────────────
  statusCfg(status: string) {
    return TASK_STATUS_CONFIG[status as TaskStatus] ?? TASK_STATUS_CONFIG['BACKLOG'];
  }

  priorityCfg(priority: string) {
    return PRIORITY_CONFIG[priority as Priority] ?? PRIORITY_CONFIG['MEDIUM'];
  }

  // ── Date helpers ───────────────────────────────────────────────────────────
  isOverdue(date: string): boolean { return new Date(date) < new Date(); }

  isDueToday(date: string): boolean {
    const d = new Date(date);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() &&
           d.getMonth() === now.getMonth() &&
           d.getDate() === now.getDate();
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  }
}
