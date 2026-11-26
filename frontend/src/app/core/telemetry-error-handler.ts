import { ErrorHandler, Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

/**
 * Captura erros não tratados do front e reporta ao backend (POST /telemetry/client-error).
 * Regras: só reporta logado; mesma mensagem uma vez a cada 60s; máximo 5/min;
 * nunca reporta falha do próprio endpoint (anti-loop). Usa fetch — se o HttpClient
 * estiver quebrado, o reporter continua funcionando.
 */
@Injectable()
export class TelemetryErrorHandler implements ErrorHandler {
  private static readonly MAX_PER_MIN = 5;
  private static readonly DEDUPE_MS = 60_000;

  private recent = new Map<string, number>();
  private sentTimes: number[] = [];

  handleError(error: unknown): void {
    const message = this.extractMessage(error);
    console.error(error);
    try { this.send(message, error); } catch { /* reporter nunca pode quebrar o app */ }
  }

  private extractMessage(error: any): string {
    const msg =
      error?.message ??
      error?.statusText ??
      (typeof error === 'string' ? error : undefined) ??
      'erro desconhecido sem mensagem';
    // HttpErrorResponse tem status/url próprios — úteis no diagnóstico.
    const status = typeof error?.status === 'number' ? ` [HTTP ${error.status}]` : '';
    return String(msg).slice(0, 2000) + status;
  }

  private send(message: string, error: any): void {
    const token = localStorage.getItem('agilis_token');
    if (!token) return;

    const url: string = error?.url ?? location.href;
    if (url.includes('/telemetry/')) return;

    const now = Date.now();
    const last = this.recent.get(message);
    if (last && now - last < TelemetryErrorHandler.DEDUPE_MS) return;
    this.recent.set(message, now);

    this.sentTimes = this.sentTimes.filter((t) => now - t < 60_000);
    if (this.sentTimes.length >= TelemetryErrorHandler.MAX_PER_MIN) return;
    this.sentTimes.push(now);

    void fetch(`${environment.apiUrl}/telemetry/client-error`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        message,
        stack: String(error?.stack ?? error ?? '').slice(0, 8000),
        url,
      }),
      keepalive: true,
    }).catch(() => undefined);
  }
}
