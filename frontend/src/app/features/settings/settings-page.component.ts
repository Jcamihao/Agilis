import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, Validators } from '@angular/forms';
import { SettingsAppearance } from '../../core/models/settings.model';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { SettingsService } from '../../core/services/settings.service';
import { materialImports } from '../../shared/material/material.imports';

type SettingsTab = 'profile' | 'password' | 'preferences' | 'notifications';

@Component({
  selector: 'agilis-settings-page',
  standalone: true,
  imports: [...materialImports],
  templateUrl: './settings-page.component.html',
  styleUrl: './settings-page.component.scss',
})
export class SettingsPageComponent {
  private readonly authService = inject(AuthService);
  private readonly settingsService = inject(SettingsService);
  private readonly notificationService = inject(NotificationService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly currentUser = this.authService.currentUser;
  protected readonly loading = signal(true);
  protected readonly submitting = signal(false);
  protected readonly activeTab = signal<SettingsTab>('profile');
  protected readonly appearanceMode = signal<SettingsAppearance>('dark');

  protected readonly profileForm = this.formBuilder.nonNullable.group({
    name: [this.currentUser()?.name ?? 'Alexander Mitchell', [Validators.required]],
    email: [this.currentUser()?.email ?? 'alex.m@agilis.io', [Validators.required, Validators.email]],
    role: [this.currentUser()?.role ?? 'Product Architect', [Validators.required]],
    timezone: ['America/Sao_Paulo', [Validators.required]],
    density: ['Comfortable'],
    autosave: [false],
    twoFactor: [true],
  });

  constructor() {
    this.loadSettings();
  }

  protected saveChanges(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    const value = this.profileForm.getRawValue();
    this.submitting.set(true);
    this.settingsService
      .updateMine({
        name: value.name,
        email: value.email,
        timezone: value.timezone,
        density: value.density === 'Compact' ? 'Compact' : 'Comfortable',
        appearance: this.appearanceMode(),
        autosave: value.autosave,
        twoFactor: value.twoFactor,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.authService.applyCurrentUser(response.user);
          this.patchForm(response);
          this.notificationService.success('Preferências salvas.');
        },
        error: () => {
          this.submitting.set(false);
        },
        complete: () => {
          this.submitting.set(false);
        },
      });
  }

  protected discardChanges(): void {
    this.profileForm.reset({
      name: this.currentUser()?.name ?? 'Alexander Mitchell',
      email: this.currentUser()?.email ?? 'alex.m@agilis.io',
      role: this.currentUser()?.role ?? 'Product Architect',
      timezone: 'America/Sao_Paulo',
      density: 'Comfortable',
      autosave: false,
      twoFactor: true,
    });
    this.appearanceMode.set('dark');
    this.activeTab.set('profile');
    this.notificationService.success('Alterações descartadas.');
  }

  protected setActiveTab(tab: SettingsTab): void {
    this.activeTab.set(tab);
  }

  protected editPhoto(): void {
    this.notificationService.success('Upload de foto preparado para a próxima integração de perfil.');
  }

  protected updatePassword(): void {
    this.activeTab.set('password');
    this.notificationService.success('Fluxo de troca de senha selecionado.');
  }

  protected setAppearance(mode: SettingsAppearance): void {
    this.appearanceMode.set(mode);
    this.notificationService.success(
      mode === 'dark' ? 'Dark Mode aplicado.' : 'Light Mode selecionado para pré-visualização.',
    );
  }

  protected manageIntegration(name: string): void {
    this.activeTab.set('notifications');
    this.notificationService.success(`${name}: gerenciamento de integração selecionado.`);
  }

  private loadSettings(): void {
    this.settingsService
      .getMine()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.authService.applyCurrentUser(response.user);
          this.patchForm(response);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
        },
      });
  }

  private patchForm(response: {
    user: { name: string; email: string; role: string };
    settings: {
      timezone: string;
      density: string;
      appearance: SettingsAppearance;
      autosave: boolean;
      twoFactor: boolean;
    };
  }): void {
    this.profileForm.patchValue({
      name: response.user.name,
      email: response.user.email,
      role: response.user.role,
      timezone: response.settings.timezone,
      density: response.settings.density,
      autosave: response.settings.autosave,
      twoFactor: response.settings.twoFactor,
    });
    this.appearanceMode.set(response.settings.appearance);
  }
}
