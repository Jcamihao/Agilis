import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';

export class SelahAiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly retryAfterSeconds?: number,
  ) {
    super(message);
  }
}

export interface SelahWorkspaceContext {
  totalTasks: number;
  overdueTasks: number;
  completedTasks: number;
  backlogCount: number;
  activeProjects: number;
  teamCount: number;
  topOverdueUsers: { name: string; count: number }[];
}

export interface SelahChatPayload {
  message: string;
  history: { role: 'user' | 'assistant'; content: string }[];
  workspace: SelahWorkspaceContext;
}

export interface SelahProjectSummaryPayload {
  projectName: string;
  totalTasks: number;
  doneTasks: number;
  overdueTasks: number;
  overdueTaskTitles: string[];
}

export interface SelahActionPlanPayload {
  projectName: string;
  tasks: { title: string; priority: string; assigneeName: string | null; dueDateLabel: string | null }[];
}

export interface SelahBottlenecksPayload {
  workspace: SelahWorkspaceContext;
  stagnantTasks: { title: string; status: string; projectName: string; assigneeName: string | null }[];
}

export interface SelahStrategicBriefPayload {
  metrics: {
    totalTasks: number;
    doneTasks: number;
    overdueTasks: number;
    backlogTasks: number;
    activeProjects: number;
    members: number;
    completionRate: number;
    weeklyVelocity: number;
  };
  insights: { severity: string; title: string; description: string }[];
}

export interface SelahActionPlan {
  immediatePriorities: string[];
  nextSteps: string[];
  risks: string[];
  recommendations: string[];
}

export interface SelahBottleneckAnalysis {
  overview: string;
  bottlenecks: { title: string; cause: string; correctiveAction: string }[];
}

export interface SelahWorkloadMember {
  name: string;
  openTasks: number;
  overdueTasks: number;
  capacityScore: number;
}

export interface SelahRedistributionPayload {
  overloaded: SelahWorkloadMember[];
  available: SelahWorkloadMember[];
}

export interface SelahRedistribution {
  overview: string;
  moves: { from: string; to: string; tasksToMove: number; reason: string }[];
}

export interface SelahStrategicBrief {
  summary: string;
  risks: string[];
  opportunities: string[];
  recommendations: string[];
}

const BASE = '/v1/adapters/agilis/workspace';

@Injectable()
export class SelahAiClientService {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly sourceApp: string;
  private readonly timeoutMs: number;

  constructor(config: ConfigService) {
    this.baseUrl = String(config.get<string>('SELAH_IA_BASE_URL') ?? '').trim().replace(/\/+$/, '');
    this.apiKey = String(config.get<string>('SELAH_IA_API_KEY') ?? '').trim();
    this.sourceApp = String(config.get<string>('SELAH_IA_SOURCE_APP') ?? 'AgilisBack').trim();
    this.timeoutMs = Math.max(4000, Number(config.get<string>('SELAH_IA_TIMEOUT_MS') ?? 30000));
  }

  async chat(payload: SelahChatPayload) {
    return (await this.post<{ answer: string }>('chat', payload)).answer;
  }

  async summarizeProject(payload: SelahProjectSummaryPayload) {
    return (await this.post<{ summary: string }>('project-summary', payload)).summary;
  }

  async actionPlan(payload: SelahActionPlanPayload) {
    return (await this.post<{ plan: SelahActionPlan }>('action-plan', payload)).plan;
  }

  async bottlenecks(payload: SelahBottlenecksPayload) {
    return (await this.post<{ analysis: SelahBottleneckAnalysis }>('bottlenecks', payload)).analysis;
  }

  async workloadRedistribution(payload: SelahRedistributionPayload) {
    return (await this.post<{ redistribution: SelahRedistribution }>('workload-redistribution', payload)).redistribution;
  }

  async strategicBrief(payload: SelahStrategicBriefPayload) {
    return (await this.post<{ brief: SelahStrategicBrief }>('strategic-brief', payload)).brief;
  }

  private async post<T>(route: string, payload: unknown): Promise<T> {
    if (!this.baseUrl || !this.apiKey) {
      throw new SelahAiError('Selah IA não configurado: defina SELAH_IA_BASE_URL e SELAH_IA_API_KEY.', 0);
    }

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${BASE}/${route}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Selah-Api-Key': this.apiKey,
          'X-Source-App': this.sourceApp,
          'X-Request-Id': randomUUID(),
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error: any) {
      throw new SelahAiError(String(error?.message || 'Falha ao comunicar com o Selah IA.'), 0);
    }

    const body: any = await response.json().catch(() => null);
    if (response.ok) return body as T;

    const retryAfter = Number(body?.retryAfterSeconds ?? response.headers.get('retry-after'));
    throw new SelahAiError(
      String(body?.message || response.statusText || 'Falha ao comunicar com o Selah IA.'),
      response.status,
      Number.isFinite(retryAfter) && retryAfter > 0 ? Math.ceil(retryAfter) : undefined,
    );
  }
}
