import { Component, signal, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { CompaniesService } from '../../core/services/companies.service';
import { Company } from '../../core/models';

@Component({
  selector: 'ag-companies',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './companies.component.html',
  styleUrls: ['./companies.component.scss']
})
export class CompaniesComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly service = inject(CompaniesService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  loading = signal(true);
  saving = signal(false);
  updating = signal(false);
  companies = signal<Company[]>([]);
  showModal = signal(false);
  showEditModal = signal(false);
  showManageModal = signal(false);
  editingCompany = signal<Company | null>(null);
  managingCompany = signal<Company | null>(null);

  form = this.fb.group({ name: ['', Validators.required] });
  editForm = this.fb.group({ name: ['', Validators.required] });

  ngOnInit() {
    this.service.getAll().subscribe({
      next: (data) => { this.companies.set(data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  createCompany() {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.service.create({ name: this.form.value.name! }).subscribe({
      next: (c) => {
        this.companies.update((list) => [c, ...list]);
        this.showModal.set(false);
        this.form.reset();
        this.saving.set(false);
      },
      error: () => this.saving.set(false),
    });
  }

  openEdit(company: Company) {
    this.editingCompany.set(company);
    this.editForm.reset({ name: company.name });
    this.showEditModal.set(true);
  }

  saveEdit() {
    const company = this.editingCompany();
    if (!company || this.editForm.invalid) return;
    this.updating.set(true);
    this.service.update(company.id, { name: this.editForm.value.name! }).subscribe({
      next: (updated) => {
        this.companies.update((list) => list.map((c) => c.id === updated.id ? { ...c, ...updated } : c));
        this.showEditModal.set(false);
        this.updating.set(false);
      },
      error: () => this.updating.set(false),
    });
  }

  openManage(company: Company) {
    this.managingCompany.set(company);
    this.showManageModal.set(true);
  }

  navigateTo(route: string) {
    this.showManageModal.set(false);
    this.router.navigate([`/${route}`]);
  }

  getStats(company: Company) {
    return [
      { value: company._count?.teams ?? 0, label: 'Equipes' },
      { value: company._count?.projects ?? 0, label: 'Projetos' },
      { value: company._count?.users ?? 0, label: 'Membros' },
    ];
  }
}
