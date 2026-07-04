import {
  Component, Input, OnInit, OnDestroy, signal, inject,
  ChangeDetectionStrategy, ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { TimeTrackingService, TimeEntry, TaskTimeLog } from '../../../core/services/time-tracking.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmService } from '../../../core/services/confirm.service';

@Component({
  selector: 'ag-time-tracker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="space-y-4">
      <!-- Header row -->
      <div class="flex items-center justify-between">
        <h3 class="text-xs font-semibold text-[--text-secondary] uppercase tracking-wider flex items-center gap-1.5">
          <span class="material-symbols-rounded text-base">schedule</span>
          Tempo Registrado
          @if (totalMin() > 0) {
            <span class="text-primary-600 normal-case font-semibold ml-1">
              {{ fmt(totalMin()) }}
            </span>
          }
        </h3>
      </div>

      <!-- Active timer -->
      @if (activeTimer()) {
        <div class="flex items-center gap-3 px-3 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
          <div class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0"></div>
          <div class="flex-1 min-w-0">
            <p class="text-xs font-semibold text-emerald-700">Timer rodando</p>
            <p class="text-lg font-mono font-bold text-emerald-800 leading-tight">{{ elapsed() }}</p>
          </div>
          <button (click)="stop()"
            [disabled]="acting()"
            class="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50">
            <span class="material-symbols-rounded text-sm">stop_circle</span>
            Parar
          </button>
        </div>
      } @else {
        <!-- Start button -->
        <button (click)="start()"
          [disabled]="acting()"
          class="flex items-center gap-2 px-3 py-2 bg-white hover:bg-primary-50 border border-slate-200 hover:border-primary-300 text-[--text-secondary] hover:text-primary-700 text-sm font-medium rounded-xl transition-all w-full justify-center disabled:opacity-50">
          <span class="material-symbols-rounded text-base">play_circle</span>
          Iniciar Timer
        </button>
      }

      <!-- Manual entry form toggle -->
      <div>
        <button (click)="showManual.set(!showManual())"
          class="flex items-center gap-1.5 text-xs text-[--text-tertiary] hover:text-[--text-secondary] transition-colors">
          <span class="material-symbols-rounded text-sm">{{ showManual() ? 'expand_less' : 'add' }}</span>
          Adicionar manualmente
        </button>

        @if (showManual()) {
          <form [formGroup]="manualForm" (ngSubmit)="addManual()"
            class="mt-2 flex items-end gap-2 animate-fade-in">
            <div class="flex-1">
              <label class="ag-label">Duração (min)</label>
              <input formControlName="durationMin" type="number" min="1"
                class="ag-input ag-input--sm" placeholder="ex: 90" />
            </div>
            <div class="flex-1">
              <label class="ag-label">Descrição</label>
              <input formControlName="description" type="text"
                class="ag-input ag-input--sm" placeholder="Opcional" />
            </div>
            <button type="submit"
              [disabled]="manualForm.invalid || acting()"
              class="ag-btn ag-btn--primary ag-btn--sm flex-shrink-0 mb-0.5">
              Salvar
            </button>
          </form>
        }
      </div>

      <!-- Entries list -->
      @if (loading()) {
        <div class="space-y-2">
          @for (i of [1,2]; track i) {
            <div class="h-10 bg-slate-100 rounded-lg ag-skeleton"></div>
          }
        </div>
      } @else if (entries().length > 0) {
        <div class="space-y-1.5 max-h-48 overflow-y-auto pr-1">
          @for (entry of entries(); track entry.id) {
            <div class="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-slate-50 group/entry text-xs">
              <!-- Avatar -->
              <div class="w-5 h-5 rounded-full bg-primary-600 flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0 overflow-hidden">
                @if (entry.user.avatarUrl) {
                  <img [src]="entry.user.avatarUrl" class="w-full h-full object-cover" />
                } @else {
                  {{ entry.user.name.charAt(0) }}
                }
              </div>
              <!-- Name + desc -->
              <div class="flex-1 min-w-0">
                <span class="font-medium text-[--text-secondary]">{{ entry.user.name }}</span>
                @if (entry.description) {
                  <span class="text-[--text-tertiary] ml-1">· {{ entry.description }}</span>
                }
                <div class="text-[--text-tertiary] mt-0.5">{{ formatDate(entry.startedAt) }}</div>
              </div>
              <!-- Duration -->
              <span class="font-semibold text-[--text-secondary] flex-shrink-0">
                @if (entry.durationMin) { {{ fmt(entry.durationMin) }} }
                @else { <span class="text-emerald-500">rodando</span> }
              </span>
              <!-- Delete -->
              <button (click)="removeEntry(entry)"
                class="opacity-0 group-hover/entry:opacity-100 p-0.5 rounded text-slate-300 hover:text-red-500 transition-all flex-shrink-0">
                <span class="material-symbols-rounded text-sm">close</span>
              </button>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class TimeTrackerComponent implements OnInit, OnDestroy {
  @Input() taskId!: string;

  private readonly svc     = inject(TimeTrackingService);
  private readonly toast   = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly fb      = inject(FormBuilder);
  private readonly cdr     = inject(ChangeDetectorRef);

  loading     = signal(true);
  acting      = signal(false);
  showManual  = signal(false);
  entries     = signal<TimeEntry[]>([]);
  totalMin    = signal(0);
  activeTimer = signal<TimeEntry | null>(null);
  elapsed     = signal('00:00');

  manualForm = this.fb.group({
    durationMin:  [null as number | null, [Validators.required, Validators.min(1)]],
    description: [''],
  });

  private tickInterval: any;

  ngOnInit() {
    this.load();
  }

  ngOnDestroy() {
    clearInterval(this.tickInterval);
  }

  private load() {
    this.loading.set(true);
    this.svc.listByTask(this.taskId).subscribe({
      next: (log) => {
        this.entries.set(log.entries);
        this.totalMin.set(log.totalMin);
        this.activeTimer.set(log.activeTimer);
        this.loading.set(false);
        if (log.activeTimer) this.startTick(log.activeTimer.startedAt);
        this.cdr.markForCheck();
      },
      error: () => this.loading.set(false),
    });
  }

  start() {
    this.acting.set(true);
    this.svc.startTimer(this.taskId).subscribe({
      next: (entry) => {
        this.activeTimer.set(entry);
        this.entries.update((l) => [entry, ...l]);
        this.startTick(entry.startedAt);
        this.acting.set(false);
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.toast.error(err?.error?.message ?? 'Erro ao iniciar timer');
        this.acting.set(false);
      },
    });
  }

  stop() {
    this.acting.set(true);
    this.svc.stopTimer(this.taskId).subscribe({
      next: (updated) => {
        clearInterval(this.tickInterval);
        this.activeTimer.set(null);
        this.elapsed.set('00:00');
        this.entries.update((l) =>
          l.map((e) => e.id === updated.id ? updated : e)
        );
        this.totalMin.update((t) => t + (updated.durationMin ?? 0));
        this.acting.set(false);
        this.cdr.markForCheck();
      },
      error: () => { this.acting.set(false); },
    });
  }

  addManual() {
    if (this.manualForm.invalid) return;
    const v = this.manualForm.value;
    this.acting.set(true);
    this.svc.addManual(this.taskId, v.durationMin!, v.description || undefined).subscribe({
      next: (entry) => {
        this.entries.update((l) => [entry, ...l]);
        this.totalMin.update((t) => t + (entry.durationMin ?? 0));
        this.manualForm.reset();
        this.showManual.set(false);
        this.acting.set(false);
        this.cdr.markForCheck();
      },
      error: () => this.acting.set(false),
    });
  }

  async removeEntry(entry: TimeEntry) {
    const ok = await this.confirm.open({
      title: 'Remover entrada',
      message: `Remover ${this.fmt(entry.durationMin ?? 0)} de tempo?`,
      danger: true,
    });
    if (!ok) return;
    this.svc.deleteEntry(entry.id).subscribe({
      next: () => {
        this.entries.update((l) => l.filter((e) => e.id !== entry.id));
        this.totalMin.update((t) => t - (entry.durationMin ?? 0));
        if (this.activeTimer()?.id === entry.id) {
          this.activeTimer.set(null);
          clearInterval(this.tickInterval);
        }
        this.cdr.markForCheck();
      },
    });
  }

  private startTick(startedAt: string) {
    clearInterval(this.tickInterval);
    this.elapsed.set(this.svc.liveElapsed(startedAt));
    this.tickInterval = setInterval(() => {
      this.elapsed.set(this.svc.liveElapsed(startedAt));
      this.cdr.markForCheck();
    }, 1000);
  }

  fmt(min: number) { return this.svc.formatDuration(min); }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }
}
