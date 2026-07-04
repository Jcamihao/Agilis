import { Component, signal, inject, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { TopbarComponent } from '../topbar/topbar.component';
import { ChatPanelComponent } from '../../shared/components/chat-panel/chat-panel.component';
import { ChatService } from '../../core/services/chat.service';

@Component({
  selector: 'ag-main-layout',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterOutlet, SidebarComponent, TopbarComponent, ChatPanelComponent],
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.scss']
})
export class MainLayoutComponent implements OnInit {
  private readonly chatService = inject(ChatService);
  sidebarCollapsed = signal(false);

  ngOnInit() {
    this.chatService.connect();
  }

  toggleSidebar() {
    this.sidebarCollapsed.update((v) => !v);
  }
}
