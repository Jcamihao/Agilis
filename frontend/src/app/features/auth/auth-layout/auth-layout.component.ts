import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'ag-auth-layout',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet],
  templateUrl: './auth-layout.component.html',
  styleUrls: ['./auth-layout.component.scss']
})
export class AuthLayoutComponent {
  features = [
    { icon: 'view_kanban', label: 'Kanban Inteligente', desc: 'Drag & drop com atualização em tempo real' },
    { icon: 'group', label: 'Colaboração em Equipe', desc: 'Múltiplas equipes e permissões granulares' },
    { icon: 'insights', label: 'Dashboard Analítico', desc: 'Visão completa do progresso dos projetos' },
  ];

  stats = [
    { value: '10x', label: 'Mais produtividade' },
    { value: '99%', label: 'Uptime' },
    { value: '5min', label: 'Para começar' },
  ];
}
