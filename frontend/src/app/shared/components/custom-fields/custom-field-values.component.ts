import {
  Component, Input, OnChanges, signal,
  ChangeDetectionStrategy, ChangeDetectorRef, inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CustomFieldsService } from '../../../core/services/custom-fields.service';
import { CustomField, TaskCustomFieldEntry } from '../../../core/models';

interface FieldState {
  field: CustomField;
  value: string | null;
  editing: boolean;
  draft: string;
}

@Component({
  selector: 'ag-custom-field-values',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  templateUrl: './custom-field-values.component.html',
  styleUrls: ['./custom-field-values.component.scss'],
})
export class CustomFieldValuesComponent implements OnChanges {
  @Input({ required: true }) taskId!: string;
  @Input({ required: true }) projectId!: string;
  @Input() initialValues?: TaskCustomFieldEntry[];

  private readonly svc  = inject(CustomFieldsService);
  private readonly cdr  = inject(ChangeDetectorRef);

  loading = signal(true);
  states  = signal<FieldState[]>([]);

  ngOnChanges() {
    if (this.projectId && this.taskId) this.load();
  }

  load() {
    this.svc.list(this.projectId).subscribe({
      next: (res: any) => {
        const fields: CustomField[] = res?.data ?? res ?? [];
        const valMap = new Map<string, string | null>();
        for (const v of this.initialValues ?? []) valMap.set(v.fieldId, v.value);

        this.states.set(fields.map(f => ({
          field:   f,
          value:   valMap.get(f.id) ?? null,
          editing: false,
          draft:   valMap.get(f.id) ?? '',
        })));
        this.loading.set(false);
        this.cdr.markForCheck();
      },
      error: () => { this.loading.set(false); },
    });
  }

  startEdit(s: FieldState) {
    s.draft   = s.value ?? '';
    s.editing = true;
    this.cdr.markForCheck();
  }

  cancel(s: FieldState) { s.editing = false; this.cdr.markForCheck(); }

  commit(s: FieldState) {
    const newVal = s.draft.trim() === '' ? null : s.draft;
    if (newVal === s.value) { s.editing = false; this.cdr.markForCheck(); return; }
    this.svc.setValue(this.taskId, s.field.id, newVal).subscribe({
      next: () => {
        s.value   = newVal;
        s.editing = false;
        this.cdr.markForCheck();
      },
    });
  }

  toggleCheckbox(s: FieldState) {
    const newVal = s.value === 'true' ? 'false' : 'true';
    this.svc.setValue(this.taskId, s.field.id, newVal).subscribe({
      next: () => { s.value = newVal; this.cdr.markForCheck(); },
    });
  }

  display(s: FieldState): string {
    return this.svc.formatValue({ fieldId: s.field.id, fieldName: s.field.name, fieldType: s.field.type, options: s.field.options, value: s.value });
  }

  typeConfig(type: string) { return this.svc.typeConfig(type); }

  trackById(_: number, s: FieldState) { return s.field.id; }
}
