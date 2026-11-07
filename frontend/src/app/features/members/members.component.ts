import { Component, signal, inject, OnInit, ChangeDetectionStrategy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { MembersService, OrgMember } from '../../core/services/members.service';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { InvitesService, InviteValidityDays } from '../../core/services/invites.service';
import { CompanyInvite } from '../../core/models';
import { timeAgo, formatDateTime } from '../../core/utils/format';

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
  templateUrl: './members.component.html'
})
export class MembersComponent implements OnInit {
  private readonly auth    = inject(AuthService);
  private readonly service = inject(MembersService);
  private readonly fb      = inject(FormBuilder);
  private readonly toast   = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly invitesService = inject(InvitesService);

  readonly formatDateTime = formatDateTime;
  readonly canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  readonly currentUser = this.auth.user;
  readonly ROLE_CFG    = ROLE_CFG;

  // ── State ─────────────────────────────────────────────────────────────────
  loading      = signal(true);
  inviting     = signal(false);
  showInvite   = signal(false);
  members      = signal<OrgMember[]>([]);
  search       = signal('');
  openMenuId   = signal<string | null>(null);

  // ── Convite por link ──────────────────────────────────────────────────────
  inviteTab      = signal<'link' | 'email'>('link');
  linkValidity   = signal<InviteValidityDays>(7);
  linkGenerating = signal(false);
  // Link e QR existem só na memória deste componente; somem ao fechar o modal.
  generatedLink  = signal<{ url: string; expiresAt: string; qrDataUrl: string } | null>(null);
  activeInvites  = signal<CompanyInvite[]>([]);
  loadingInvites = signal(false);

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

  // ── Modal de convite ──────────────────────────────────────────────────────
  openInvite() {
    this.inviteTab.set(this.isAdmin() ? 'link' : 'email');
    this.generatedLink.set(null);
    this.showInvite.set(true);
    if (this.isAdmin()) this.loadInvites();
  }

  closeInvite() {
    this.showInvite.set(false);
    this.generatedLink.set(null);
  }

  setValidity(value: string) {
    this.linkValidity.set(value === '1' ? 1 : value === '30' ? 30 : 7);
  }

  setTab(tab: 'link' | 'email') {
    this.inviteTab.set(tab);
    if (tab === 'link') this.loadInvites();
  }

  loadInvites() {
    const cid = this.auth.currentCompanyId();
    if (!cid) return;
    this.loadingInvites.set(true);
    this.invitesService.list(cid).subscribe({
      next: (data) => { this.activeInvites.set(data); this.loadingInvites.set(false); },
      error: (err) => {
        this.loadingInvites.set(false);
        this.toast.error(err?.error?.message || 'Erro ao carregar links de convite');
      },
    });
  }

  async generateLink() {
    const cid = this.auth.currentCompanyId();
    if (!cid || this.linkGenerating()) return;
    this.linkGenerating.set(true);
    this.invitesService.create(cid, this.linkValidity()).subscribe({
      next: async (res) => {
        // Modal fechado durante a requisição: descarta o link (não fica em memória).
        if (!this.showInvite()) { this.linkGenerating.set(false); return; }
        const url = `${location.origin}/convite/${res.token}`;
        let qrDataUrl = '';
        try {
          // Import dinâmico: a lib só entra no bundle quando o admin gera um link.
          // qrcode é CommonJS: no bundle de produção os nomes saem em `default`.
          const mod = await import('qrcode');
          const qr = typeof mod.toDataURL === 'function' ? mod : (mod as unknown as { default: typeof mod }).default;
          qrDataUrl = await qr.toDataURL(url, {
            width: 220,
            margin: 2,
            errorCorrectionLevel: 'M',
            color: { dark: '#000000', light: '#FFFFFF' },
          });
        } catch {
          this.toast.error('Não foi possível gerar o QR code. Use o link.');
        }
        this.linkGenerating.set(false);
        if (!this.showInvite()) return;
        this.generatedLink.set({ url, expiresAt: res.expiresAt, qrDataUrl });
        this.loadInvites();
      },
      error: (err) => {
        this.linkGenerating.set(false);
        this.toast.error(err?.error?.message || 'Erro ao gerar link de convite');
      },
    });
  }

  async copyLink() {
    const url = this.generatedLink()?.url;
    if (!url) return;
    let ok = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        ok = true;
      }
    } catch { ok = false; }
    if (!ok) ok = this.copyWithExecCommand(url);
    if (ok) this.toast.success('Link copiado');
    else this.toast.error('Não foi possível copiar. Selecione o link e copie manualmente.');
  }

  async shareLink() {
    const url = this.generatedLink()?.url;
    if (!url || !this.canShare) return;
    try {
      await navigator.share({ title: 'Convite para o Agilis', text: 'Entre na minha equipe no Agilis', url });
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError') this.toast.error('Não foi possível compartilhar.');
    }
  }

  downloadQr() {
    const qr = this.generatedLink()?.qrDataUrl;
    if (!qr) return;
    const a = document.createElement('a');
    a.href = qr;
    a.download = 'convite-agilis.png';
    a.click();
  }

  async revokeInvite(invite: CompanyInvite) {
    const ok = await this.confirm.open({
      title: 'Revogar convite',
      message: `Revogar este link criado por ${invite.createdBy.name}? Quem tiver o link não poderá mais entrar por ele.`,
      confirmLabel: 'Revogar',
      danger: true,
    });
    if (!ok) return;
    this.invitesService.revoke(invite.id).subscribe({
      next: () => {
        this.activeInvites.update((list) => list.filter((i) => i.id !== invite.id));
        this.toast.success('Convite revogado');
      },
      error: (err) => this.toast.error(err?.error?.message || 'Erro ao revogar convite'),
    });
  }

  createdAgo(date: string): string {
    return timeAgo(date);
  }

  private copyWithExecCommand(text: string): boolean {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { ok = false; } finally { ta.remove(); }
    return ok;
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
        this.closeInvite();
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
    return timeAgo(date);
  }

}
