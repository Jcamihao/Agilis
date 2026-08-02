import { Component, signal, inject, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { TopbarComponent } from '../topbar/topbar.component';
import { ChatPanelComponent } from '../../shared/components/chat-panel/chat-panel.component';
import { OnboardingWizardComponent } from '../../shared/components/onboarding-wizard/onboarding-wizard.component';
import { ChatService } from '../../core/services/chat.service';
import { CompaniesService } from '../../core/services/companies.service';

@Component({
  selector: 'ag-main-layout',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterOutlet, SidebarComponent, TopbarComponent, ChatPanelComponent, OnboardingWizardComponent],
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.scss']
})
export class MainLayoutComponent implements OnInit {
  private readonly chatService = inject(ChatService);
  private readonly companiesSvc = inject(CompaniesService);

  sidebarCollapsed = signal(false);
  showOnboarding = signal(false);

  ngOnInit() {
    this.chatService.connect();
    this.checkOnboarding();
  }

  toggleSidebar() {
    this.sidebarCollapsed.update((v) => !v);
  }

  private checkOnboarding() {
    this.companiesSvc.getAll().subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : (res?.data ?? []);
        if (list.length === 0) this.showOnboarding.set(true);
      },
    });
  }
}
