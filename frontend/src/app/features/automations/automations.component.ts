import { Component, signal, inject, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormArray, FormGroup } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import {
  AutomationService, AutomationRule, AutomationTrigger,
  AutomationActionType, AutomationExecution
} from '../../core/services/automation.service';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const TRIGGER_LABELS: Record<AutomationTrigger, string> = {
  TASK_CREATED:        'Tarefa criada',
  TASK_STATUS_CHANGED: 'Status alterado',
  TASK_OVERDUE:        'Prazo vencido',
  COMMENT_CREATED:     'Comentário adicionado',
  TASK_ASSIGNED:       'Tarefa atribuída',
};

const ACTION_LABELS: Record<AutomationActionType, string> = {
  CHANGE_STATUS:     'Mudar status',
  ASSIGN_USER:       'Atribuir usuário',
  SEND_NOTIFICATION: 'Enviar notificação',
  CREATE_TASK:       'Criar tarefa',
  SEND_EMAIL:        'Enviar e-mail',
  SEND_WHATSAPP:     'Enviar WhatsApp',
  SEND_TELEGRAM:     'Enviar Telegram',
};

const CONDITION_FIELDS = [
  { value: 'status',   label: 'Status' },
  { value: 'priority', label: 'Prioridade' },
  { value: 'assigneeId', label: 'Responsável' },
  { value: 'event.newStatus', label: 'Novo status (evento)' },
  { value: 'event.oldStatus', label: 'Status anterior (evento)' },
];

const OPERATORS = [
  { value: 'equals',     label: 'é igual a' },
  { value: 'not_equals', label: 'não é igual a' },
  { value: 'in',         label: 'está em' },
  { value: 'is_set',     label: 'está definido' },
  { value: 'is_not_set', label: 'não está definido' },
];

