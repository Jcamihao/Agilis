import { Component, signal, inject, ChangeDetectionStrategy, OnInit, HostListener } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { TopbarComponent } from '../topbar/topbar.component';
import { OnboardingWizardComponent } from '../../shared/components/onboarding-wizard/onboarding-wizard.component';
import { CompaniesService } from '../../core/services/companies.service';

@Component({
  selector: 'ag-main-layout',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterOutlet, SidebarComponent, TopbarComponent, OnboardingWizardComponent],
  templateUrl: './main-layout.component.html'
})
export class MainLayoutComponent implements OnInit {
  private readonly companiesSvc = inject(CompaniesService);

  sidebarCollapsed = signal(false);
  isMobile = signal(false);
  mobileSidebarOpen = signal(false);
  showOnboarding = signal(false);

  ngOnInit() {
    this.updateViewport();
    this.checkOnboarding();
  }

  @HostListener('window:resize')
  onWindowResize() {
    this.updateViewport();
  }

  toggleSidebar() {
    if (this.isMobile()) {
      this.mobileSidebarOpen.update((v) => !v);
      return;
    }
    this.sidebarCollapsed.update((v) => !v);
  }

  closeMobileSidebar() {
    this.mobileSidebarOpen.set(false);
  }

  private updateViewport() {
    const mobile = window.innerWidth < 1024;
    this.isMobile.set(mobile);
    if (!mobile) this.mobileSidebarOpen.set(false);
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
