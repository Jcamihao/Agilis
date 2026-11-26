import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';

export interface ErrorGroup {
  message: string;
  source: 'SERVER' | 'CLIENT';
  _count: { _all: number };
  _max: { createdAt: string };
}

export interface ErrorDetail {
  id: string;
  source: 'SERVER' | 'CLIENT';
  message: string;
  path: string | null;
  createdAt: string;
}

export interface ErrorsView {
  groups: ErrorGroup[];
  recent: ErrorDetail[];
}

export interface EventRow {
  event: string;
  _count: { _all: number };
  _max: { createdAt: string };
}

export interface AiRow {
  feature: string;
  _count: { _all: number };
  _sum: { requestChars: number | null };
}

export interface UsageView {
  events: EventRow[];
  ai: AiRow[];
}

@Injectable({ providedIn: 'root' })
export class TelemetryService {
  private readonly api = inject(ApiService);

  /** Reporta um evento de produto vindo do front (allowlist do backend). Fire-and-forget. */
  track(event: string) {
    this.api.post<void>('/telemetry/event', { event }).subscribe({ error: () => undefined });
  }

  errors(days: number) {
    return this.api.get<ErrorsView>('/telemetry/errors', { days: String(days) });
  }

  usage(days: number) {
    return this.api.get<UsageView>('/telemetry/usage', { days: String(days) });
  }
}
