import { Component, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { switchMap } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { InvitesService } from '../../../core/services/invites.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'ag-login',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly invites = inject(InvitesService);
  private readonly toast = inject(ToastService);

  // Token de convite (?convite=), mantido ao alternar entre login e cadastro.
  readonly convite = this.route.snapshot.queryParamMap.get('convite');

  loading = signal(false);
  error = signal('');
  showPassword = signal(false);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  togglePassword() { this.showPassword.update((v) => !v); }

  onSubmit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    this.loading.set(true);
    this.error.set('');

    const { email, password } = this.form.value;

    const convite = this.convite;
    this.auth.login(email!, password!).subscribe({
      next: () => {
        if (!convite) { this.router.navigate(['/dashboard']); return; }
        // Convite pendente: aceita e atualiza a sessão. Falha não bloqueia o login.
        this.invites.accept(convite).pipe(
          switchMap((res) => this.auth.refreshCompanies(res.companyId)),
        ).subscribe({
          next: () => this.router.navigate(['/dashboard']),
          error: (err) => {
            this.toast.error(err?.error?.message || 'Não foi possível aceitar o convite');
            this.router.navigate(['/dashboard']);
          },
        });
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'Erro ao fazer login');
        this.loading.set(false);
      },
    });
  }
}
