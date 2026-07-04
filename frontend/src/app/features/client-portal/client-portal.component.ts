import {
  Component, OnInit, signal, computed,
  ChangeDetectionStrategy, ChangeDetectorRef, inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ClientPortalService } from '../../core/services/client-portal.service';
import { PublicPortalData, PortalTask } from '../../core/models';

@Component({
  selector: 'ag-client-portal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  templateUrl: './client-portal.component.html',
  styleUrls:   ['./client-portal.component.scss'],
})
export class ClientPortalComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly svc   = inject(ClientPortalService);
  private readonly cdr   = inject(ChangeDetectorRef);

  token        = signal('');
  loading      = signal(true);
  error        = signal('');
  needsPass    = signal(false);
  password     = signal('');
  data         = signal<PublicPortalData | null>(null);
  activeTab    = signal<'board' | 'timeline' | 'team'>('board');

  readonly accentStyle = computed(() => {
    const color = this.data()?.portal.accentColor ?? '#6366f1';
    return { '--portal-accent': color, '--portal-accent-light': color + '18' };
  });

  ngOnInit() {
    const token = this.route.snapshot.paramMap.get('token') ?? '';
    this.token.set(token);
    this.load();
  }

  load(pw?: string) {
    this.loading.set(true);
    this.error.set('');
    this.svc.getPublic(this.token(), pw).subscribe({
      next: (res: any) => {
        this.data.set(res?.data ?? res);
        this.loading.set(false);
        this.needsPass.set(false);
        // default tab
        const d = this.data()!;
        if (d.portal.showKanban) this.activeTab.set('board');
        else if (d.portal.showTimeline) this.activeTab.set('timeline');
        else this.activeTab.set('team');
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        const status = err?.status;
        if (status === 401) { this.needsPass.set(true); this.error.set(''); }
        else this.error.set(err?.error?.message ?? 'Portal não encontrado ou indisponível.');
        this.loading.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  submitPassword() {
    if (!this.password().trim()) return;
    this.load(this.password());
  }

  statusLabel(s: string)   { return this.svc.statusLabel(s); }
  priorityConfig(p: string) { return this.svc.priorityConfig(p); }

  isOverdue(task: PortalTask): boolean {
    return !!task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'DONE';
  }

  initials(name: string): string {
    return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
  }

  formatDate(d: string): string {
    return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  }
}
