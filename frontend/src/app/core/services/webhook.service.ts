import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';

export interface Webhook {
  id: string;
  companyId: string;
  name: string;
  url: string;
  events: string[];
  secret: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { deliveries: number };
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  event: string;
  payload: any;
  statusCode: number | null;
  success: boolean;
  durationMs: number | null;
  error: string | null;
  createdAt: string;
}

export const WEBHOOK_EVENTS: { value: string; label: string; description: string }[] = [
  { value: 'task.created',        label: 'Tarefa Criada',         description: 'Quando uma nova tarefa é criada' },
  { value: 'task.status_changed', label: 'Status Alterado',       description: 'Quando o status de uma tarefa muda' },
  { value: 'task.assigned',       label: 'Tarefa Atribuída',      description: 'Quando alguém é atribuído a uma tarefa' },
  { value: 'task.overdue',        label: 'Prazo Vencido',         description: 'Quando uma tarefa passa do prazo' },
  { value: 'comment.created',     label: 'Comentário Adicionado', description: 'Quando um comentário é criado em uma tarefa' },
  { value: 'process.completed',   label: 'Processo Concluído',    description: 'Quando todas as etapas de um processo são concluídas' },
];

@Injectable({ providedIn: 'root' })
export class WebhookService {
  private readonly api = inject(ApiService);

  list(companyId: string) {
    return this.api.get<Webhook[]>('/webhooks', { companyId });
  }

  create(data: { companyId: string; name: string; url: string; events: string[] }) {
    return this.api.post<Webhook>('/webhooks', data);
  }

  update(id: string, data: { name?: string; url?: string; events?: string[]; isActive?: boolean }) {
    return this.api.patch<Webhook>(`/webhooks/${id}`, data);
  }

  delete(id: string) {
    return this.api.delete<Webhook>(`/webhooks/${id}`);
  }

  getDeliveries(id: string) {
    return this.api.get<WebhookDelivery[]>(`/webhooks/${id}/deliveries`);
  }

  test(id: string) {
    return this.api.post<{ success: boolean; statusCode?: number; error?: string }>(`/webhooks/${id}/test`, {});
  }

  regenerateSecret(id: string) {
    return this.api.post<Webhook>(`/webhooks/${id}/regenerate-secret`, {});
  }
}
