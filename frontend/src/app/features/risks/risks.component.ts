import {
  Component, OnInit, signal, computed,
  ChangeDetectionStrategy, ChangeDetectorRef, inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  RisksService, Risk, RiskStats, CreateRiskDto,
  RiskImpact, RiskProbability, RiskStatus, RiskCategory,
} from '../../core/services/risks.service';

type View = 'matrix' | 'list';

@Component({
  selector: 'ag-risks',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  templateUrl: './risks.component.html',
  styleUrls: ['./risks.component.scss'],
})
export class RisksComponent implements OnInit {
  private readonly svc   = inject(RisksService);
  private readonly route = inject(ActivatedRoute);
  private readonly cdr   = inject(ChangeDetectorRef);

  projectId = signal('');
  view      = signal<View>('matrix');
  loading   = signal(true);
  risks     = signal<Risk[]>([]);
  stats     = signal<RiskStats | null>(null);
  showForm  = signal(false);
  editId    = signal<string | null>(null);
  toast     = signal<{ msg: string; type: 'success' | 'error' } | null>(null);

  readonly IMPACTS:         RiskImpact[]      = ['VERY_LOW','LOW','MEDIUM','HIGH','CRITICAL'];
  readonly IMPACTS_MATRIX:  RiskImpact[]      = ['CRITICAL','HIGH','MEDIUM','LOW','VERY_LOW'];
  readonly PROBS:           RiskProbability[] = ['VERY_LOW','LOW','MEDIUM','HIGH','VERY_HIGH'];
  readonly STATUSES:      RiskStatus[]      = ['OPEN','MITIGATED','ACCEPTED','CLOSED'];
  readonly CATEGORIES:    RiskCategory[]    = ['TECHNICAL','SCHEDULE','BUDGET','RESOURCE','EXTERNAL','QUALITY','OTHER'];

  // form
  form: CreateRiskDto = this.emptyForm();

  readonly openCount     = computed(() => this.risks().filter(r => r.status === 'OPEN').length);
  readonly criticalCount = computed(() => this.risks().filter(r => this.svc.scoreOf(r.impact, r.probability) >= 15 && r.status === 'OPEN').length);
  readonly highCount     = computed(() => this.risks().filter(r => {
    const s = this.svc.scoreOf(r.impact, r.probability);
    return s >= 9 && s < 15 && r.status === 'OPEN';
  }).length);

  // 5×5 matrix helpers
  cellRisks(impact: RiskImpact, prob: RiskProbability): Risk[] {
    return this.risks().filter(r => r.impact === impact && r.probability === prob);
  }

  cellColor(impact: RiskImpact, prob: RiskProbability): string {
    const score = this.svc.scoreOf(impact, prob);
    return this.svc.colorOf(score);
  }

  cellOpacity(impact: RiskImpact, prob: RiskProbability): string {
    const count = this.cellRisks(impact, prob).length;
    return count > 0 ? '0.85' : '0.08';
  }

  impactLabel(v: RiskImpact)     { return this.svc.IMPACT_LABELS[v]; }
  probLabel(v: RiskProbability)  { return this.svc.PROB_LABELS[v]; }
  statusLabel(v: RiskStatus)     { return this.svc.STATUS_LABELS[v]; }
  categoryLabel(v: RiskCategory) { return this.svc.CATEGORY_LABELS[v]; }
  scoreOf(r: Risk)               { return this.svc.scoreOf(r.impact, r.probability); }
  colorOf(r: Risk)               { return this.svc.colorOf(this.scoreOf(r)); }

  ngOnInit() {
    this.projectId.set(this.route.snapshot.paramMap.get('id') ?? '');
    this.load();
  }

  load() {
    this.loading.set(true);
    const pid = this.projectId();
    Promise.all([
      new Promise<void>(res => this.svc.list(pid).subscribe({ next: r => { this.risks.set(r as any ?? []); res(); }, error: () => res() })),
      new Promise<void>(res => this.svc.stats(pid).subscribe({ next: r => { this.stats.set(r as any); res(); }, error: () => res() })),
    ]).then(() => { this.loading.set(false); this.cdr.markForCheck(); });
  }

  openCreate() {
    this.editId.set(null);
    this.form = this.emptyForm();
    this.showForm.set(true);
  }

  openEdit(r: Risk) {
    this.editId.set(r.id);
    this.form = {
      title:       r.title,
      description: r.description ?? '',
      category:    r.category,
      impact:      r.impact,
      probability: r.probability,
      status:      r.status,
      ownerId:     r.ownerId ?? '',
      mitigation:  r.mitigation ?? '',
      dueDate:     r.dueDate ? r.dueDate.substring(0, 10) : '',
    };
    this.showForm.set(true);
  }

  save() {
    const pid  = this.projectId();
    const edit = this.editId();
    const obs  = edit
      ? this.svc.update(pid, edit, this.form)
      : this.svc.create(pid, this.form);
    obs.subscribe({
      next: () => { this.showForm.set(false); this.load(); this.showToast('Risco salvo com sucesso', 'success'); },
      error: () => this.showToast('Erro ao salvar risco', 'error'),
    });
  }

  remove(r: Risk) {
    if (!confirm(`Excluir risco "${r.title}"?`)) return;
    this.svc.delete(this.projectId(), r.id).subscribe({
      next: () => { this.load(); this.showToast('Risco excluído', 'success'); },
      error: () => this.showToast('Erro ao excluir', 'error'),
    });
  }

  private emptyForm(): CreateRiskDto {
    return { title: '', description: '', category: 'OTHER', impact: 'MEDIUM', probability: 'MEDIUM', status: 'OPEN', mitigation: '' };
  }

  private showToast(msg: string, type: 'success' | 'error') {
    this.toast.set({ msg, type });
    setTimeout(() => this.toast.set(null), 3000);
  }

  trackById(_: number, r: Risk) { return r.id; }
}
