import { Component, Input, Output, EventEmitter, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ChatService } from '../../core/services/chat.service';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  badge?: number;
}

@Component({
  selector: 'ag-sidebar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent {
  @Input() collapsed = false;
  @Output() toggleCollapse = new EventEmitter<void>();

  private readonly auth = inject(AuthService);
  readonly chat = inject(ChatService);
  readonly user = this.auth.user;
  readonly companyName = () => this.user()?.companies?.[0]?.company?.name;

  openChat() {
    const cid = this.auth.currentCompanyId();
    if (cid) this.chat.openGeneralRoom(cid);
    else this.chat.togglePanel();
  }

  mainNav: NavItem[] = [
    { label: 'Dashboard',      icon: 'space_dashboard',  route: '/dashboard' },
    { label: 'Minhas Tarefas', icon: 'check_circle',     route: '/my-tasks' },
    { label: 'Aprovações',     icon: 'approval',         route: '/approvals' },
    { label: 'Calendário',     icon: 'calendar_month',   route: '/calendar' },
    { label: 'Notificações',   icon: 'notifications',    route: '/notifications' },
  ];

  orgNav: NavItem[] = [
    { label: 'Projetos', icon: 'folder_open',    route: '/projects' },
    { label: 'Equipes',  icon: 'groups',          route: '/teams' },
    { label: 'Membros',  icon: 'manage_accounts', route: '/members' },
    { label: 'Empresas', icon: 'corporate_fare',  route: '/companies' },
  ];

  v3Nav: NavItem[] = [
    { label: 'Assistente IA',       icon: 'smart_toy',       route: '/ia' },
    { label: 'Carga de Trabalho',   icon: 'heatmap',         route: '/workload' },
    { label: 'OKRs e Metas',        icon: 'target',          route: '/okrs' },
    { label: 'Health Score',        icon: 'monitor_heart',   route: '/health-score' },
    { label: 'Insights',            icon: 'tips_and_updates',route: '/insights' },
    { label: 'Centro de Operações', icon: 'hub',             route: '/competitive' },
    { label: 'Automações',          icon: 'auto_awesome',    route: '/automations' },
    { label: 'Webhooks',            icon: 'webhook',         route: '/webhooks' },
    { label: 'Métricas',            icon: 'bar_chart',       route: '/metrics' },
    { label: 'Relatórios',          icon: 'summarize',       route: '/reports' },
    { label: 'Auditoria',           icon: 'verified_user',   route: '/audit' },
  ];
}
