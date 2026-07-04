import {
  Component, OnInit, signal, computed,
  ChangeDetectionStrategy, ChangeDetectorRef, inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { IntakeService } from '../../core/services/intake.service';
import { IntakeForm, IntakeFieldDef, IntakeFieldType, IntakeSubmission } from '../../core/models';

type Tab = 'forms' | 'builder' | 'submissions';

const FIELD_TYPES: { type: IntakeFieldType; label: string; icon: string }[] = [
  { type: 'TEXT',         label: 'Texto curto',     icon: 'text_fields' },
  { type: 'TEXTAREA',     label: 'Texto longo',     icon: 'text_snippet' },
  { type: 'EMAIL',        label: 'E-mail',          icon: 'email' },
  { type: 'NUMBER',       label: 'Número',          icon: 'numbers' },
  { type: 'DATE',         label: 'Data',            icon: 'calendar_today' },
  { type: 'SELECT',       label: 'Seleção',         icon: 'arrow_drop_down_circle' },
  { type: 'MULTI_SELECT', label: 'Multi-seleção',   icon: 'checklist' },
  { type: 'CHECKBOX',     label: 'Checkbox',        icon: 'check_box' },
];

const MAPS_TO_OPTIONS = [
  { value: null,          label: '— nenhum —' },
  { value: 'title',       label: 'Título da tarefa' },
  { value: 'description', label: 'Descrição' },
  { value: 'priority',    label: 'Prioridade' },
  { value: 'dueDate',     label: 'Data de vencimento' },
];

function uid(): string { return Math.random().toString(36).slice(2, 9); }

@Component({
  selector: 'ag-intake-forms',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  templateUrl: './intake-forms.component.html',
  styleUrls:   ['./intake-forms.component.scss'],
})
export class IntakeFormsComponent implements OnInit {
  private readonly route  = inject(ActivatedRoute);
  private readonly svc    = inject(IntakeService);
  private readonly cdr    = inject(ChangeDetectorRef);

  projectId  = signal('');
  tab        = signal<Tab>('forms');
  loading    = signal(true);
  saving     = signal(false);
  copied     = signal(false);

  forms       = signal<IntakeForm[]>([]);
  activeForm  = signal<IntakeForm | null>(null);
  submissions = signal<IntakeSubmission[]>([]);

  // Builder state
  editTitle       = signal('');
  editDescription = signal('');
  editSubmitLabel = signal('Enviar');
  editSuccessMsg  = signal('Sua solicitação foi recebida. Obrigado!');
  editFields      = signal<IntakeFieldDef[]>([]);
  editingFieldId  = signal<string | null>(null);

  readonly FIELD_TYPES   = FIELD_TYPES;
  readonly MAPS_TO       = MAPS_TO_OPTIONS;

  readonly pendingCount = computed(() =>
    this.submissions().filter(s => s.status === 'PENDING').length
  );

  ngOnInit() {
    this.projectId.set(this.route.snapshot.paramMap.get('id') ?? '');
    this.loadForms();
  }

  loadForms() {
    this.svc.list(this.projectId()).subscribe({
      next: (res: any) => {
        this.forms.set(res?.data ?? res ?? []);
        this.loading.set(false);
        this.cdr.markForCheck();
      },
      error: () => { this.loading.set(false); this.cdr.markForCheck(); },
    });
  }

  // ── Form creation ──────────────────────────────────────────────────────────

  createForm() {
    this.svc.create(this.projectId(), { title: 'Novo Formulário' }).subscribe({
      next: (res: any) => {
        const f: IntakeForm = res?.data ?? res;
        this.forms.update(l => [f, ...l]);
        this.openBuilder(f);
        this.cdr.markForCheck();
      },
    });
  }

  openBuilder(form: IntakeForm) {
    this.activeForm.set(form);
    this.editTitle.set(form.title);
    this.editDescription.set(form.description ?? '');
    this.editSubmitLabel.set(form.submitLabel);
    this.editSuccessMsg.set(form.successMsg);
    this.editFields.set(JSON.parse(JSON.stringify(form.fields)));
    this.editingFieldId.set(null);
    this.tab.set('builder');
    this.cdr.markForCheck();
  }

  saveBuilder() {
    const form = this.activeForm();
    if (!form) return;
    this.saving.set(true);
    this.svc.update(this.projectId(), form.id, {
      title:       this.editTitle(),
      description: this.editDescription(),
      submitLabel: this.editSubmitLabel(),
      successMsg:  this.editSuccessMsg(),
      fields:      this.editFields(),
    } as any).subscribe({
      next: (res: any) => {
        const updated: IntakeForm = res?.data ?? res;
        this.activeForm.set(updated);
        this.forms.update(l => l.map(f => f.id === updated.id ? updated : f));
        this.saving.set(false);
        this.cdr.markForCheck();
      },
      error: () => { this.saving.set(false); },
    });
  }

  toggleStatus() {
    const form = this.activeForm();
    if (!form) return;
    const next = form.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
    this.svc.update(this.projectId(), form.id, { status: next } as any).subscribe({
      next: (res: any) => {
        const updated: IntakeForm = res?.data ?? res;
        this.activeForm.set(updated);
        this.forms.update(l => l.map(f => f.id === updated.id ? updated : f));
        this.cdr.markForCheck();
      },
    });
  }

  deleteForm(id: string) {
    if (!confirm('Excluir este formulário e todas as submissões?')) return;
    this.svc.delete(this.projectId(), id).subscribe(() => {
      this.forms.update(l => l.filter(f => f.id !== id));
      if (this.activeForm()?.id === id) {
        this.activeForm.set(null);
        this.tab.set('forms');
      }
      this.cdr.markForCheck();
    });
  }

  // ── Field builder ──────────────────────────────────────────────────────────

  addField(type: IntakeFieldType) {
    const field: IntakeFieldDef = {
      id: uid(), type, label: this.FIELD_TYPES.find(t => t.type === type)!.label,
      required: false, options: type === 'SELECT' || type === 'MULTI_SELECT' ? ['Opção 1'] : [],
    };
    this.editFields.update(l => [...l, field]);
    this.editingFieldId.set(field.id);
  }

  removeField(id: string) {
    this.editFields.update(l => l.filter(f => f.id !== id));
    if (this.editingFieldId() === id) this.editingFieldId.set(null);
  }

  moveField(id: string, dir: -1 | 1) {
    this.editFields.update(list => {
      const idx = list.findIndex(f => f.id === id);
      if (idx + dir < 0 || idx + dir >= list.length) return list;
      const next = [...list];
      [next[idx], next[idx + dir]] = [next[idx + dir], next[idx]];
      return next;
    });
  }

  getField(id: string): IntakeFieldDef | undefined {
    return this.editFields().find(f => f.id === id);
  }

  patchField(id: string, patch: Partial<IntakeFieldDef>) {
    this.editFields.update(list => list.map(f => f.id === id ? { ...f, ...patch } : f));
  }

  addOption(fieldId: string) {
    const f = this.getField(fieldId);
    if (!f) return;
    this.patchField(fieldId, { options: [...(f.options ?? []), `Opção ${(f.options?.length ?? 0) + 1}`] });
  }

  removeOption(fieldId: string, idx: number) {
    const f = this.getField(fieldId);
    if (!f) return;
    const opts = [...(f.options ?? [])];
    opts.splice(idx, 1);
    this.patchField(fieldId, { options: opts });
  }

  updateOption(fieldId: string, idx: number, val: string) {
    const f = this.getField(fieldId);
    if (!f) return;
    const opts = [...(f.options ?? [])];
    opts[idx] = val;
    this.patchField(fieldId, { options: opts });
  }

  needsOptions(type: IntakeFieldType): boolean {
    return type === 'SELECT' || type === 'MULTI_SELECT';
  }

  // ── Submissions ────────────────────────────────────────────────────────────

  openSubmissions(form: IntakeForm) {
    this.activeForm.set(form);
    this.tab.set('submissions');
    this.svc.getOne(this.projectId(), form.id).subscribe({
      next: (res: any) => {
        const f: IntakeForm = res?.data ?? res;
        this.submissions.set(f.submissions ?? []);
        this.cdr.markForCheck();
      },
    });
  }

  // ── Clipboard ──────────────────────────────────────────────────────────────

  copyLink(slug: string) {
    navigator.clipboard.writeText(this.svc.publicUrl(slug)).then(() => {
      this.copied.set(true);
      setTimeout(() => { this.copied.set(false); this.cdr.markForCheck(); }, 2000);
      this.cdr.markForCheck();
    });
  }

  publicUrl(slug: string) { return this.svc.publicUrl(slug); }

  statusConfig(s: any) { return this.svc.statusConfig(s); }

  fieldTypeConfig(t: string) { return this.svc.fieldTypeConfig(t); }

  trackById(_: number, f: IntakeFieldDef) { return f.id; }
}
