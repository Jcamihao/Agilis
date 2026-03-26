import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { materialImports } from '../../shared/material/material.imports';

@Component({
  selector: 'agilis-login-page',
  standalone: true,
  imports: [...materialImports],
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.scss',
})
export class LoginPageComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly brand = environment.brand;
  protected readonly loginLoading = signal(false);
  protected readonly registerLoading = signal(false);

  protected readonly loginForm = this.formBuilder.nonNullable.group({
    email: ['admin@agilis.local', [Validators.required, Validators.email]],
    password: ['Agilis@123', [Validators.required, Validators.minLength(8)]],
  });

  protected readonly registerForm = this.formBuilder.nonNullable.group({
    organizationName: ['', [Validators.required, Validators.minLength(2)]],
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  protected submitLogin(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.loginLoading.set(true);
    this.authService
      .login(this.loginForm.getRawValue())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notificationService.success('Acesso liberado. Bem-vindo ao Agilis.');
          void this.router.navigate(['/app/tasks']);
        },
        error: () => {
          this.loginLoading.set(false);
        },
        complete: () => {
          this.loginLoading.set(false);
        },
      });
  }

  protected submitRegister(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.registerLoading.set(true);
    this.authService
      .register(this.registerForm.getRawValue())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notificationService.success('Espaco criado com sucesso.');
          void this.router.navigate(['/app/tasks']);
        },
        error: () => {
          this.registerLoading.set(false);
        },
        complete: () => {
          this.registerLoading.set(false);
        },
      });
  }
}
