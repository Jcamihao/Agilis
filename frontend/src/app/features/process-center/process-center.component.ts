import {
  Component, OnInit, inject, signal, ChangeDetectionStrategy, ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { ProcessCenterService } from '../../core/services/process-center.service';
import {
  Process, ProcessInstance, ProcessInstanceStep, ProcessStepType,
} from '../../core/models';

@Component({
  selector: 'ag-process-center',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  templateUrl: './process-center.component.html',
  styleUrls: ['./process-center.component.scss'],
})
export class ProcessCenterComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly svc  = inject(ProcessCenterService);
  private readonly cdr  = inject(ChangeDetectorRef);

  processes        = signal<Process[]>([]);
  selectedProcess  = signal<Process | null>(null);
  activeInstance   = signal<ProcessInstance | null>(null);
  loading          = signal(false);
  detailLoading    = signal(false);
  starting         = signal(false);
  showCreate       = signal(false);
  openMenuId       = signal<string | null>(null);

  newName = '';
  newDesc = '';
  newIcon = 'account_tree';
  newColor = '#6366f1';

  get companyId() { return this.auth.currentCompanyId() ?? ''; }

  ngOnInit() { this.load(); }

  load() {
    if (!this.companyId) return;
    this.loading.set(true);
    this.svc.list(this.companyId).subscribe({
      next: (list) => { this.processes.set(list); this.loading.set(false); this.cdr.markForCheck(); },
      error: () => { this.loading.set(false); this.cdr.markForCheck(); },
    });
  }

  selectProcess(p: Process) {
    this.activeInstance.set(null);
    this.detailLoading.set(true);
    this.openMenuId.set(null);
    this.svc.get(p.id).subscribe({
      next: (detail) => {
        this.selectedProcess.set(detail as Process);
        this.detailLoading.set(false);
        this.cdr.markForCheck();
      },
      error: () => { this.detailLoading.set(false); this.cdr.markForCheck(); },
    });
  }

  createProcess() {
    if (!this.newName.trim()) return;
    this.svc.create({
      companyId: this.companyId,
      name: this.newName.trim(),
      description: this.newDesc || undefined,
      icon: this.newIcon,
      color: this.newColor,
    }).subscribe({
      next: (p) => {
        this.processes.update(list => [p, ...list]);
        this.newName = '';
        this.newDesc = '';
        this.showCreate.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  startInstance(p: Process) {
    this.starting.set(true);
    this.svc.start(p.id).subscribe({
      next: (instance: ProcessInstance) => {
        this.starting.set(false);
        this.activeInstance.set(instance);
        this.processes.update(list =>
          list.map(x => x.id === p.id
            ? { ...x, _count: { ...(x._count ?? { steps: 0, instances: 0 }), instances: (x._count?.instances ?? 0) + 1 } }
            : x,
          ),
        );
        this.cdr.markForCheck();
      },
      error: () => { this.starting.set(false); this.cdr.markForCheck(); },
    });
  }

  openInstance(inst: ProcessInstance) {
    this.activeInstance.set(inst);
  }

  closeInstance() {
    this.activeInstance.set(null);
    const sel = this.selectedProcess();
    if (sel) this.selectProcess(sel);
  }

  completeStep(step: ProcessInstanceStep) {
    this.svc.updateInstanceStep(step.id, { status: 'DONE' }).subscribe({
      next: () => this.reloadInstance(),
    });
  }

  skipStep(step: ProcessInstanceStep) {
    this.svc.updateInstanceStep(step.id, { status: 'SKIPPED' }).subscribe({
      next: () => this.reloadInstance(),
    });
  }

  toggleAnswer(step: ProcessInstanceStep, itemId: string) {
    const answers = step.answers.map(a => ({
      itemId: a.itemId,
      isChecked: a.itemId === itemId ? !a.isChecked : a.isChecked,
    }));
    this.svc.updateInstanceStep(step.id, { answers }).subscribe({
      next: () => this.reloadInstance(),
    });
  }

  updateStatus(p: Process, status: 'ACTIVE' | 'ARCHIVED' | 'DRAFT') {
    this.openMenuId.set(null);
    this.svc.update(p.id, { status }).subscribe({
      next: () => {
        this.processes.update(list => list.map(x => x.id === p.id ? { ...x, status } : x));
        if (this.selectedProcess()?.id === p.id) {
          this.selectedProcess.update(x => x ? { ...x, status } : x);
        }
        this.cdr.markForCheck();
      },
    });
  }

  toggleMenu(id: string, e: Event) {
    e.stopPropagation();
    this.openMenuId.update(cur => cur === id ? null : id);
  }

  closeMenu() { this.openMenuId.set(null); }

  private reloadInstance() {
    const inst = this.activeInstance();
    const sel  = this.selectedProcess();
    if (!inst || !sel) return;
    this.svc.get(sel.id).subscribe({
      next: (detail: any) => {
        this.selectedProcess.set(detail as Process);
        const refreshed = (detail.instances as ProcessInstance[])?.find(i => i.id === inst.id);
        if (refreshed) this.activeInstance.set(refreshed);
        this.cdr.markForCheck();
      },
    });
  }

  stepTypeIcon(type: ProcessStepType): string {
    const m: Record<ProcessStepType, string> = {
      DOCUMENTATION: 'description',
      CHECKLIST: 'checklist',
      TASK: 'task_alt',
      APPROVAL: 'approval',
    };
    return m[type] ?? 'circle';
  }

  stepTypeLabel(type: ProcessStepType): string {
    const m: Record<ProcessStepType, string> = {
      DOCUMENTATION: 'Documentação',
      CHECKLIST: 'Checklist',
      TASK: 'Tarefas',
      APPROVAL: 'Aprovação',
    };
    return m[type] ?? type;
  }

  statusLabel(s: string): string {
    const m: Record<string, string> = { DRAFT: 'Rascunho', ACTIVE: 'Ativo', ARCHIVED: 'Arquivado' };
    return m[s] ?? s;
  }

  statusColor(s: string): string {
    const m: Record<string, string> = {
      DRAFT: '#94a3b8',
      ACTIVE: '#22c55e',
      ARCHIVED: '#f97316',
    };
    return m[s] ?? '#94a3b8';
  }

  instanceStatusLabel(s: string): string {
    const m: Record<string, string> = { RUNNING: 'Em execução', COMPLETED: 'Concluído', CANCELLED: 'Cancelado' };
    return m[s] ?? s;
  }

  stepStatusIcon(s: string): string {
    const m: Record<string, string> = {
      PENDING: 'radio_button_unchecked',
      IN_PROGRESS: 'pending',
      DONE: 'check_circle',
      SKIPPED: 'skip_next',
    };
    return m[s] ?? 'radio_button_unchecked';
  }

  stepStatusColor(s: string): string {
    const m: Record<string, string> = {
      PENDING: '#64748b',
      IN_PROGRESS: '#f59e0b',
      DONE: '#22c55e',
      SKIPPED: '#94a3b8',
    };
    return m[s] ?? '#64748b';
  }

  allAnswersChecked(step: ProcessInstanceStep): boolean {
    return step.answers.length > 0 && step.answers.every(a => a.isChecked);
  }

  checklistLabel(step: ProcessInstanceStep, itemId: string): string {
    return step.step.checklistItems?.find(i => i.id === itemId)?.label ?? '…';
  }
}
