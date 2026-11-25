import { Component, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { apiErrorMessage } from '../../../core/utils/api-error';

export function MatchPasswords(group: AbstractControl): null | ValidationErrors {
  const pw = group.get('password')?.value;
  const cf = group.get('confirm')?.value;
  return pw && cf && pw !== cf ? { passwordsMismatch: true } : null;
}

@Component({
  selector: 'ag-reset-password',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './reset-password.component.html',
  styleUrls: ['../login/login.component.scss'],
})
export class ResetPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

  readonly token = this.route.snapshot.paramMap.get('token') ?? '';

  readonly form = this.fb.nonNullable.group({
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirm:  ['', Validators.required],
  }, { validators: [MatchPasswords] });

  showPassword = signal(false);
  loading = signal(false);
  done = signal(false);
  error = signal('');

  togglePassword() { this.showPassword.update(v => !v); }

  onSubmit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading.set(true);
    this.error.set('');
    this.auth.resetPassword(this.token, this.form.getRawValue().password).subscribe({
      next: () => { this.done.set(true); this.loading.set(false); },
      error: (err) => {
        this.loading.set(false);
        this.error.set(apiErrorMessage(err, 'Link inválido ou expirado. Solicite um novo.'));
      },
    });
  }
}
