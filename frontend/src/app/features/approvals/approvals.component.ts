import {
  Component, OnInit, signal, computed,
  ChangeDetectionStrategy, ChangeDetectorRef, inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApprovalsService } from '../../core/services/approvals.service';
import { TaskApproval, ApprovalStatus } from '../../core/models';

type Tab = 'pending' | 'requested';

@Component({
  selector: 'ag-approvals',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  templateUrl: './approvals.component.html',
  styleUrls:   ['./approvals.component.scss'],
})
export class ApprovalsComponent implements OnInit {
  private readonly svc = inject(ApprovalsService);
  private readonly cdr = inject(ChangeDetectorRef);

  tab          = signal<Tab>('pending');
  loading      = signal(true);
  pending      = signal<TaskApproval[]>([]);
  requested    = signal<TaskApproval[]>([]);
  reviewing    = signal<string | null>(null);    // approval id being reviewed
  reviewNote   = signal('');
  requesting   = signal(false);

  readonly pendingCount = computed(() => this.pending().filter(a => a.status === 'PENDING').length);

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    Promise.all([
      new Promise<void>(res => this.svc.getMyPending().subscribe({
        next: (r: any) => { this.pending.set(r?.data ?? r ?? []); res(); },
        error: () => res(),
      })),
      new Promise<void>(res => this.svc.getMyRequested().subscribe({
        next: (r: any) => { this.requested.set(r?.data ?? r ?? []); res(); },
        error: () => res(),
      })),
    ]).then(() => { this.loading.set(false); this.cdr.markForCheck(); });
  }

  openReview(id: string) {
    this.reviewing.set(id);
    this.reviewNote.set('');
    this.cdr.markForCheck();
  }

  closeReview() { this.reviewing.set(null); this.cdr.markForCheck(); }

  approve(id: string) {
    this.requesting.set(true);
    this.svc.review(id, 'APPROVED', this.reviewNote() || undefined).subscribe({
      next: (r: any) => {
        const updated: TaskApproval = r?.data ?? r;
        this.pending.update(l => l.map(a => a.id === id ? updated : a));
        this.reviewing.set(null);
        this.requesting.set(false);
        this.cdr.markForCheck();
      },
      error: () => { this.requesting.set(false); },
    });
  }

  reject(id: string) {
    if (!this.reviewNote().trim()) { alert('Informe o motivo da rejeição'); return; }
    this.requesting.set(true);
    this.svc.review(id, 'REJECTED', this.reviewNote()).subscribe({
      next: (r: any) => {
        const updated: TaskApproval = r?.data ?? r;
        this.pending.update(l => l.map(a => a.id === id ? updated : a));
        this.reviewing.set(null);
        this.requesting.set(false);
        this.cdr.markForCheck();
      },
      error: () => { this.requesting.set(false); },
    });
  }

  cancel(id: string) {
    this.svc.cancel(id).subscribe({
      next: (r: any) => {
        const updated: TaskApproval = r?.data ?? r;
        this.requested.update(l => l.map(a => a.id === id ? updated : a));
        this.cdr.markForCheck();
      },
    });
  }

  statusConfig(s: ApprovalStatus) { return this.svc.statusConfig(s); }
  priorityConfig(p: string)       { return this.svc.priorityConfig(p); }

  initials(name: string): string {
    return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
  }

  trackById(_: number, a: TaskApproval) { return a.id; }
}
