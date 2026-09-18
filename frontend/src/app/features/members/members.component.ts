import { Component, signal, inject, OnInit, ChangeDetectionStrategy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { MembersService, OrgMember } from '../../core/services/members.service';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ROLE_CFG: Record<string, { label: string; badgeClass: string }> = {
  OWNER:  { label: 'Proprietário', badgeClass: 'bg-amber-100 text-amber-700 border border-amber-200' },
  ADMIN:  { label: 'Admin',        badgeClass: 'bg-purple-100 text-purple-700 border border-purple-200' },
  MEMBER: { label: 'Membro',       badgeClass: 'bg-blue-100 text-blue-700 border border-blue-200' },
  VIEWER: { label: 'Visualizador', badgeClass: 'bg-slate-100 text-slate-600 border border-slate-200' },
};

@Component({
  selector: 'ag-members',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './members.component.html',
  styleUrls: ['./members.component.scss'],
})
export class MembersComponent implements OnInit {
  private readonly auth    = inject(AuthService);
  private readonly service = inject(MembersService);
  private readonly fb      = inject(FormBuilder);
  private readonly toast   = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  readonly currentUser = this.auth.user;
  readonly ROLE_CFG    = ROLE_CFG;

  // ── State ─────────────────────────────────────────────────────────────────
  loading      = signal(true);
  inviting     = signal(false);
  showInvite   = signal(false);
  members      = signal<OrgMember[]>([]);
  search       = signal('');
  openMenuId   = signal<string | null>(null);

  // ── Computed ──────────────────────────────────────────────────────────────
  filteredMembers = computed(() => {
    const q = this.search().toLowerCase().trim();
    if (!q) return this.members();
    return this.members().filter((m) =>
      m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)
    );
  });

  isAdmin = computed(() => {
    const uid = this.currentUser()?.id;
    const me = this.members().find((m) => m.id === uid);
    return me?.role === 'OWNER' || me?.role === 'ADMIN';
  });

  stats = computed(() => ({
    total:  this.members().length,
    owners: this.members().filter((m) => m.role === 'OWNER').length,
    admins: this.members().filter((m) => m.role === 'ADMIN').length,
    tasks:  this.members().reduce((s, m) => s + (m._count?.assignedTasks ?? 0), 0),
  }));

  roleOptions = [
    { key: 'ADMIN',  label: 'Admin' },
    { key: 'MEMBER', label: 'Membro' },
    { key: 'VIEWER', label: 'Visualizador' },
  ];

  // ── Form ──────────────────────────────────────────────────────────────────
  inviteForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    name:  [''],
    role:  ['MEMBER'],
  });

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  ngOnInit() {
    document.addEventListener('click', () => this.openMenuId.set(null));
    this.load();
  }

  load() {
    const cid = this.auth.currentCompanyId();
    if (!cid) { this.loading.set(false); return; }
    this.service.getAll(cid).subscribe({
      next: (data) => { this.members.set(data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  // ── Invite ────────────────────────────────────────────────────────────────
  invite() {
    if (this.inviteForm.invalid) return;
    const cid = this.auth.currentCompanyId();
    if (!cid) return;
    this.inviting.set(true);
    const { email, name, role } = this.inviteForm.value;
    this.service.invite(cid, email!, name ?? '', role!).subscribe({
      next: (data) => {
        this.members.set(data);
        this.inviteForm.reset({ role: 'MEMBER' });
        this.showInvite.set(false);
        this.inviting.set(false);
        this.toast.success(`${email} adicionado com sucesso!`);
      },
      error: (err) => {
        this.inviting.set(false);
        this.toast.error(err?.error?.message || 'Erro ao convidar usuário');
      },
    });
  }

  // ── Role change ───────────────────────────────────────────────────────────
  changeRole(member: OrgMember, role: string) {
    const cid = this.auth.currentCompanyId();
    if (!cid) return;
    this.openMenuId.set(null);
    this.service.updateRole(cid, member.id, role).subscribe({
      next: (data) => { this.members.set(data); this.toast.success('Papel atualizado'); },
      error: (err) => this.toast.error(err?.error?.message || 'Erro ao alterar papel'),
    });
  }

  // ── Remove ────────────────────────────────────────────────────────────────
  async remove(member: OrgMember) {
    const ok = await this.confirm.open({
      title: 'Remover membro',
      message: `Remover ${member.name} da organização?`,
      confirmLabel: 'Remover',
      danger: true,
    });
    if (!ok) return;
    const cid = this.auth.currentCompanyId();
    if (!cid) return;
    this.openMenuId.set(null);
    this.service.remove(cid, member.id).subscribe({
      next: (data) => { this.members.set(data); this.toast.success(`${member.name} removido`); },
      error: (err) => this.toast.error(err?.error?.message || 'Erro ao remover membro'),
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  toggleMenu(id: string, event: Event) {
    event.stopPropagation();
    this.openMenuId.set(this.openMenuId() === id ? null : id);
  }

  roleCfg(role: string) { return ROLE_CFG[role] ?? ROLE_CFG['MEMBER']; }

  isMe(member: OrgMember) { return member.id === this.currentUser()?.id; }
  isOwner(member: OrgMember) { return member.role === 'OWNER'; }

  joinedAgo(date: string): string {
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ptBR });
  }

}
