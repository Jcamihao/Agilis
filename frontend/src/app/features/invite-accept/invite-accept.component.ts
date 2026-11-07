import { Component, signal, inject, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { switchMap } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { InvitesService } from '../../core/services/invites.service';
import { ToastService } from '../../core/services/toast.service';
import { InvitePreview } from '../../core/models';

const INVALID_MSG = 'Este convite expirou ou foi revogado. Peça um novo link.';

@Component({
  selector: 'ag-invite-accept',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink],
  templateUrl: './invite-accept.component.html',
})
export class InviteAcceptComponent implements OnInit {
  private readonly route   = inject(ActivatedRoute);
  private readonly router  = inject(Router);
  private readonly auth    = inject(AuthService);
  private readonly invites = inject(InvitesService);
  private readonly toast   = inject(ToastService);

  readonly isLogged = this.auth.isAuthenticated;
  readonly token = this.route.snapshot.paramMap.get('token') ?? '';

  loading   = signal(true);
  invalid   = signal('');
  preview   = signal<InvitePreview | null>(null);
  accepting = signal(false);

  ngOnInit() {
    if (!this.token) {
      this.invalid.set(INVALID_MSG);
      this.loading.set(false);
      return;
    }
    this.invites.preview(this.token).subscribe({
      next: (data) => { this.preview.set(data); this.loading.set(false); },
      error: (err) => {
        this.invalid.set(this.previewErrorMessage(err));
        this.loading.set(false);
      },
    });
  }

  accept() {
    if (this.accepting()) return;
    this.accepting.set(true);
    this.invites.accept(this.token).pipe(
      switchMap((res) => this.auth.refreshCompanies(res.companyId)),
    ).subscribe({
      next: () => {
        this.toast.success(`Você entrou em ${this.preview()?.companyName ?? 'a equipe'}`);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.accepting.set(false);
        this.toast.error(this.acceptErrorMessage(err));
      },
    });
  }

  private previewErrorMessage(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 404) return INVALID_MSG;
      if (err.status === 429) return 'Muitas tentativas. Aguarde um minuto e recarregue a página.';
      if (err.status === 0) return 'Sem conexão com o servidor. Verifique sua internet e recarregue a página.';
    }
    return 'Não foi possível carregar o convite. Tente recarregar a página.';
  }

  private acceptErrorMessage(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 404) return INVALID_MSG;
      if (err.status === 429) return 'Muitas tentativas. Aguarde um minuto e tente de novo.';
      if (err.status === 0) return 'Sem conexão com o servidor. Tente de novo.';
      if (err.error?.message) return err.error.message;
    }
    return 'Não foi possível entrar na equipe. Tente de novo.';
  }
}
