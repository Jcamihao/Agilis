import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { UsersService } from '../../core/services/users.service';
import { User, UserRole } from '../../core/models/user.model';
import { materialImports } from '../../shared/material/material.imports';
import { SectionHeaderComponent } from '../../shared/components/section-header/section-header.component';

@Component({
  selector: 'agilis-users-page',
  standalone: true,
  imports: [...materialImports, SectionHeaderComponent],
  templateUrl: './users-page.component.html',
  styleUrl: './users-page.component.scss',
})
export class UsersPageComponent {
  private readonly usersService = inject(UsersService);
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly currentUser = this.authService.currentUser;
  protected readonly loading = signal(true);
  protected readonly submitting = signal(false);
  protected readonly users = signal<User[]>([]);
  protected readonly roleOptions = computed<UserRole[]>(() => {
    const role = this.currentUser()?.role;
    return role === 'MANAGER' ? ['USER'] : ['ADMIN', 'MANAGER', 'USER'];
  });

  protected readonly userForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    role: ['USER' as UserRole, [Validators.required]],
  });

  constructor() {
    this.loadUsers();
  }

  protected submitUser(): void {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.usersService
      .create(this.userForm.getRawValue())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (user) => {
          this.users.update((users) => [...users, user]);
          this.userForm.reset({
            name: '',
            email: '',
            password: '',
            role: 'USER',
          });
          this.notificationService.success('Usuário criado com sucesso.');
        },
        error: () => {
          this.submitting.set(false);
        },
        complete: () => {
          this.submitting.set(false);
        },
      });
  }

  protected updateRole(userId: string, role: UserRole): void {
    this.usersService
      .updateRole(userId, role)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updatedUser) => {
          this.users.update((users) =>
            users.map((user) => (user.id === updatedUser.id ? updatedUser : user)),
          );
          this.notificationService.success('Papel atualizado.');
        },
      });
  }

  protected isSelf(userId: string): boolean {
    return this.currentUser()?.id === userId;
  }

  protected trackUser(_: number, user: User): string {
    return user.id;
  }

  private loadUsers(): void {
    this.usersService
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (users) => {
          this.users.set(users);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
        },
      });
  }
}