@Component({
  selector: 'ag-automations',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './automations.component.html',
  styleUrls: ['./automations.component.scss']
})
export class AutomationsComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly service = inject(AutomationService);
  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly TRIGGER_LABELS = TRIGGER_LABELS;
  readonly ACTION_LABELS  = ACTION_LABELS;

  loading = signal(true);
  saving = signal(false);
  rules = signal<AutomationRule[]>([]);
  executions = signal<AutomationExecution[]>([]);
  executionsLoading = signal(false);
  showRuleModal = signal(false);
  showExecutions = signal(false);
  editingRule = signal<AutomationRule | null>(null);
  selectedRule = signal<AutomationRule | null>(null);

  triggerOptions = Object.entries(TRIGGER_LABELS).map(([v, l]) => ({ value: v, label: l }));
  actionOptions  = Object.entries(ACTION_LABELS).map(([v, l]) => ({ value: v, label: l }));
  conditionFields = CONDITION_FIELDS;
  operators = OPERATORS;

  ruleForm = this.fb.group({
    name:        ['', Validators.required],
    description: [''],
    trigger:     ['TASK_STATUS_CHANGED', Validators.required],
    conditions:  this.fb.array([]),
    actions:     this.fb.array([]),
  });

  get conditionsArray() { return this.ruleForm.get('conditions') as FormArray; }
  get actionsArray()    { return this.ruleForm.get('actions')    as FormArray; }

  ngOnInit() { this.load(); }

  load() {
    const companyId = this.auth.currentCompanyId();
    if (!companyId) { this.loading.set(false); return; }
    this.service.getAll(companyId).subscribe({
      next: (data) => { this.rules.set(data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  openCreate() {
    this.editingRule.set(null);
    this.ruleForm.reset({ trigger: 'TASK_STATUS_CHANGED' });
    while (this.conditionsArray.length) this.conditionsArray.removeAt(0);
    while (this.actionsArray.length)    this.actionsArray.removeAt(0);
    this.showRuleModal.set(true);
  }

  editRule(rule: AutomationRule) {
    this.editingRule.set(rule);
    while (this.conditionsArray.length) this.conditionsArray.removeAt(0);
    while (this.actionsArray.length)    this.actionsArray.removeAt(0);

    this.ruleForm.patchValue({ name: rule.name, description: rule.description, trigger: rule.trigger });

    for (const c of rule.conditions) {
      this.conditionsArray.push(this.fb.group({ field: [c.field], operator: [c.operator], value: [c.value] }));
    }
    for (const a of rule.actions) {
      const params = this.normalizeActionParams(a.type, a.params ?? {});
      this.actionsArray.push(this.fb.group({ type: [a.type], params: this.fb.group(params) }));
    }
    this.showRuleModal.set(true);
    this.cdr.detectChanges();
    // Re-apply form array values after options are in the DOM
    setTimeout(() => {
      for (let i = 0; i < this.actionsArray.length; i++) {
        const ctrl = this.actionsArray.at(i) as FormGroup;
        const type = ctrl.get('type')?.value;
        if (type) ctrl.get('type')?.setValue(type, { emitEvent: false });
      }
      for (let i = 0; i < this.conditionsArray.length; i++) {
        const ctrl = this.conditionsArray.at(i) as FormGroup;
        const field = ctrl.get('field')?.value;
        const op = ctrl.get('operator')?.value;
        if (field) ctrl.get('field')?.setValue(field, { emitEvent: false });
        if (op) ctrl.get('operator')?.setValue(op, { emitEvent: false });
      }
      this.cdr.detectChanges();
    }, 0);
  }

  saveRule() {
    if (this.ruleForm.invalid || this.actionsArray.length === 0) return;
    this.saving.set(true);

    const companyId = this.auth.currentCompanyId()!;
    const v = this.ruleForm.value;
    const actions = (this.actionsArray.value as any[]).filter((a) => !!a.type);
    if (actions.length === 0) { this.saving.set(false); return; }
    const payload = {
      name: v.name!, description: v.description!, trigger: v.trigger as AutomationTrigger,
      conditions: this.conditionsArray.value, actions, companyId,
    };

    const req = this.editingRule()
      ? this.service.update(this.editingRule()!.id, payload)
      : this.service.create(payload);

    req.subscribe({
      next: (rule) => {
        if (this.editingRule()) {
          this.rules.update((list) => list.map((r) => r.id === rule.id ? rule : r));
        } else {
          this.rules.update((list) => [rule, ...list]);
        }
        this.closeModal();
        this.saving.set(false);
      },
      error: () => this.saving.set(false),
    });
  }

  toggleRule(rule: AutomationRule) {
    this.service.toggle(rule.id).subscribe({
      next: (updated) => this.rules.update((list) => list.map((r) => r.id === updated.id ? updated : r)),
    });
  }

  deleteRule(rule: AutomationRule) {
    this.service.delete(rule.id).subscribe({
      next: () => this.rules.update((list) => list.filter((r) => r.id !== rule.id)),
    });
  }

  viewExecutions(rule: AutomationRule) {
    this.selectedRule.set(rule);
    this.showExecutions.set(true);
    this.executionsLoading.set(true);
    this.service.getExecutions(rule.id).subscribe({
      next: (data) => { this.executions.set(data); this.executionsLoading.set(false); },
      error: () => this.executionsLoading.set(false),
    });
  }

  addCondition() {
    this.conditionsArray.push(this.fb.group({ field: ['status'], operator: ['equals'], value: [''] }));
  }

  removeCondition(i: number) { this.conditionsArray.removeAt(i); }

  addAction() {
    this.actionsArray.push(this.fb.group({
      type:   ['SEND_TELEGRAM'],
      params: this.fb.group({ target: ['creator'], chatId: [''], message: [''] }),
    }));
  }

  removeAction(i: number) { this.actionsArray.removeAt(i); }

  getActionType(i: number): string {
    return this.actionsArray.at(i)?.get('type')?.value ?? '';
  }

  onActionTypeChange(i: number, event: Event) {
    const type = (event.target as HTMLSelectElement).value as AutomationActionType;
    const ctrl = this.actionsArray.at(i) as FormGroup;
    ctrl.get('type')?.setValue(type, { emitEvent: false });
    const paramsMap: Record<string, any> = {
      CHANGE_STATUS:     { status: 'DONE' },
      SEND_NOTIFICATION: { title: '', message: '' },
      CREATE_TASK:       { title: '' },
      SEND_EMAIL:        { to: '', subject: '' },
      ASSIGN_USER:       { userId: '' },
      SEND_WHATSAPP:     { target: 'assignee', message: '' },
      SEND_TELEGRAM:     { target: 'creator', chatId: '', message: '' },
    };
    ctrl.setControl('params', this.fb.group(paramsMap[type] ?? {}));
    this.cdr.markForCheck();
  }

  getTelegramTarget(i: number): string {
    return this.actionsArray.at(i)?.get('params')?.get('target')?.value ?? 'creator';
  }

  getWhatsAppTarget(i: number): string {
    return this.actionsArray.at(i)?.get('params')?.get('target')?.value ?? 'assignee';
  }

  private normalizeActionParams(type: AutomationActionType, params: Record<string, any>): Record<string, any> {
    const defaults: Record<AutomationActionType, Record<string, any>> = {
      CHANGE_STATUS:     { status: 'DONE' },
      ASSIGN_USER:       { userId: '' },
      SEND_NOTIFICATION: { title: '', message: '' },
      CREATE_TASK:       { title: '' },
      SEND_EMAIL:        { to: '', subject: '' },
      SEND_WHATSAPP:     { target: 'assignee', message: '' },
      SEND_TELEGRAM:     { target: 'creator', chatId: '', message: '' },
    };
    return { ...defaults[type], ...params };
  }

  closeModal() { this.showRuleModal.set(false); this.saving.set(false); this.editingRule.set(null); }
  timeAgo(d: string) { return formatDistanceToNow(new Date(d), { addSuffix: true, locale: ptBR }); }
}
