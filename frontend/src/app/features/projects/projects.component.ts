import {
  Component,
  signal,
  inject,
  OnInit,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { AuthService } from '../../core/services/auth.service';
import { ProjectsService } from '../../core/services/projects.service';
import { UsersService, CompanyMember } from '../../core/services/users.service';
import { TeamsService } from '../../core/services/teams.service';
import { Project, Team } from '../../core/models';

@Component({
  selector: 'ag-projects',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, MatDialogModule],
  templateUrl: './projects.component.html',
  styleUrls: ['./projects.component.scss']
})
export class ProjectsComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly projectsService = inject(ProjectsService);
  private readonly usersService = inject(UsersService);
  private readonly teamsService = inject(TeamsService);
  private readonly fb = inject(FormBuilder);

  readonly Math = Math;

  readonly userCompanies = computed(() => this.auth.user()?.companies ?? []);

  loading = signal(true);
  creating = signal(false);
  updatingProject = signal(false);
  loadingMembers = signal(false);
  allProjects = signal<Project[]>([]);
  companyMembers = signal<CompanyMember[]>([]);
  companyTeams = signal<Team[]>([]);
  selectedMemberIds = signal<string[]>([]);
  selectedTeamIds = signal<string[]>([]);
  showCreateModal = signal(false);
  showSettingsModal = signal(false);
  editingProject = signal<Project | null>(null);
  activeFilter = signal('all');
  companyFilter = signal<string>('all');
  viewMode = signal<'grid' | 'list'>('grid');

  filters = [
    { key: 'all', label: 'Todos' },
    { key: 'active', label: 'Ativos' },
    { key: 'mine', label: 'Meus' },
  ];

  projectColors = [
    '#6366f1',
    '#8b5cf6',
    '#3b82f6',
    '#10b981',
    '#f59e0b',
    '#ef4444',
    '#ec4899',
    '#14b8a6',
  ];

  createForm = this.fb.group({
    name:      ['', Validators.required],
    description: [''],
    color:     ['#6366f1'],
    icon:      ['folder'],
    companyId: ['', Validators.required],
  });

  settingsForm = this.fb.group({
    name: ['', Validators.required],
    description: [''],
    color: ['#6366f1'],
  });

  // ── Archived ──────────────────────────────────────────────────────────────
  archivedProjects = signal<Project[]>([]);
  loadingArchived  = signal(false);
  archivedError    = signal(false);
  showArchived     = signal(false);
  restoringId      = signal<string | null>(null);
  archivedLoaded   = signal(false);

  readonly projects = computed(() => {
    const filter = this.companyFilter();
    const all = this.allProjects();
    return filter === 'all' ? all : all.filter((p) => p.companyId === filter);
  });

  ngOnInit() {
    this.projectsService.getAll().subscribe({
      next: (data) => { this.allProjects.set(data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  projectCountFor(companyId: string): number {
    return this.allProjects().filter((p) => p.companyId === companyId).length;
  }

  setCompanyFilter(id: string) {
    this.companyFilter.set(id);
    this.archivedLoaded.set(false);
    this.archivedProjects.set([]);
    if (this.showArchived()) this.loadArchived();
  }

  toggleArchived() {
    this.showArchived.update((v) => !v);
    if (this.showArchived() && !this.archivedLoaded()) {
      this.loadArchived();
    }
  }

  loadArchived() {
    this.loadingArchived.set(true);
    this.archivedError.set(false);
    const cid = this.companyFilter() !== 'all' ? this.companyFilter() : undefined;
    this.projectsService.getArchived(cid).subscribe({
      next: (data) => {
        this.archivedProjects.set(data);
        this.loadingArchived.set(false);
        this.archivedLoaded.set(true);
        this.archivedError.set(false);
      },
      error: () => {
        this.loadingArchived.set(false);
        this.archivedError.set(true);
        this.archivedLoaded.set(false); // permite tentar de novo
      },
    });
  }

  restoreProject(project: Project) {
    this.restoringId.set(project.id);
    this.projectsService.restore(project.id).subscribe({
      next: () => {
        this.archivedProjects.update((list) => list.filter((p) => p.id !== project.id));
        this.allProjects.update((list) => [{ ...project, isArchived: false }, ...list]);
        this.restoringId.set(null);
      },
      error: () => this.restoringId.set(null),
    });
  }

  toggleTeam(id: string) {
    this.selectedTeamIds.update((ids) => ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]);
  }
  isTeamSelected(id: string): boolean { return this.selectedTeamIds().includes(id); }

  openCreateModal() {
    this.selectedMemberIds.set([]);
    this.selectedTeamIds.set([]);
    const defaultCompanyId = this.auth.currentCompanyId() ?? '';
    this.createForm.reset({ color: '#6366f1', icon: 'folder', companyId: defaultCompanyId });
    this.showCreateModal.set(true);
    if (defaultCompanyId) this.loadCompanyContext(defaultCompanyId);
  }

  onCompanyChange(companyId: string) {
    this.selectedTeamIds.set([]);
    this.selectedMemberIds.set([]);
    this.companyTeams.set([]);
    this.companyMembers.set([]);
    this.loadCompanyContext(companyId);
  }

  private loadCompanyContext(companyId: string) {
    this.loadingMembers.set(true);
    this.teamsService.getAll(companyId).subscribe({
      next: (teams) => this.companyTeams.set(teams),
    });
    this.usersService.getCompanyMembers(companyId).subscribe({
      next: (members) => { this.companyMembers.set(members); this.loadingMembers.set(false); },
      error: () => this.loadingMembers.set(false),
    });
  }

  toggleMember(id: string) {
    this.selectedMemberIds.update((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]
    );
  }

  isMemberSelected(id: string): boolean {
    return this.selectedMemberIds().includes(id);
  }

  openSettings(project: Project) {
    this.editingProject.set(project);
    this.settingsForm.reset({ name: project.name, description: project.description ?? '', color: project.color });
    this.showSettingsModal.set(true);
  }

  saveSettings() {
    const project = this.editingProject();
    if (!project || this.settingsForm.invalid) return;
    this.updatingProject.set(true);
    this.projectsService.update(project.id, this.settingsForm.value as Partial<Project>).subscribe({
      next: (updated) => {
        this.allProjects.update((list) => list.map((p) => p.id === updated.id ? { ...p, ...updated } : p));
        this.showSettingsModal.set(false);
        this.updatingProject.set(false);
      },
      error: () => this.updatingProject.set(false),
    });
  }

  createProject() {
    if (this.createForm.invalid) return;
    const companyId = this.createForm.get('companyId')?.value;
    if (!companyId) return;

    this.creating.set(true);
    this.projectsService
      .create({ ...(this.createForm.value as any), companyId, memberIds: this.selectedMemberIds(), teamIds: this.selectedTeamIds() } as any)
      .subscribe({
        next: (project) => {
          this.allProjects.update((list) => [project, ...list]);
          this.showCreateModal.set(false);
          this.selectedMemberIds.set([]);
          this.selectedTeamIds.set([]);
          this.creating.set(false);
        },
        error: () => this.creating.set(false),
      });
  }
}
