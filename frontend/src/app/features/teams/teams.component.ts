import { Component, signal, inject, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { TeamsService } from '../../core/services/teams.service';
import { UsersService, CompanyMember } from '../../core/services/users.service';
import { ToastService } from '../../core/services/toast.service';
import { Team } from '../../core/models';

const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Líder', ADMIN: 'Admin', MEMBER: 'Membro', VIEWER: 'Visualizador',
};

@Component({
  selector: 'ag-teams',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './teams.component.html',
  styleUrls: ['./teams.component.scss']
})
export class TeamsComponent implements OnInit {
  private readonly auth    = inject(AuthService);
  private readonly service = inject(TeamsService);
  private readonly users   = inject(UsersService);
  private readonly fb      = inject(FormBuilder);
  private readonly cdr     = inject(ChangeDetectorRef);
  private readonly toast   = inject(ToastService);

  readonly ROLE_LABELS = ROLE_LABELS;

  // ── State ─────────────────────────────────────────────────────────────────
  loading        = signal(true);
  saving         = signal(false);
  savingTeam     = signal(false);
  addingMember   = signal(false);
  teams          = signal<Team[]>([]);
  showModal      = signal(false);
  showManageModal = signal(false);
  managingTeam   = signal<Team | null>(null);
  manageTab      = signal<'settings' | 'members'>('settings');
  companyMembers = signal<CompanyMember[]>([]);
  memberSearch   = signal('');
  addMemberSearch = signal('');
  openMenuMemberId = signal<string | null>(null);

  colors = ['#6366f1', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#0ea5e9', '#84cc16'];

  form     = this.fb.group({ name: ['', Validators.required], color: ['#6366f1'] });
  editForm = this.fb.group({ name: ['', Validators.required], color: ['#6366f1'] });

  // ── Create modal: member picker ───────────────────────────────────────────
  createMemberSearch = signal('');
  selectedCreateMembers = signal<Array<{ member: CompanyMember; role: string }>>([]);

  availableForCreate() {
    const selected = new Set(this.selectedCreateMembers().map((m) => m.member.id));
    const q = this.createMemberSearch().toLowerCase().trim();
    return this.companyMembers().filter((m) => {
      if (selected.has(m.id)) return false;
      if (!q) return true;
      return m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q);
    });
  }

  addToCreate(member: CompanyMember) {
    this.selectedCreateMembers.update((list) => [...list, { member, role: 'MEMBER' }]);
    this.createMemberSearch.set('');
  }

  removeFromCreate(id: string) {
    this.selectedCreateMembers.update((list) => list.filter((m) => m.member.id !== id));
  }

  setCreateRole(id: string, role: string) {
    this.selectedCreateMembers.update((list) =>
      list.map((m) => m.member.id === id ? { ...m, role } : m)
    );
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  ngOnInit() {
    document.addEventListener('click', () => this.openMenuMemberId.set(null));
    const cid = this.auth.currentCompanyId();
    if (cid) {
      this.service.getAll(cid).subscribe({
        next: (data) => { this.teams.set(data); this.loading.set(false); },
        error: () => this.loading.set(false),
      });
      this.users.getCompanyMembers(cid).subscribe({ next: (m) => this.companyMembers.set(m) });
    } else { this.loading.set(false); }
  }

  // ── Manage modal ──────────────────────────────────────────────────────────
  openManage(team: Team) {
    this.service.getOne(team.id).subscribe({
      next: (full) => {
        this.managingTeam.set(full);
        this.editForm.reset({ name: full.name, color: full.color });
        this.manageTab.set('settings');
        this.memberSearch.set('');
        this.addMemberSearch.set('');
        this.showManageModal.set(true);
        this.cdr.markForCheck();
      },
    });
  }

  closeManage() {
    this.showManageModal.set(false);
    this.managingTeam.set(null);
    this.openMenuMemberId.set(null);
  }

  // ── Update team (name/color) ───────────────────────────────────────────────
  saveTeamSettings() {
    if (this.editForm.invalid || !this.managingTeam()) return;
    this.savingTeam.set(true);
    const { name, color } = this.editForm.value;
    this.service.update(this.managingTeam()!.id, { name: name!, color: color! }).subscribe({
      next: (updated) => {
        this.managingTeam.update((t) => t ? { ...t, name: updated.name, color: updated.color } : t);
        this.teams.update((list) => list.map((t) => t.id === updated.id ? { ...t, name: updated.name, color: updated.color } : t));
        this.savingTeam.set(false);
        this.toast.success('Equipe atualizada!');
        this.cdr.markForCheck();
      },
      error: () => this.savingTeam.set(false),
    });
  }

  // ── Members ───────────────────────────────────────────────────────────────
  teamMembers() {
    const q = this.memberSearch().toLowerCase().trim();
    const members = this.managingTeam()?.members ?? [];
    if (!q) return members;
    return members.filter((m) => m.user.name.toLowerCase().includes(q) || m.user.email.toLowerCase().includes(q));
  }

  availableToAdd(): CompanyMember[] {
    const existing = new Set((this.managingTeam()?.members ?? []).map((m) => m.userId));
    const q = this.addMemberSearch().toLowerCase().trim();
    return this.companyMembers().filter((c) => {
      if (existing.has(c.id)) return false;
      if (!q) return true;
      return c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q);
    });
  }

