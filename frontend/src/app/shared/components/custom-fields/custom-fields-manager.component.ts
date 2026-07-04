import {
  Component, Input, OnInit, signal,
  ChangeDetectionStrategy, ChangeDetectorRef, inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CustomFieldsService } from '../../../core/services/custom-fields.service';
import { CustomField, CustomFieldType } from '../../../core/models';

const FIELD_TYPES: { type: CustomFieldType; label: string; icon: string }[] = [
  { type: 'TEXT',         label: 'Texto',           icon: 'text_fields' },
  { type: 'NUMBER',       label: 'Número',          icon: 'numbers' },
  { type: 'DATE',         label: 'Data',            icon: 'calendar_today' },
  { type: 'SELECT',       label: 'Seleção',         icon: 'arrow_drop_down_circle' },
  { type: 'MULTI_SELECT', label: 'Multi-seleção',   icon: 'checklist' },
  { type: 'CHECKBOX',     label: 'Caixa de seleção',icon: 'check_box' },
  { type: 'URL',          label: 'Link',            icon: 'link' },
  { type: 'EMAIL',        label: 'E-mail',          icon: 'email' },
  { type: 'PHONE',        label: 'Telefone',        icon: 'phone' },
];

@Component({
  selector: 'ag-custom-fields-manager',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  templateUrl: './custom-fields-manager.component.html',
  styleUrls: ['./custom-fields-manager.component.scss'],
})
export class CustomFieldsManagerComponent implements OnInit {
  @Input({ required: true }) projectId!: string;

  private readonly svc = inject(CustomFieldsService);
  private readonly cdr = inject(ChangeDetectorRef);

  loading  = signal(true);
  saving   = signal(false);
  fields   = signal<CustomField[]>([]);
  showForm = signal(false);

  // new field form
  newName       = '';
  newType: CustomFieldType = 'TEXT';
  newRequired   = false;
  newOptions    = '';          // comma-separated

  readonly FIELD_TYPES = FIELD_TYPES;

  ngOnInit() { this.load(); }

  load() {
    this.svc.list(this.projectId).subscribe({
      next: (res: any) => {
        this.fields.set(res?.data ?? res ?? []);
        this.loading.set(false);
        this.cdr.markForCheck();
      },
      error: () => { this.loading.set(false); this.cdr.markForCheck(); },
    });
  }

  openForm() {
    this.newName = ''; this.newType = 'TEXT'; this.newRequired = false; this.newOptions = '';
    this.showForm.set(true);
  }

  save() {
    if (!this.newName.trim()) return;
    this.saving.set(true);
    const options = this.needsOptions(this.newType)
      ? this.newOptions.split(',').map(s => s.trim()).filter(Boolean)
      : [];
    this.svc.create(this.projectId, {
      name: this.newName.trim(), type: this.newType, options, isRequired: this.newRequired,
    }).subscribe({
      next: (res: any) => {
        this.fields.update(l => [...l, res?.data ?? res]);
        this.showForm.set(false);
        this.saving.set(false);
        this.cdr.markForCheck();
      },
      error: () => { this.saving.set(false); },
    });
  }

  delete(id: string) {
    this.svc.delete(id).subscribe(() => {
      this.fields.update(l => l.filter(f => f.id !== id));
      this.cdr.markForCheck();
    });
  }

  needsOptions(type: CustomFieldType): boolean {
    return type === 'SELECT' || type === 'MULTI_SELECT';
  }

  typeConfig(type: string) { return this.svc.typeConfig(type); }
}
