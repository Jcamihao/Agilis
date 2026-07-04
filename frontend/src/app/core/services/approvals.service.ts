import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { TaskApproval, ApprovalStatus } from '../models';

@Injectable({ providedIn: 'root' })
export class ApprovalsService {
  private readonly api = inject(ApiService);

  getMyPending() {
    return this.api.get<TaskApproval[]>('/approvals/pending');
  }

  getMyRequested() {
    return this.api.get<TaskApproval[]>('/approvals/requested');
  }

  getForTask(taskId: string) {
    return this.api.get<TaskApproval[]>(`/approvals/task/${taskId}`);
  }

  request(dto: { taskId: string; approverId?: string; note?: string; targetStatus?: string }) {
    return this.api.post<TaskApproval>('/approvals/request', dto);
  }

  review(id: string, status: 'APPROVED' | 'REJECTED', reviewNote?: string) {
    return this.api.patch<TaskApproval>(`/approvals/${id}/review`, { status, reviewNote });
  }

  cancel(id: string) {
    return this.api.patch<TaskApproval>(`/approvals/${id}/cancel`, {});
  }

  statusConfig(status: ApprovalStatus): { label: string; color: string; bg: string; icon: string } {
    const map: Record<ApprovalStatus, { label: string; color: string; bg: string; icon: string }> = {
      PENDING:   { label: 'Pendente',   color: '#d97706', bg: '#fef3c7', icon: 'hourglass_top' },
      APPROVED:  { label: 'Aprovado',   color: '#059669', bg: '#d1fae5', icon: 'check_circle' },
      REJECTED:  { label: 'Rejeitado',  color: '#dc2626', bg: '#fee2e2', icon: 'cancel' },
      CANCELLED: { label: 'Cancelado',  color: '#94a3b8', bg: '#f1f5f9', icon: 'do_not_disturb' },
    };
    return map[status];
  }

  priorityConfig(priority: string): { color: string; label: string } {
    const map: Record<string, { color: string; label: string }> = {
      LOW:    { color: '#22c55e', label: 'Baixa' },
      MEDIUM: { color: '#f59e0b', label: 'Média' },
      HIGH:   { color: '#ef4444', label: 'Alta' },
      URGENT: { color: '#7c3aed', label: 'Urgente' },
    };
    return map[priority] ?? { color: '#94a3b8', label: priority };
  }
}
