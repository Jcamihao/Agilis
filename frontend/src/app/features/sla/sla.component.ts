import {
  Component, OnInit, signal, ChangeDetectionStrategy, ChangeDetectorRef, inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { SlaService, SlaSummary, SlaBreached } from '../../core/services/sla.service';

@Component({
  selector: 'ag-sla',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink],
  templateUrl: './sla.component.html',
  styleUrls: ['./sla.component.scss'],
})
export class SlaComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly svc  = inject(SlaService);
  private readonly cdr  = inject(ChangeDetectorRef);

  loading  = signal(true);
  summary  = signal<SlaSummary | null>(null);
  breached = signal<SlaBreached[]>([]);

  readonly PRIORITY_COLOR: Record<string, string> = {
    LOW: '#22c55e', MEDIUM: '#f59e0b', HIGH: '#ef4444', URGENT: '#7c3aed',
  };
  readonly PRIORITY_LABEL: Record<string, string> = {
    LOW: 'Baixa', MEDIUM: 'Média', HIGH: 'Alta', URGENT: 'Urgente',
  };

  ngOnInit() {
    const cid = this.auth.currentCompanyId();
    if (!cid) { this.loading.set(false); return; }

    Promise.all([
      new Promise<void>(res => this.svc.summary(cid).subscribe({
        next: s  => { this.summary.set(s as any);  res(); },
        error: () => res(),
      })),
      new Promise<void>(res => this.svc.breached(cid).subscribe({
        next: b  => { this.breached.set(b as any ?? []); res(); },
        error: () => res(),
      })),
    ]).then(() => { this.loading.set(false); this.cdr.markForCheck(); });
  }

  fmt(min: number | null) { return this.svc.formatMinutes(min); }

  delayClass(min: number | null): string {
    if (!min) return 'delay-low';
    if (min < 60)   return 'delay-low';
    if (min < 1440) return 'delay-med';
    return 'delay-high';
  }

  trackById(_: number, r: SlaBreached) { return r.id; }
}
