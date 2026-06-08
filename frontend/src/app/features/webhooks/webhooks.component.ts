import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { WebhookService, Webhook, WebhookDelivery, WEBHOOK_EVENTS } from '../../core/services/webhook.service';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

@Component({
  selector: 'ag-webhooks',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  templateUrl: './webhooks.component.html',
})
export class WebhooksComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly service = inject(WebhookService);
  private readonly toast   = inject(ToastService);

  readonly EVENTS = WEBHOOK_EVENTS;

  // ── State ──────────────────────────────────────────────────────────────────
  loading = signal(true);
  webhooks = signal<Webhook[]>([]);

  // ── Create / Edit modal ────────────────────────────────────────────────────
  showModal = signal(false);
  saving = signal(false);
  editingId = signal<string | null>(null);
  form = { name: '', url: '', events: [] as string[] };

  // ── Deliveries panel ───────────────────────────────────────────────────────
  selectedWebhook = signal<Webhook | null>(null);
  deliveries = signal<WebhookDelivery[]>([]);
  deliveriesLoading = signal(false);

  // ── Secret panel ──────────────────────────────────────────────────────────
  visibleSecrets = signal<Set<string>>(new Set());
  webhookSecrets = signal<Map<string, string>>(new Map());

  // ── Test results ──────────────────────────────────────────────────────────
  testingId = signal<string | null>(null);

  ngOnInit() { this.load(); }

  private load() {
    const companyId = this.companyId();
    if (!companyId) return;
    this.service.list(companyId).subscribe({
      next: (data) => { this.webhooks.set(data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  // ── Modal ──────────────────────────────────────────────────────────────────
  openCreate() {
    this.editingId.set(null);
    this.form = { name: '', url: '', events: [] };
    this.showModal.set(true);
  }

  openEdit(w: Webhook) {
    this.editingId.set(w.id);
    this.form = { name: w.name, url: w.url, events: [...w.events] };
    this.showModal.set(true);
  }

  toggleEvent(value: string) {
    const idx = this.form.events.indexOf(value);
    if (idx === -1) this.form.events = [...this.form.events, value];
    else this.form.events = this.form.events.filter((e) => e !== value);
  }

  isEventSelected(value: string): boolean {
    return this.form.events.includes(value);
  }

  save() {
    if (!this.form.name || !this.form.url || this.form.events.length === 0) return;
    this.saving.set(true);

    const companyId = this.companyId()!;
    const req = this.editingId()
      ? this.service.update(this.editingId()!, { name: this.form.name, url: this.form.url, events: this.form.events })
      : this.service.create({ companyId, name: this.form.name, url: this.form.url, events: this.form.events });

    req.subscribe({
      next: (w) => {
        if (this.editingId()) {
          this.webhooks.update((list) => list.map((x) => x.id === w.id ? w : x));
        } else {
          this.webhooks.update((list) => [w, ...list]);
        }
        this.showModal.set(false);
        this.saving.set(false);
        this.toast.success(this.editingId() ? 'Webhook atualizado!' : 'Webhook criado!');
      },
      error: () => { this.saving.set(false); this.toast.error('Erro ao salvar webhook.'); },
    });
  }

  // ── Toggle ─────────────────────────────────────────────────────────────────
  toggle(w: Webhook) {
    this.service.update(w.id, { isActive: !w.isActive }).subscribe({
      next: (updated) => this.webhooks.update((list) => list.map((x) => x.id === updated.id ? updated : x)),
      error: () => this.toast.error('Erro ao alterar status.'),
    });
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  delete(w: Webhook) {
    this.service.delete(w.id).subscribe({
      next: () => { this.webhooks.update((list) => list.filter((x) => x.id !== w.id)); this.toast.success('Webhook removido.'); },
      error: () => this.toast.error('Erro ao remover.'),
    });
  }

  // ── Test ───────────────────────────────────────────────────────────────────
  test(w: Webhook) {
    this.testingId.set(w.id);
    this.service.test(w.id).subscribe({
      next: (res) => {
        this.testingId.set(null);
        if (res.success) this.toast.success(`Teste enviado! Status: ${res.statusCode}`);
        else this.toast.error(`Falha no teste: ${res.error ?? 'erro desconhecido'}`);
      },
      error: () => { this.testingId.set(null); this.toast.error('Erro ao testar webhook.'); },
    });
  }

  // ── Deliveries ─────────────────────────────────────────────────────────────
  viewDeliveries(w: Webhook) {
    this.selectedWebhook.set(w);
    this.deliveriesLoading.set(true);
    this.service.getDeliveries(w.id).subscribe({
      next: (data) => { this.deliveries.set(data); this.deliveriesLoading.set(false); },
      error: () => this.deliveriesLoading.set(false),
    });
  }

  // ── Secret ─────────────────────────────────────────────────────────────────
  toggleSecret(w: Webhook) {
    const set = new Set(this.visibleSecrets());
    if (set.has(w.id)) { set.delete(w.id); }
    else {
      set.add(w.id);
      if (!this.webhookSecrets().has(w.id)) {
        const map = new Map(this.webhookSecrets());
        map.set(w.id, w.secret);
        this.webhookSecrets.set(map);
      }
    }
    this.visibleSecrets.set(set);
  }

  isSecretVisible(id: string): boolean { return this.visibleSecrets().has(id); }

  getSecret(w: Webhook): string {
    return this.isSecretVisible(w.id) ? (this.webhookSecrets().get(w.id) ?? w.secret) : '••••••••••••••••••••••••';
  }

  regenerateSecret(w: Webhook) {
    this.service.regenerateSecret(w.id).subscribe({
      next: (updated) => {
        this.webhooks.update((list) => list.map((x) => x.id === updated.id ? updated : x));
        const map = new Map(this.webhookSecrets());
        map.set(updated.id, updated.secret);
        this.webhookSecrets.set(map);
        this.toast.success('Secret regenerado! Atualize no N8N.');
      },
      error: () => this.toast.error('Erro ao regenerar secret.'),
    });
  }

  copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => this.toast.success('Copiado!'));
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  timeAgo(dateStr: string) {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: ptBR });
  }

  eventLabel(value: string): string {
    return WEBHOOK_EVENTS.find((e) => e.value === value)?.label ?? value;
  }

  private companyId() { return this.auth.currentCompanyId(); }
}
