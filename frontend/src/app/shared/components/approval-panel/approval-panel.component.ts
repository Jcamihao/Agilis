import {
  Component, Input, OnInit, signal,
  ChangeDetectionStrategy, ChangeDetectorRef, inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApprovalsService } from '../../../core/services/approvals.service';
import { UsersService, CompanyMember } from '../../../core/services/users.service';
import { AuthService } from '../../../core/services/auth.service';
import { TaskApproval, ApprovalStatus } from '../../../core/models';

@Component({
  selector: 'ag-approval-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  templateUrl: './approval-panel.component.html',
  styleUrls:   ['./approval-panel.component.scss'],
})
export class ApprovalPanelComponent implements OnInit {
  @Input({ required: true }) taskId!: string;

  private readonly svc     = inject(ApprovalsService);
  private readonly usersSvc = inject(UsersService);
  private readonly auth    = inject(AuthService);
  private readonly cdr     = inject(ChangeDetectorRef);

  loading    = signal(true);
  saving     = signal(false);
  expanded   = signal(false);
  approvals  = signal<TaskApproval[]>([]);
  members    = signal<CompanyMember[]>([]);

  // Request form
  note           = signal('');
  approverId     = signal('');
  targetStatus   = signal('DONE');

  readonly STATUS_OPTIONS = [
    { value: 'IN_REVIEW', label: 'Em Revisão' },
    { value: 'DONE',      label: 'Concluído' },
  ];

  readonly currentPending = signal<TaskApproval | null>(null);

  ngOnInit() { this.load(); }

  load() {
    const userId = this.auth.user()?.id ?? '';
    this.svc.getForTask(this.taskId).subscribe({
      next: (res: any) => {
        const list: TaskApproval[] = res?.data ?? res ?? [];
        this.approvals.set(list);
        this.currentPending.set(list.find(a => a.status === 'PENDING') ?? null);
        this.loading.set(false);
        this.cdr.markForCheck();
      },
      error: () => { this.loading.set(false); },
    });

    const cid = this.auth.currentCompanyId() ?? '';
    if (cid) {
      this.usersSvc.getCompanyMembers(cid).subscribe({
        next: (res: any) => {
          this.members.set(res?.data ?? res ?? []);
          this.cdr.markForCheck();
        },
      });
    }
  }

  toggle() { this.expanded.update(v => !v); this.cdr.markForCheck(); }

  request() {
    if (this.saving()) return;
    this.saving.set(true);
    this.svc.request({
      taskId:       this.taskId,
      approverId:   this.approverId() || undefined,
      note:         this.note() || undefined,
      targetStatus: this.targetStatus(),
    }).subscribe({
      next: (res: any) => {
        const a: TaskApproval = res?.data ?? res;
        this.approvals.update(l => [a, ...l]);
        this.currentPending.set(a);
        this.note.set('');
        this.approverId.set('');
        this.saving.set(false);
        this.cdr.markForCheck();
      },
      error: () => { this.saving.set(false); },
    });
  }

  statusConfig(s: ApprovalStatus) { return this.svc.statusConfig(s); }

  trackById(_: number, a: TaskApproval) { return a.id; }
}
