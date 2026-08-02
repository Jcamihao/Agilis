import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';

export interface AiConversationSummary {
  id: string;
  title: string;
  updatedAt: string;
  _count: { messages: number };
  messages: { content: string; role: string }[];
}

export interface AiConversationDetail {
  id: string;
  title: string;
  messages: { id: string; role: string; content: string; createdAt: string }[];
}

@Injectable({ providedIn: 'root' })
export class AiService {
  private readonly api = inject(ApiService);

  chat(companyId: string, message: string, conversationId?: string) {
    return this.api.post<{ reply: string; conversationId: string }>('/ai/chat', { companyId, message, conversationId });
  }

  summarizeProject(projectId: string) {
    return this.api.post<{ summary: string }>(`/ai/summarize/project/${projectId}`, {});
  }

  summarizeTask(taskId: string) {
    return this.api.post<{ summary: string }>(`/ai/summarize/task/${taskId}`, {});
  }

  actionPlan(projectId: string) {
    return this.api.post<{ plan: string }>(`/ai/action-plan/${projectId}`, {});
  }

  bottlenecks(companyId: string) {
    return this.api.get<{ analysis: string }>('/ai/bottlenecks', { companyId });
  }

  getConversations(companyId: string) {
    return this.api.get<AiConversationSummary[]>('/ai/conversations', { companyId });
  }

  getConversation(id: string) {
    return this.api.get<AiConversationDetail>(`/ai/conversations/${id}`);
  }

  strategicBrief(companyId: string) {
    return this.api.post<{
      generatedAt: string;
      summary: string;
      risks: string;
      opportunities: string;
      recommendations: string;
      teamHealth: string;
      metrics: Record<string, number>;
    }>('/ai/strategic-brief', { companyId });
  }
}
