import {
  Component, OnInit, signal,
  ChangeDetectionStrategy, ChangeDetectorRef, inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { IntakeService } from '../../core/services/intake.service';
import { IntakeFieldDef } from '../../core/models';

interface PublicForm {
  id: string;
  title: string;
  description?: string;
  fields: IntakeFieldDef[];
  submitLabel: string;
  successMsg: string;
}

@Component({
  selector: 'ag-intake-public',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  templateUrl: './intake-public.component.html',
  styleUrls:   ['./intake-public.component.scss'],
})
export class IntakePublicComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly svc   = inject(IntakeService);
  private readonly cdr   = inject(ChangeDetectorRef);

  slug       = signal('');
  loading    = signal(true);
  submitting = signal(false);
  submitted  = signal(false);
  error      = signal('');
  form       = signal<PublicForm | null>(null);
  formData   = signal<Record<string, any>>({});
  successMsg = signal('');

  ngOnInit() {
    const slug = this.route.snapshot.paramMap.get('slug') ?? '';
    this.slug.set(slug);
    this.svc.getPublicForm(slug).subscribe({
      next: (res: any) => {
        const f: PublicForm = res?.data ?? res;
        this.form.set(f);
        // Init formData with empty values
        const init: Record<string, any> = {};
        for (const field of f.fields) init[field.id] = field.type === 'CHECKBOX' ? false : '';
        this.formData.set(init);
        this.loading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.error.set('Formulário não encontrado ou indisponível.');
        this.loading.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  setValue(fieldId: string, value: any) {
    this.formData.update(d => ({ ...d, [fieldId]: value }));
  }

  getValue(fieldId: string): any {
    return this.formData()[fieldId];
  }

  submit() {
    const form = this.form();
    if (!form) return;

    // Client-side required validation
    for (const f of form.fields) {
      if (f.required && !this.formData()[f.id]) {
        this.error.set(`O campo "${f.label}" é obrigatório.`);
        this.cdr.markForCheck();
        return;
      }
    }
    this.error.set('');
    this.submitting.set(true);

    // extract email field if exists
    const emailField = form.fields.find(f => f.type === 'EMAIL');
    const submitterEmail = emailField ? this.formData()[emailField.id] : undefined;

    this.svc.submit(this.slug(), this.formData(), submitterEmail).subscribe({
      next: (res: any) => {
        const r = res?.data ?? res;
        this.successMsg.set(r.successMsg ?? form.successMsg);
        this.submitted.set(true);
        this.submitting.set(false);
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        this.error.set(err?.error?.message ?? 'Erro ao enviar. Tente novamente.');
        this.submitting.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  reset() {
    this.submitted.set(false);
    this.error.set('');
    const form = this.form();
    if (form) {
      const init: Record<string, any> = {};
      for (const f of form.fields) init[f.id] = f.type === 'CHECKBOX' ? false : '';
      this.formData.set(init);
    }
    this.cdr.markForCheck();
  }

  toggleMultiSelect(fieldId: string, opt: string) {
    const current = (this.getValue(fieldId) ?? '') as string;
    const parts = current ? current.split(',') : [];
    const idx = parts.indexOf(opt);
    const next = idx === -1 ? [...parts, opt] : parts.filter((o) => o !== opt);
    this.setValue(fieldId, next.join(','));
  }

  needsOptions(type: string): boolean {
    return type === 'SELECT' || type === 'MULTI_SELECT';
  }

  fieldType(type: string): string {
    const map: Record<string, string> = {
      TEXT: 'text', EMAIL: 'email', NUMBER: 'number', DATE: 'date', TEXTAREA: 'text',
    };
    return map[type] ?? 'text';
  }
}
