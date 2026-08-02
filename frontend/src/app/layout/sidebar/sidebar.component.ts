import { Component, Input, Output, EventEmitter, inject, signal, ChangeDetectionStrategy } from '@angular/core';
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

interface NavSection {
  key: string;
  label: string;
  items: NavItem[];
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

  // Seções sempre visíveis (sem colapso)
  mainNav: NavItem[] = [
    { label: 'Dashboard',      icon: 'space_dashboard', route: '/dashboard' },
    { label: 'Minhas Tarefas', icon: 'check_circle',    route: '/my-tasks' },
    { label: 'Aprovações',     icon: 'approval',        route: '/approvals' },
    { label: 'Calendário',     icon: 'calendar_month',  route: '/calendar' },
  ];

  // Seções colapsáveis
  sections: NavSection[] = [
    {
      key: 'org',
      label: 'Organização',
      items: [
        { label: 'Projetos', icon: 'folder_open',    route: '/projects' },
        { label: 'Equipes',  icon: 'groups',          route: '/teams' },
        { label: 'Membros',  icon: 'manage_accounts', route: '/members' },
        { label: 'Empresas', icon: 'corporate_fare',  route: '/companies' },
      ],
    },
    {
      key: 'com',
      label: 'Comunicação',
      items: [
        { label: 'Mural',            icon: 'dynamic_feed', route: '/feed' },
        { label: 'Wiki Corporativa', icon: 'menu_book',    route: '/corporate-wiki' },
      ],
    },
    {
      key: 'rh',
      label: 'Pessoas',
      items: [
        { label: 'RH',                  icon: 'people',       route: '/hr' },
        { label: 'Centro de Processos', icon: 'account_tree', route: '/process-center' },
      ],
    },
    {
      key: 'intel',
      label: 'Inteligência',
      items: [
        { label: 'Portfolio Executivo', icon: 'account_tree',     route: '/portfolio' },
        { label: 'Assistente IA',     icon: 'smart_toy',        route: '/ia' },
        { label: 'OKRs e Metas',      icon: 'target',           route: '/okrs' },
        { label: 'Health Score',      icon: 'monitor_heart',    route: '/health-score' },
        { label: 'Insights',          icon: 'tips_and_updates', route: '/insights' },
        { label: 'Carga de Trabalho', icon: 'heatmap',          route: '/workload' },
      ],
    },
    {
      key: 'adm',
      label: 'Administração',
      items: [
        { label: 'Automações',          icon: 'auto_awesome',  route: '/automations' },
        { label: 'Métricas',            icon: 'bar_chart',     route: '/metrics' },
        { label: 'Relatórios',          icon: 'summarize',     route: '/reports' },
        { label: 'Centro de Operações', icon: 'hub',           route: '/competitive' },
        { label: 'Webhooks',            icon: 'webhook',       route: '/webhooks' },
        { label: 'Auditoria',           icon: 'verified_user', route: '/audit' },
        { label: 'SLA',                 icon: 'timer',         route: '/sla' },
      ],
    },
  ];

  // Expanded state: org aberta por padrão, resto fechado
  private expanded = signal<Record<string, boolean>>({ org: true });

  isExpanded(key: string): boolean {
    return this.expanded()[key] ?? false;
  }

  toggleSection(key: string) {
    this.expanded.update(m => ({ ...m, [key]: !m[key] }));
  }
}
