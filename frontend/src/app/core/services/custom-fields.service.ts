import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { CustomField, CustomFieldValue, TaskCustomFieldEntry } from '../models';

@Injectable({ providedIn: 'root' })
export class CustomFieldsService {
  private readonly api = inject(ApiService);

  // Field definitions
  list(projectId: string) {
    return this.api.get<CustomField[]>(`/projects/${projectId}/custom-fields`);
  }

  create(projectId: string, dto: { name: string; type: string; options?: string[]; isRequired?: boolean }) {
    return this.api.post<CustomField>(`/projects/${projectId}/custom-fields`, dto);
  }

  update(id: string, dto: Partial<{ name: string; options: string[]; isRequired: boolean; position: number }>) {
    return this.api.patch<CustomField>(`/custom-fields/${id}`, dto);
  }

  delete(id: string) {
    return this.api.delete<void>(`/custom-fields/${id}`);
  }

  reorder(projectId: string, orderedIds: string[]) {
    return this.api.patch<CustomField[]>(`/projects/${projectId}/custom-fields/reorder`, { orderedIds });
  }

  // Values
  getTaskValues(taskId: string) {
    return this.api.get<CustomFieldValue[]>(`/tasks/${taskId}/custom-fields`);
  }

  setValue(taskId: string, customFieldId: string, value: string | null) {
    return this.api.patch<CustomFieldValue>(`/tasks/${taskId}/custom-fields/${customFieldId}`, { value });
  }

  setValues(taskId: string, values: { customFieldId: string; value: string | null }[]) {
    return this.api.post<CustomFieldValue[]>(`/tasks/${taskId}/custom-fields`, { values });
  }

  // ── Display helpers ────────────────────────────────────────────────────────

  typeConfig(type: string): { label: string; icon: string } {
    const map: Record<string, { label: string; icon: string }> = {
      TEXT:         { label: 'Texto',          icon: 'text_fields' },
      NUMBER:       { label: 'Número',         icon: 'numbers' },
      DATE:         { label: 'Data',           icon: 'calendar_today' },
      SELECT:       { label: 'Seleção',        icon: 'arrow_drop_down_circle' },
      MULTI_SELECT: { label: 'Multi-seleção',  icon: 'checklist' },
      CHECKBOX:     { label: 'Caixa de seleção', icon: 'check_box' },
      URL:          { label: 'Link',           icon: 'link' },
      EMAIL:        { label: 'E-mail',         icon: 'email' },
      PHONE:        { label: 'Telefone',       icon: 'phone' },
    };
    return map[type] ?? { label: type, icon: 'input' };
  }

  formatValue(entry: TaskCustomFieldEntry): string {
    if (entry.value === null || entry.value === '') return '—';
    if (entry.fieldType === 'CHECKBOX') return entry.value === 'true' ? '✓ Sim' : '✗ Não';
    if (entry.fieldType === 'DATE') {
      try { return new Date(entry.value).toLocaleDateString('pt-BR'); } catch { return entry.value; }
    }
    return entry.value;
  }
}