  addMember(member: CompanyMember) {
    const team = this.managingTeam();
    if (!team) return;
    this.addingMember.set(true);
    this.service.addMember(team.id, member.id).subscribe({
      next: () => {
        const newMember = { id: `${team.id}-${member.id}`, teamId: team.id, userId: member.id, role: 'MEMBER' as any, user: member };
        this.managingTeam.update((t) => t ? { ...t, members: [...(t.members ?? []), newMember] } : t);
        this.addMemberSearch.set('');
        this.addingMember.set(false);
        this.toast.success(`${member.name} adicionado!`);
        this.cdr.markForCheck();
      },
      error: () => this.addingMember.set(false),
    });
  }

  removeMember(memberId: string, memberName: string) {
    const team = this.managingTeam();
    if (!team) return;
    this.openMenuMemberId.set(null);
    this.service.removeMember(team.id, memberId).subscribe({
      next: () => {
        this.managingTeam.update((t) => t ? { ...t, members: (t.members ?? []).filter((m) => m.userId !== memberId) } : t);
        this.toast.success(`${memberName} removido da equipe`);
        this.cdr.markForCheck();
      },
    });
  }

  changeRole(memberId: string, role: string) {
    const team = this.managingTeam();
    if (!team) return;
    this.openMenuMemberId.set(null);
    this.service.addMember(team.id, memberId, role).subscribe({
      next: () => {
        this.managingTeam.update((t) => t ? {
          ...t,
          members: (t.members ?? []).map((m) => m.userId === memberId ? { ...m, role: role as any } : m),
        } : t);
        this.toast.success('Papel atualizado!');
        this.cdr.markForCheck();
      },
    });
  }

  // ── Create team ───────────────────────────────────────────────────────────
  createTeam() {
    if (this.form.invalid) return;
    const cid = this.auth.currentCompanyId();
    if (!cid) return;
    this.saving.set(true);
    const members = this.selectedCreateMembers().map((m) => ({ userId: m.member.id, role: m.role }));
    this.service.create({ ...this.form.value as any, companyId: cid, members }).subscribe({
      next: (t) => {
        this.teams.update((list) => [t, ...list]);
        this.showModal.set(false);
        this.form.reset({ color: '#6366f1' });
        this.selectedCreateMembers.set([]);
        this.createMemberSearch.set('');
        this.saving.set(false);
      },
      error: () => this.saving.set(false),
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  toggleMemberMenu(id: string, event: Event) {
    event.stopPropagation();
    this.openMenuMemberId.set(this.openMenuMemberId() === id ? null : id);
  }

  roleOptions = [
    { key: 'OWNER',  label: 'Líder' },
    { key: 'ADMIN',  label: 'Admin' },
    { key: 'MEMBER', label: 'Membro' },
  ];

}
