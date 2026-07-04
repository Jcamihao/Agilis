import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { IntakeForm, IntakeFieldDef, IntakeSubmission, IntakeSubmissionStatus } from '../models';

@Injectable({ providedIn: 'root' })
export class IntakeService {
  private readonly api = inject(ApiService);

  // ── Authenticated (project-scoped) ────────────────────────────────────────

  list(projectId: string) {
    return this.api.get<IntakeForm[]>(`/projects/${projectId}/intake-forms`);
  }

  getOne(projectId: string, id: string) {
    return this.api.get<IntakeForm>(`/projects/${projectId}/intake-forms/${id}`);
  }

  create(projectId: string, dto: { title: string; description?: string }) {
    return this.api.post<IntakeForm>(`/projects/${projectId}/intake-forms`, dto);
  }

  update(projectId: string, id: string, dto: Partial<IntakeForm>) {
    return this.api.patch<IntakeForm>(`/projects/${projectId}/intake-forms/${id}`, dto);
  }

  delete(projectId: string, id: string) {
    return this.api.delete<void>(`/projects/${projectId}/intake-forms/${id}`);
  }

  updateSubmissionStatus(projectId: string, formId: string, subId: string, status: IntakeSubmissionStatus) {
    return this.api.patch<IntakeSubmission>(
      `/projects/${projectId}/intake-forms/submissions/${subId}/status`, { status },
    );
  }

  // ── Public (no auth) ──────────────────────────────────────────────────────

  getPublicForm(slug: string) {
    return this.api.get<Pick<IntakeForm, 'id' | 'title' | 'description' | 'fields' | 'submitLabel' | 'successMsg'>>(
      `/public/intake/${slug}`,
    );
  }

  submit(slug: string, data: Record<string, any>, submitterEmail?: string) {
    return this.api.post<{ successMsg: string; task: { id: string; title: string } }>(
      `/public/intake/${slug}/submit`, { data, submitterEmail },
    );
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  publicUrl(slug: string): string {
    return `${window.location.origin}/intake/${slug}`;
  }

  fieldTypeConfig(type: string): { label: string; icon: string } {
    const map: Record<string, { label: string; icon: string }> = {
      TEXT:         { label: 'Texto',           icon: 'text_fields' },
      TEXTAREA:     { label: 'Área de texto',   icon: 'text_snippet' },
      EMAIL:        { label: 'E-mail',          icon: 'email' },
      NUMBER:       { label: 'Número',          icon: 'numbers' },
      DATE:         { label: 'Data',            icon: 'calendar_today' },
      SELECT:       { label: 'Seleção única',   icon: 'arrow_drop_down_circle' },
      MULTI_SELECT: { label: 'Multi-seleção',   icon: 'checklist' },
      CHECKBOX:     { label: 'Caixa de seleção',icon: 'check_box' },
    };
    return map[type] ?? { label: type, icon: 'input' };
  }

  statusConfig(status: IntakeSubmissionStatus): { label: string; color: string; bg: string } {
    const map: Record<IntakeSubmissionStatus, { label: string; color: string; bg: string }> = {
      PENDING:   { label: 'Pendente',   color: '#d97706', bg: '#fef3c7' },
      APPROVED:  { label: 'Aprovado',   color: '#059669', bg: '#d1fae5' },
      REJECTED:  { label: 'Rejeitado',  color: '#dc2626', bg: '#fee2e2' },
      CONVERTED: { label: 'Convertido', color: '#6366f1', bg: '#ede9fe' },
    };
    return map[status];
  }
}
