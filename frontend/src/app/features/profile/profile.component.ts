import { Component, signal, inject, OnInit, ChangeDetectionStrategy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';
import { NotificationsService } from '../../core/services/notifications.service';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { User, Notification, NOTIFICATION_CONFIG } from '../../core/models';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

@Component({
  selector: 'ag-profile',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
})
export class ProfileComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);
  private readonly notifService = inject(NotificationsService);
  private readonly fb = inject(FormBuilder);
  private readonly toastSvc = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  readonly toast = signal('');
  private showToast(msg: string) {
    this.toast.set(msg);
    setTimeout(() => this.toast.set(''), 2500);
  }

  // ── State ──────────────────────────────────────────────────────────────────
  saving = signal(false);
  savingPersonal = signal(false);
  savingPassword = signal(false);
  savingTelegram = signal(false);
  detectingChatId = signal(false);
  uploadingAvatar = signal(false);
  lookingUpCep = signal(false);
  cepError = signal('');
  passwordError = signal('');
  avatarPreview = signal<string | null>(null);
  telegramUpdates = signal<{ chatId: string; name: string; username?: string }[]>([]);

  // ── User ───────────────────────────────────────────────────────────────────
  user = this.auth.user;

  // ── Notifications ──────────────────────────────────────────────────────────
  notifications = signal<Notification[]>([]);
  notifLoading = signal(true);
  unreadCount = computed(() => this.notifications().filter((n) => !n.isRead).length);

  // ── Forms ──────────────────────────────────────────────────────────────────
  profileForm = this.fb.group({
    firstName: ['', [Validators.required, Validators.minLength(2)]],
    lastName:  [''],
    avatarUrl: [''],
  });

  personalForm = this.fb.group({
    phone:             [''],
    cpfCnpj:          [''],
    cep:              [''],
    uf:               [''],
    address:          [''],
    addressNumber:    [''],
    addressComplement:[''],
  });

  telegramForm = this.fb.group({
    telegramChatId: [''],
  });

  passwordForm = this.fb.group({
    currentPassword: ['', Validators.required],
    newPassword:     ['', [Validators.required, Validators.minLength(8)]],
  });

  // ── Password requirements ──────────────────────────────────────────────────
  pwdReqs = computed(() => {
    const pwd = this.passwordForm.get('newPassword')?.value ?? '';
    return {
      length:  pwd.length >= 8,
      number:  /\d/.test(pwd),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(pwd),
    };
  });

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  ngOnInit() {
    const u = this.user();
    if (u) {
      const parts = u.name.split(' ');
      this.profileForm.patchValue({
        firstName: parts[0] ?? '',
        lastName:  parts.slice(1).join(' '),
        avatarUrl: u.avatarUrl ?? '',
      });
      this.personalForm.patchValue({
        phone:             this.phoneToDisplay(u.phone ?? ''),
        cpfCnpj:          u.cpfCnpj           ?? '',
        cep:              u.cep               ?? '',
        uf:               u.uf                ?? '',
        address:          u.address           ?? '',
        addressNumber:    u.addressNumber     ?? '',
        addressComplement:u.addressComplement ?? '',
      });
      this.telegramForm.patchValue({ telegramChatId: u.telegramChatId ?? '' });
    }
    this.loadNotifications();
  }

  // ── Profile ────────────────────────────────────────────────────────────────
  saveProfile() {
    if (this.profileForm.invalid) return;
    this.saving.set(true);
    const { firstName, lastName, avatarUrl } = this.profileForm.value;
    const name = [firstName, lastName].filter(Boolean).join(' ');

    this.api.put<User>('/users/profile', { name, avatarUrl }).subscribe({
      next: (updated) => {
        this.auth.updateUser(updated);
        this.profileForm.markAsPristine();
        this.saving.set(false);
        this.showToast('Perfil atualizado com sucesso!');
      },
      error: () => this.saving.set(false),
    });
  }

  savePersonal() {
    this.savingPersonal.set(true);
    const v = this.personalForm.value;
    const rawPhone = (v.phone ?? '').replace(/\D/g, '');
    const phone = rawPhone ? (rawPhone.startsWith('55') && rawPhone.length >= 12 ? rawPhone : '55' + rawPhone) : '';
    this.api.put<User>('/users/profile', {
      phone,
      cpfCnpj:          v.cpfCnpj            ?? '',
      cep:              v.cep                ?? '',
      uf:               v.uf                 ?? '',
      address:          v.address            ?? '',
      addressNumber:    v.addressNumber      ?? '',
      addressComplement:v.addressComplement  ?? '',
    }).subscribe({
      next: (updated) => {
        this.auth.updateUser(updated);
        this.personalForm.markAsPristine();
        this.savingPersonal.set(false);
        this.showToast('Dados pessoais salvos!');
      },
      error: () => this.savingPersonal.set(false),
    });
  }

  onCepInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').slice(0, 8);
    input.value = digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
    this.personalForm.get('cep')?.setValue(input.value, { emitEvent: false });

    if (digits.length === 8) {
      this.lookingUpCep.set(true);
      this.cepError.set('');
      fetch(`https://viacep.com.br/ws/${digits}/json/`)
        .then((r) => r.json())
        .then((data) => {
          if (data.erro) { this.cepError.set('CEP não encontrado.'); }
          else {
            this.personalForm.patchValue({ uf: data.uf ?? '', address: data.logradouro ?? '' });
          }
        })
        .catch(() => this.cepError.set('Erro ao consultar CEP.'))
        .finally(() => this.lookingUpCep.set(false));
    }
  }

  onPhoneInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const d = input.value.replace(/\D/g, '').slice(0, 11);
    if (d.length <= 10) input.value = d.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '');
    else input.value = d.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '');
    this.personalForm.get('phone')?.setValue(input.value, { emitEvent: false });
  }

  private phoneToDisplay(stored: string): string {
    const digits = stored.replace(/\D/g, '');
    if (!digits) return '';
    const national = digits.startsWith('55') && digits.length >= 12 ? digits.slice(2) : digits;
    if (national.length <= 10) return national.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '');
    return national.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '');
  }

  onCpfCnpjInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const d = input.value.replace(/\D/g, '');
    if (d.length <= 11) {
      input.value = d.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, '$1.$2.$3-$4').replace(/-$/, '').slice(0, 14);
    } else {
      input.value = d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/, '$1.$2.$3/$4-$5').replace(/-$/, '').slice(0, 18);
    }
    this.personalForm.get('cpfCnpj')?.setValue(input.value, { emitEvent: false });
  }

  onAvatarChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      this.avatarPreview.set(base64);
      this.uploadingAvatar.set(true);
      this.api.put<User>('/users/profile', { avatarUrl: base64 }).subscribe({
        next: (updated) => {
          this.auth.updateUser(updated);
          this.profileForm.patchValue({ avatarUrl: base64 });
          this.uploadingAvatar.set(false);
          this.showToast('Foto atualizada!');
        },
        error: () => { this.avatarPreview.set(null); this.uploadingAvatar.set(false); },
      });
    };
    reader.readAsDataURL(file);
  }

  // ── Password ───────────────────────────────────────────────────────────────
  changePassword() {
    this.passwordError.set('');
    if (this.passwordForm.invalid) return;
    this.savingPassword.set(true);
    const { currentPassword, newPassword } = this.passwordForm.value;
    this.api.put('/users/profile', { currentPassword, newPassword }).subscribe({
      next: () => {
        this.passwordForm.reset();
        this.savingPassword.set(false);
        this.showToast('Senha alterada com sucesso!');
      },
      error: (err) => {
        this.passwordError.set(err?.error?.message || 'Erro ao alterar senha');
        this.savingPassword.set(false);
      },
    });
  }

  // ── Telegram ───────────────────────────────────────────────────────────────
  saveTelegram() {
    this.savingTelegram.set(true);
    const { telegramChatId } = this.telegramForm.value;
    this.api.put<User>('/users/profile', { telegramChatId: telegramChatId ?? '' }).subscribe({
      next: (updated) => {
        this.auth.updateUser(updated);
        this.savingTelegram.set(false);
        this.telegramForm.markAsPristine();
        this.showToast('Chat ID do Telegram salvo!');
      },
      error: () => this.savingTelegram.set(false),
    });
  }

  detectChatId() {
    this.detectingChatId.set(true);
    this.api.get<{ chatId: string; name: string; username?: string }[]>('/telegram/updates').subscribe({
      next: (updates) => {
        this.telegramUpdates.set(updates);
        this.detectingChatId.set(false);
        if (updates.length === 0) this.showToast('Nenhuma interação encontrada. Envie uma mensagem ao bot primeiro.');
      },
      error: () => { this.detectingChatId.set(false); this.showToast('Erro ao buscar atualizações do Telegram.'); },
    });
  }

  selectChatId(chatId: string) {
    this.telegramForm.patchValue({ telegramChatId: chatId });
    this.telegramForm.markAsDirty();
    this.telegramUpdates.set([]);
  }

  async deleteAccount() {
    const ok = await this.confirm.open({
      title: 'Excluir conta',
      message: 'Esta ação é irreversível. Todos os seus dados pessoais serão removidos permanentemente.',
      confirmLabel: 'Excluir minha conta',
      danger: true,
    });
    if (ok) this.auth.logout();
  }

  // ── Notifications ──────────────────────────────────────────────────────────
  loadNotifications() {
    this.notifService.getAll(1, 10).subscribe({
      next: (data) => {
        this.notifications.set(data.items);
        this.notifLoading.set(false);
      },
      error: () => this.notifLoading.set(false),
    });
  }

  markRead(notif: Notification) {
    if (notif.isRead) return;
    this.notifService.markAsRead(notif.id).subscribe(() => {
      this.notifications.update((list) => list.map((n) => n.id === notif.id ? { ...n, isRead: true } : n));
      this.notifService.unreadCount.update((c) => Math.max(0, c - 1));
    });
  }

  markAllRead() {
    this.notifService.markAllAsRead().subscribe(() => {
      this.notifications.update((list) => list.map((n) => ({ ...n, isRead: true })));
      this.notifService.unreadCount.set(0);
    });
  }

  clearNotifications() {
    this.notifService.deleteOld().subscribe(() => {
      this.notifications.set([]);
      this.loadNotifications();
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  getNotifIcon(type: string): string {
    return NOTIFICATION_CONFIG[type as keyof typeof NOTIFICATION_CONFIG]?.icon ?? 'notifications';
  }
  getNotifColor(type: string): string {
    return NOTIFICATION_CONFIG[type as keyof typeof NOTIFICATION_CONFIG]?.color ?? '#6366f1';
  }
  timeAgo(date: string): string {
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ptBR });
  }

}
