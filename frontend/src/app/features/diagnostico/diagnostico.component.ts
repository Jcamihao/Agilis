import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TelemetryService, ErrorsView, UsageView } from '../../core/services/telemetry.service';
import { AuthService } from '../../core/services/auth.service';
import { timeAgo } from '../../core/utils/format';

/** Nomes estáveis dos eventos → rótulo em português. Desconhecidos caem no nome cru. */
const EVENT_LABEL: Record<string, string> = {
  'invite.created': 'Convite criado',
  'invite.accepted': 'Convite aceito',
  'onboarding.sample_created': 'Projeto de exemplo criado',
  'approval.requested': 'Aprovação pedida',
  'approval.decided': 'Aprovação decidida',
  'task_template.created': 'Template criado',
  'task_template.used': 'Template aplicado',
  'custom_field.created': 'Campo personalizado criado',
  'custom_field.used': 'Campo personalizado usado',
  'team.created': 'Equipe criada',
  'team.member_added': 'Membro adicionado à equipe',
};

@Component({
  selector: 'ag-diagnostico',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  templateUrl: './diagnostico.component.html',
})
export class DiagnosticoComponent implements OnInit {
  private readonly svc  = inject(TelemetryService);
  private readonly auth = inject(AuthService);

  readonly isAdmin = computed(() => {
    const role = this.auth.user()?.companies?.[0]?.role;
    return role === 'OWNER' || role === 'ADMIN';
  });

  days       = signal(7);
  loading    = signal(true);
  forbidden  = signal(false);
  errors     = signal<ErrorsView | null>(null);
  usage      = signal<UsageView | null>(null);

  eventLabel = (e: string) => EVENT_LABEL[e] ?? e;

  totalErros = computed(() => this.errors()?.groups.reduce((s, g) => s + g._count._all, 0) ?? 0);

  ngOnInit() {
    this.load();
  }

  changeDays() {
    this.load();
  }

  private load() {
    if (!this.isAdmin()) { this.loading.set(false); this.forbidden.set(true); return; }
    this.loading.set(true);
    this.forbidden.set(false);
    let pendentes = 2;
    const done = (forbid = false) => {
      if (forbid) this.forbidden.set(true);
      if (--pendentes === 0) this.loading.set(false);
    };

    this.svc.errors(this.days()).subscribe({
      next: (res: any) => { this.errors.set(res?.data ?? res); done(); },
      error: () => done(true),
    });
    this.svc.usage(Math.max(30, this.days())).subscribe({
      next: (res: any) => { this.usage.set(res?.data ?? res); done(); },
      error: () => done(),
    });
  }

  ago(iso: string) { return timeAgo(iso); }
}
