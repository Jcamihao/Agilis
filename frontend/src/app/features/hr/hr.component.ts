import {
  Component, OnInit, signal, computed,
  ChangeDetectionStrategy, ChangeDetectorRef, inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  HrService, HrProfile, LeaveRequest, TimeRecord,
  LEAVE_TYPE_LABELS, TIME_RECORD_LABELS, HR_STATUS_LABELS,
} from '../../core/services/hr.service';
import { AuthService } from '../../core/services/auth.service';

type Tab = 'directory' | 'orgchart' | 'leave' | 'timerecords' | 'birthdays';

@Component({
  selector: 'ag-hr',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  templateUrl: './hr.component.html',
  styleUrls: ['./hr.component.scss'],
})
export class HrComponent implements OnInit {
  private readonly svc  = inject(HrService);
  private readonly auth = inject(AuthService);
  private readonly cdr  = inject(ChangeDetectorRef);

  readonly leaveTypeLabels    = LEAVE_TYPE_LABELS;
  readonly timeRecordLabels   = TIME_RECORD_LABELS;
  readonly hrStatusLabels     = HR_STATUS_LABELS;
  readonly leaveTypes         = Object.keys(LEAVE_TYPE_LABELS);
  readonly timeRecordTypes    = ['CLOCK_IN', 'BREAK_START', 'BREAK_END', 'CLOCK_OUT'];

  tab         = signal<Tab>('directory');
  profiles    = signal<HrProfile[]>([]);
  orgChart    = signal<HrProfile[]>([]);
  birthdays   = signal<HrProfile[]>([]);
  leaves      = signal<LeaveRequest[]>([]);
  timeRecords = signal<TimeRecord[]>([]);
  loading     = signal(false);

  // Leave form
  showLeaveForm  = signal(false);
  leaveType      = signal('VACATION');
  leaveStart     = signal('');
  leaveEnd       = signal('');
  leaveReason    = signal('');

  // Profile edit
  editingProfile = signal<HrProfile | null>(null);
  editJobTitle   = signal('');
  editDept       = signal('');
  editAdmission  = signal('');
  editBirth      = signal('');
  editStatus     = signal<'ACTIVE'|'ON_LEAVE'|'TERMINATED'>('ACTIVE');

  // Directory filter
  deptFilter     = signal('');

  readonly companyId  = computed(() => this.auth.currentCompanyId() ?? '');
  readonly me         = computed(() => this.auth.user());

  readonly departments = computed(() =>
    [...new Set(this.profiles().map(p => p.department).filter(Boolean))] as string[]
  );

  readonly filteredProfiles = computed(() => {
    const f = this.deptFilter();
    return f ? this.profiles().filter(p => p.department === f) : this.profiles();
  });

  readonly todayRecords = computed(() => this.timeRecords());

  ngOnInit() { this.loadTab('directory'); }

  setTab(t: Tab) {
    this.tab.set(t);
    this.loadTab(t);
  }

  loadTab(t: Tab) {
    const cid = this.companyId();
    this.loading.set(true);
    switch (t) {
      case 'directory':
        this.svc.listProfiles(cid).subscribe({ next: r => { this.profiles.set(r as any ?? []); this.done(); }, error: () => this.done() });
        break;
      case 'orgchart':
        this.svc.orgChart(cid).subscribe({ next: r => { this.orgChart.set(r as any ?? []); this.done(); }, error: () => this.done() });
        break;
      case 'birthdays':
        this.svc.birthdays(cid).subscribe({ next: r => { this.birthdays.set(r as any ?? []); this.done(); }, error: () => this.done() });
        break;
      case 'leave':
        this.svc.listLeave(cid).subscribe({ next: r => { this.leaves.set(r as any ?? []); this.done(); }, error: () => this.done() });
        break;
      case 'timerecords':
        this.svc.myRecords(cid).subscribe({ next: r => { this.timeRecords.set(r as any ?? []); this.done(); }, error: () => this.done() });
        break;
    }
  }

  private done() { this.loading.set(false); this.cdr.markForCheck(); }

  // ── Profile edit ─────────────────────────────────────────────────────────
  openEdit(p: HrProfile) {
    this.editingProfile.set(p);
    this.editJobTitle.set(p.jobTitle ?? '');
    this.editDept.set(p.department ?? '');
    this.editAdmission.set(p.admissionDate ? p.admissionDate.slice(0,10) : '');
    this.editBirth.set(p.birthDate ? p.birthDate.slice(0,10) : '');
    this.editStatus.set(p.status);
  }

  saveProfile() {
    const p = this.editingProfile();
    if (!p) return;
    const dto = {
      jobTitle: this.editJobTitle() || undefined,
      department: this.editDept() || undefined,
      admissionDate: this.editAdmission() || undefined,
      birthDate: this.editBirth() || undefined,
      status: this.editStatus(),
    };
    this.svc.upsertProfile(this.companyId(), p.userId, dto as any).subscribe({
      next: (updated: any) => {
        this.profiles.update(list => list.map(x => x.userId === updated.userId ? { ...x, ...updated } : x));
        this.editingProfile.set(null);
        this.cdr.markForCheck();
      },
    });
  }

  // ── Leave ─────────────────────────────────────────────────────────────────
  submitLeave() {
    if (!this.leaveStart() || !this.leaveEnd()) return;
    this.svc.createLeave(this.companyId(), {
      type: this.leaveType(), startDate: this.leaveStart(),
      endDate: this.leaveEnd(), reason: this.leaveReason() || undefined,
    }).subscribe({
      next: (r: any) => {
        this.leaves.update(l => [r, ...l]);
        this.showLeaveForm.set(false);
        this.leaveStart.set(''); this.leaveEnd.set(''); this.leaveReason.set('');
        this.cdr.markForCheck();
      },
    });
  }

  reviewLeave(id: string, approve: boolean) {
    this.svc.reviewLeave(id, approve).subscribe({
      next: (r: any) => {
        this.leaves.update(l => l.map(x => x.id === id ? r : x));
        this.cdr.markForCheck();
      },
    });
  }

  cancelLeave(id: string) {
    this.svc.cancelLeave(id).subscribe({
      next: () => {
        this.leaves.update(l => l.map(x => x.id === id ? { ...x, status: 'CANCELLED' } : x));
        this.cdr.markForCheck();
      },
    });
  }

  // ── Ponto ─────────────────────────────────────────────────────────────────
  clock(type: string) {
    this.svc.clockIn(this.companyId(), type).subscribe({
      next: (r: any) => {
        this.timeRecords.update(l => [...l, r]);
        this.cdr.markForCheck();
      },
    });
  }

  lastRecordType(): string | null {
    const recs = this.timeRecords();
    return recs.length ? recs[recs.length - 1].type : null;
  }

  nextClock(): string {
    const last = this.lastRecordType();
    if (!last || last === 'CLOCK_OUT') return 'CLOCK_IN';
    if (last === 'CLOCK_IN')    return 'BREAK_START';
    if (last === 'BREAK_START') return 'BREAK_END';
    if (last === 'BREAK_END')   return 'CLOCK_OUT';
    return 'CLOCK_IN';
  }

  initials(name: string) {
    const p = name.trim().split(' ');
    return p.length >= 2 ? p[0][0] + p[p.length - 1][0] : p[0].slice(0, 2);
  }

  isMe(userId: string) { return userId === (this.me()?.id ?? ''); }

  trackById(_: number, item: { id: string }) { return item.id; }
}
