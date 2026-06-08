import {
  Component,
  signal,
  inject,
  OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { AuditService } from '../../core/services/audit.service';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ACTION_META: Record<
  string,
  { label: string; icon: string; color: string }
> = {
  CREATE: { label: 'Criação', icon: 'add_circle', color: '#10b981' },
  UPDATE: { label: 'Atualização', icon: 'edit', color: '#3b82f6' },
  DELETE: { label: 'Exclusão', icon: 'delete', color: '#ef4444' },
  STATUS_CHANGE: {
    label: 'Mudança de status',
    icon: 'swap_horiz',
    color: '#8b5cf6',
  },
  ASSIGN: { label: 'Atribuição', icon: 'person_add', color: '#f59e0b' },
  COMMENT: { label: 'Comentário', icon: 'chat_bubble', color: '#6366f1' },
  EXPORT: { label: 'Exportação', icon: 'download', color: '#14b8a6' },
  LOGIN: { label: 'Login', icon: 'login', color: '#64748b' },
  LOGOUT: { label: 'Logout', icon: 'logout', color: '#64748b' },
};

@Component({
  selector: 'ag-audit',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './audit.component.html',
  styleUrls: ['./audit.component.scss'],
})
export class AuditComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly auditService = inject(AuditService);
  private readonly fb = inject(FormBuilder);

  loading = signal(true);
  logs = signal<any[]>([]);
  stats = signal<any>(null);
  page = signal<any>(null);
  currentPage = signal(1);
  selectedLog = signal<any>(null);

  filterForm = this.fb.group({
    action: [''],
    entityType: [''],
    from: [''],
    to: [''],
  });

  actionOptions = Object.entries(ACTION_META).map(([key, v]) => ({
    key,
    label: v.label,
  }));

  ngOnInit() {
    this.loadStats();
    this.load();
  }

  load() {
    const companyId = this.auth.currentCompanyId();
    if (!companyId) {
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    const f = this.filterForm.value;
    const filters: Record<string, string> = {
      page: String(this.currentPage()),
      limit: '50',
    };
    if (f.action) filters['action'] = f.action;
    if (f.entityType) filters['entityType'] = f.entityType;
    if (f.from) filters['from'] = f.from;
    if (f.to) filters['to'] = f.to;

    this.auditService.getAll(companyId, filters).subscribe({
      next: (data: any) => {
        this.logs.set(data.items);
        this.page.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  loadStats() {
    const companyId = this.auth.currentCompanyId();
    if (!companyId) return;
    this.auditService
      .getStats(companyId)
      .subscribe({ next: (data) => this.stats.set(data) });
  }

  clearFilters() {
    this.filterForm.reset();
    this.currentPage.set(1);
    this.load();
  }
  nextPage() {
    this.currentPage.update((p) => p + 1);
    this.load();
  }
  prevPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update((p) => p - 1);
      this.load();
    }
  }

  topActions = () => (this.stats()?.byAction ?? []).slice(0, 4);
  getAction(action: string) {
    return (
      ACTION_META[action] ?? { label: action, icon: 'info', color: '#94a3b8' }
    );
  }
  getEntries(obj: any): { key: string; value: string }[] {
    return Object.entries(obj ?? {}).map(([key, value]) => ({
      key,
      value: String(value),
    }));
  }
  timeAgo(d: string) {
    return formatDistanceToNow(new Date(d), { addSuffix: true, locale: ptBR });
  }
}
