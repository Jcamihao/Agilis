import {
  Component, OnInit, signal, inject, computed,
  ChangeDetectionStrategy, ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { OkrsService } from '../../core/services/okrs.service';
import { ToastService } from '../../core/services/toast.service';
import { Objective, KeyResult, ObjectiveStatus } from '../../core/models';

type ModalMode = 'objective' | 'key-result' | 'update-kr' | null;

@Component({
  selector: 'ag-okrs',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './okrs.component.html',
  styleUrls: ['./okrs.component.scss'],
})
export class OkrsComponent implements OnInit {
  private readonly svc   = inject(OkrsService);
  private readonly toast = inject(ToastService);
  private readonly fb    = inject(FormBuilder);
  private readonly cdr   = inject(ChangeDetectorRef);

  loading    = signal(true);
  saving     = signal(false);
  objectives = signal<Objective[]>([]);
  expanded   = signal<Set<string>>(new Set());
  modal      = signal<ModalMode>(null);
  activeObjectiveId = signal<string | null>(null);
  activeKrId        = signal<string | null>(null);

  // Summary stats
  readonly total     = computed(() => this.objectives().length);
  readonly active    = computed(() => this.objectives().filter(o => o.status === 'ACTIVE').length);
  readonly completed = computed(() => this.objectives().filter(o => o.status === 'COMPLETED').length);
  readonly avgProgress = computed(() => {
    const list = this.objectives();
    return list.length ? Math.round(list.reduce((s, o) => s + o.progress, 0) / list.length) : 0;
  });

  // Forms
  objForm = this.fb.group({
    title:       ['', Validators.required],
    description: [''],
    startDate:   ['', Validators.required],
    endDate:     ['', Validators.required],
  });

  krForm = this.fb.group({
    title:       ['', Validators.required],
    type:        ['PERCENTAGE'],
    targetValue: [100, [Validators.required, Validators.min(0.01)]],
    unit:        [''],
  });

  krUpdateForm = this.fb.group({
    currentValue: [0, [Validators.required, Validators.min(0)]],
  });

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.svc.list().subscribe({
      next: (res: any) => {
        this.objectives.set(res?.data ?? res ?? []);
        this.loading.set(false);
        this.cdr.markForCheck();
      },
      error: () => { this.loading.set(false); this.cdr.markForCheck(); },
    });
  }

  // ── Expand / collapse ─────────────────────────────────────────────────────
  toggle(id: string) {
    this.expanded.update(s => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  // ── Objective CRUD ────────────────────────────────────────────────────────
  openCreateObjective() {
    this.objForm.reset({ title: '', description: '', startDate: '', endDate: '' });
    this.modal.set('objective');
  }

  saveObjective() {
    if (this.objForm.invalid) return;
    this.saving.set(true);
    const { title, description, startDate, endDate } = this.objForm.value as any;
    this.svc.create({ title, description, startDate, endDate }).subscribe({
      next: (res: any) => {
        const obj: Objective = res?.data ?? res;
        this.objectives.update(l => [obj, ...l]);
        this.modal.set(null);
        this.saving.set(false);
        this.toast.success('Objetivo criado');
        this.cdr.markForCheck();
      },
      error: () => { this.saving.set(false); },
    });
  }

  cycleStatus(obj: Objective) {
    const next: Record<ObjectiveStatus, ObjectiveStatus> = {
      DRAFT: 'ACTIVE', ACTIVE: 'COMPLETED', COMPLETED: 'DRAFT', CANCELLED: 'DRAFT',
    };
    this.svc.update(obj.id, { status: next[obj.status] }).subscribe({
      next: (res: any) => {
        const updated: Objective = res?.data ?? res;
        this.objectives.update(l => l.map(o => o.id === obj.id ? updated : o));
        this.cdr.markForCheck();
      },
    });
  }

  deleteObjective(id: string) {
    this.svc.delete(id).subscribe({
      next: () => {
        this.objectives.update(l => l.filter(o => o.id !== id));
        this.toast.success('Objetivo removido');
        this.cdr.markForCheck();
      },
    });
  }

  // ── Key Result CRUD ───────────────────────────────────────────────────────
  openCreateKR(objectiveId: string) {
    this.activeObjectiveId.set(objectiveId);
    this.krForm.reset({ title: '', type: 'PERCENTAGE', targetValue: 100, unit: '' });
    this.modal.set('key-result');
  }

  saveKR() {
    if (this.krForm.invalid) return;
    const oid = this.activeObjectiveId();
    if (!oid) return;
    this.saving.set(true);
    const { title, type, targetValue, unit } = this.krForm.value as any;
    this.svc.createKR(oid, { title, type, targetValue: +targetValue, unit }).subscribe({
      next: (res: any) => {
        const kr: KeyResult = res?.data ?? res;
        this.objectives.update(l => l.map(o =>
          o.id === oid ? { ...o, keyResults: [...o.keyResults, { ...kr, tasks: [] }] } : o
        ));
        this.modal.set(null);
        this.saving.set(false);
        this.toast.success('Key Result criado');
        this.cdr.markForCheck();
      },
      error: () => { this.saving.set(false); },
    });
  }

  openUpdateKR(kr: KeyResult) {
    this.activeKrId.set(kr.id);
    this.krUpdateForm.patchValue({ currentValue: kr.currentValue });
    this.modal.set('update-kr');
  }

  saveKRProgress() {
    if (this.krUpdateForm.invalid) return;
    const id = this.activeKrId();
    if (!id) return;
    this.saving.set(true);
    const { currentValue } = this.krUpdateForm.value as any;
    this.svc.updateKR(id, { currentValue: +currentValue }).subscribe({
      next: (res: any) => {
        const updated: KeyResult = res?.data ?? res;
        this.objectives.update(l => l.map(o => ({
          ...o,
          keyResults: o.keyResults.map(kr => kr.id === id ? { ...kr, currentValue: updated.currentValue } : kr),
          progress: this.calcProgress({ ...o, keyResults: o.keyResults.map(kr => kr.id === id ? { ...kr, currentValue: updated.currentValue } : kr) }),
        })));
        this.modal.set(null);
        this.saving.set(false);
        this.toast.success('Progresso atualizado');
        this.cdr.markForCheck();
      },
      error: () => { this.saving.set(false); },
    });
  }

  deleteKR(objectiveId: string, krId: string) {
    this.svc.deleteKR(krId).subscribe({
      next: () => {
        this.objectives.update(l => l.map(o =>
          o.id === objectiveId ? { ...o, keyResults: o.keyResults.filter(kr => kr.id !== krId) } : o
        ));
        this.cdr.markForCheck();
      },
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  krProgress(kr: KeyResult): number {
    if (kr.targetValue <= 0) return 0;
    return Math.min(100, Math.round((kr.currentValue / kr.targetValue) * 100));
  }

  private calcProgress(obj: Objective): number {
    if (!obj.keyResults.length) return 0;
    return Math.round(obj.keyResults.reduce((s, kr) =>
      s + (kr.targetValue > 0 ? Math.min(100, (kr.currentValue / kr.targetValue) * 100) : 0), 0
    ) / obj.keyResults.length);
  }

  statusConfig(s: ObjectiveStatus): { label: string; color: string; bg: string } {
    const map: Record<ObjectiveStatus, { label: string; color: string; bg: string }> = {
      DRAFT:     { label: 'Rascunho',   color: '#64748b', bg: '#f1f5f9' },
      ACTIVE:    { label: 'Ativo',      color: '#6366f1', bg: '#eef2ff' },
      COMPLETED: { label: 'Concluído',  color: '#10b981', bg: '#f0fdf4' },
      CANCELLED: { label: 'Cancelado',  color: '#ef4444', bg: '#fef2f2' },
    };
    return map[s] ?? map.DRAFT;
  }

  progressColor(pct: number): string {
    if (pct >= 80) return '#10b981';
    if (pct >= 50) return '#6366f1';
    if (pct >= 25) return '#f59e0b';
    return '#ef4444';
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  initials(name: string): string {
    const p = name.trim().split(' ');
    return p.length >= 2 ? p[0][0] + p[p.length - 1][0] : p[0].slice(0, 2);
  }

  closeModal() { this.modal.set(null); }
}
