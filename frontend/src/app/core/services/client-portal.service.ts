import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { ClientPortal, PublicPortalData } from '../models';

@Injectable({ providedIn: 'root' })
export class ClientPortalService {
  private readonly api = inject(ApiService);

  getOrCreate(projectId: string) {
    return this.api.get<ClientPortal>(`/projects/${projectId}/portal`);
  }

  update(projectId: string, dto: Partial<ClientPortal>) {
    return this.api.patch<ClientPortal>(`/projects/${projectId}/portal`, dto);
  }

  regenerateToken(projectId: string) {
    return this.api.post<ClientPortal>(`/projects/${projectId}/portal/regenerate-token`, {});
  }

  getPublic(token: string, password?: string) {
    const params: Record<string, string> = {};
    if (password) params['password'] = password;
    return this.api.get<PublicPortalData>(`/public/portal/${token}`, params);
  }

  portalUrl(token: string): string {
    return `${window.location.origin}/portal/${token}`;
  }

  statusLabel(status: string): string {
    const map: Record<string, string> = {
      BACKLOG:     'Backlog',
      TODO:        'A Fazer',
      IN_PROGRESS: 'Em Andamento',
      IN_REVIEW:   'Em Revisão',
      DONE:        'Concluído',
    };
    return map[status] ?? status;
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
