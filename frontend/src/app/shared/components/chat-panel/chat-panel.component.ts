import {
  Component, inject, OnInit, OnDestroy, signal, computed,
  ChangeDetectionStrategy, ElementRef, ViewChild, AfterViewChecked,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService, ChatMessage } from '../../../core/services/chat.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'ag-chat-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-panel.component.html',
  styleUrls: ['./chat-panel.component.scss'],
})
export class ChatPanelComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('msgEnd') msgEnd!: ElementRef<HTMLDivElement>;

  readonly chat = inject(ChatService);
  readonly auth = inject(AuthService);

  messageText = signal('');
  private typingTimer: any;
  private shouldScrollBottom = false;

  readonly currentUserId = computed(() => this.auth.user()?.id);

  readonly typingLabel = computed(() => {
    const m = this.chat.typingUsers();
    const names = [...m.values()];
    if (!names.length) return '';
    if (names.length === 1) return `${names[0]} está digitando…`;
    return 'Várias pessoas estão digitando…';
  });

  ngOnInit() {
    this.chat.connect();
    const cid = this.auth.currentCompanyId();
    if (cid && !this.chat.rooms().length) {
      this.chat.loadRooms();
    }
  }

  ngOnDestroy() {
    clearTimeout(this.typingTimer);
  }

  ngAfterViewChecked() {
    if (this.shouldScrollBottom) {
      this.scrollToBottom();
      this.shouldScrollBottom = false;
    }
  }

  selectRoom(roomId: string) {
    this.chat.joinRoom(roomId);
    this.shouldScrollBottom = true;
  }

  onInput(event: Event) {
    const val = (event.target as HTMLTextAreaElement).value;
    this.messageText.set(val);

    clearTimeout(this.typingTimer);
    this.chat.startTyping();
    this.typingTimer = setTimeout(() => this.chat.stopTyping(), 2000);
  }

  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  send() {
    const text = this.messageText().trim();
    if (!text) return;
    this.chat.sendMessage(text);
    this.messageText.set('');
    clearTimeout(this.typingTimer);
    this.chat.stopTyping();
    this.shouldScrollBottom = true;
  }

  delete(msg: ChatMessage) {
    this.chat.deleteMessage(msg.id, msg.roomId);
  }

  isOwn(msg: ChatMessage): boolean {
    return msg.user.id === this.currentUserId();
  }

  groupedMessages(): { date: string; messages: ChatMessage[] }[] {
    const groups: { date: string; messages: ChatMessage[] }[] = [];
    let lastDate = '';
    for (const msg of this.chat.messages()) {
      const d = new Date(msg.createdAt).toLocaleDateString('pt-BR', {
        day: 'numeric', month: 'long',
      });
      if (d !== lastDate) {
        groups.push({ date: d, messages: [] });
        lastDate = d;
      }
      groups[groups.length - 1].messages.push(msg);
    }
    return groups;
  }

  formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  private scrollToBottom() {
    try { this.msgEnd?.nativeElement.scrollIntoView({ behavior: 'smooth' }); } catch {}
  }
}
