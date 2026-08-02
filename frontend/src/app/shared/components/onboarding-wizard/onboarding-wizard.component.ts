import { Component, signal, inject, ChangeDetectionStrategy, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CompaniesService } from '../../../core/services/companies.service';
import { ProjectsService } from '../../../core/services/projects.service';
import { TasksService } from '../../../core/services/tasks.service';
import { AuthService } from '../../../core/services/auth.service';

const ICONS = ['rocket_launch', 'star', 'bolt', 'favorite', 'code', 'brush', 'campaign', 'build', 'shopping_cart', 'school'];
const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#8b5cf6', '#ef4444', '#f97316', '#14b8a6', '#84cc16'];

@Component({
  selector: 'ag-onboarding-wizard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './onboarding-wizard.component.html',
  styleUrls: ['./onboarding-wizard.component.scss'],
})
export class OnboardingWizardComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly companiesSvc = inject(CompaniesService);
  private readonly projectsSvc = inject(ProjectsService);
  private readonly tasksSvc = inject(TasksService);
  private readonly auth = inject(AuthService);

  done = output<void>();

  readonly ICONS = ICONS;
  readonly COLORS = COLORS;

  step = signal(1);
  saving = signal(false);
  error = signal<string | null>(null);

  createdCompanyId = signal<string | null>(null);
  createdProjectId = signal<string | null>(null);

  selectedIcon = signal('rocket_launch');
  selectedColor = signal('#6366f1');

  companyForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
  });

  projectForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
  });

  taskForm = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(3)]],
  });

  get stepLabel() {
    return ['', 'Sua empresa', 'Primeiro projeto', 'Primeira tarefa'][this.step()];
  }

  get stepDesc() {
    return [
      '',
      'Como se chama a sua organização?',
      'Crie o primeiro projeto para organizar o trabalho.',
      'Adicione uma tarefa para começar. Pode mudar depois!',
    ][this.step()];
  }

  createCompany() {
    if (this.companyForm.invalid) return;
    this.saving.set(true);
    this.error.set(null);

    this.companiesSvc.create({ name: this.companyForm.value.name! }).subscribe({
      next: (company: any) => {
        const id = company?.id ?? company?.data?.id;
        this.createdCompanyId.set(id);

        const user = this.auth.user();
        if (user) {
          this.auth.updateUser({
            companies: [...(user.companies ?? []), { id, userId: user.id, companyId: id, role: 'OWNER', company: { id, name: this.companyForm.value.name! } } as any],
          });
        }

        this.saving.set(false);
        this.step.set(2);
      },
      error: (e: any) => {
        this.error.set(e?.error?.message ?? 'Erro ao criar empresa');
        this.saving.set(false);
      },
    });
  }

  createProject() {
    if (this.projectForm.invalid) return;
    const companyId = this.createdCompanyId();
    if (!companyId) return;

    this.saving.set(true);
    this.error.set(null);

    this.projectsSvc.create({
      name: this.projectForm.value.name!,
      companyId,
      icon: this.selectedIcon(),
      color: this.selectedColor(),
    }).subscribe({
      next: (project: any) => {
        const id = project?.id ?? project?.data?.id;
        this.createdProjectId.set(id);
        this.saving.set(false);
        this.step.set(3);
      },
      error: (e: any) => {
        this.error.set(e?.error?.message ?? 'Erro ao criar projeto');
        this.saving.set(false);
      },
    });
  }

  createTask() {
    if (this.taskForm.invalid) return;
    const projectId = this.createdProjectId();
    if (!projectId) return;

    this.saving.set(true);
    this.error.set(null);

    this.tasksSvc.create({
      title: this.taskForm.value.title!,
      projectId,
      priority: 'MEDIUM',
      status: 'BACKLOG',
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.finish();
      },
      error: (e: any) => {
        this.error.set(e?.error?.message ?? 'Erro ao criar tarefa');
        this.saving.set(false);
      },
    });
  }

  skip() {
    this.finish();
  }

  private finish() {
    const projectId = this.createdProjectId();
    this.done.emit();
    if (projectId) {
      this.router.navigate(['/kanban', projectId]);
    }
  }
}
