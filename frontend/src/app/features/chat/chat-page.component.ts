import {
  Component, OnInit, OnDestroy, signal, computed,
  ChangeDetectionStrategy, ChangeDetectorRef, inject, ViewChild, ElementRef, AfterViewChecked,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService, ChatRoom, ChatMessage } from '../../core/services/chat.service';
import { AnnouncementsService, Announcement } from '../../core/services/announcements.service';
import { AuthService } from '../../core/services/auth.service';
import { UsersService } from '../../core/services/users.service';

type Sidebar = 'channels' | 'dms' | 'announcements';

@Component({
  selector: 'ag-chat-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-page.component.html',
  styleUrls: ['./chat-page.component.scss'],
})
export class ChatPageComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('msgEnd') msgEnd!: ElementRef<HTMLDivElement>;

  readonly chat    = inject(ChatService);
  readonly annSvc  = inject(AnnouncementsService);
  readonly auth    = inject(AuthService);
  readonly usersSvc = inject(UsersService);
  private readonly cdr = inject(ChangeDetectorRef);

  sidebar      = signal<Sidebar>('channels');
  messageText  = signal('');
  newChannel   = signal('');
  showNewChan  = signal(false);
  announcements = signal<Announcement[]>([]);
  annLoading   = signal(false);
  showAnnForm  = signal(false);
  annTitle     = signal('');
  annContent   = signal('');
  annPinned    = signal(false);
  members      = signal<any[]>([]);
  private shouldScroll = false;
  private typingTimer: any;

  readonly currentUserId = computed(() => this.auth.user()?.id ?? '');

  readonly channels = computed(() =>
    this.chat.rooms().filter(r => r.type === 'GENERAL' || r.type === 'DEPARTMENT' || r.type === 'PROJECT')
  );
  readonly dms = computed(() =>
    this.chat.rooms().filter(r => r.type === 'DIRECT')
  );

  readonly typingLabel = computed(() => {
    const names = [...this.chat.typingUsers().values()];
    if (!names.length) return '';
    if (names.length === 1) return `${names[0]} está digitando…`;
    return 'Várias pessoas estão digitando…';
  });

  ngOnInit() {
    this.chat.connect();
    this.chat.loadRooms();
    const cid = this.auth.currentCompanyId();
    if (cid) {
      this.chat.openGeneralRoom(cid);
      this.usersSvc.getCompanyMembers(cid).subscribe({ next: m => { this.members.set(m as any ?? []); this.cdr.markForCheck(); } });
    }
  }

  ngOnDestroy() { clearTimeout(this.typingTimer); }

  ngAfterViewChecked() {
    if (this.shouldScroll) { this.scrollToBottom(); this.shouldScroll = false; }
  }

  selectRoom(room: ChatRoom) {
    this.chat.joinRoom(room.id);
    this.sidebar.set(room.type === 'DIRECT' ? 'dms' : 'channels');
    this.shouldScroll = true;
    this.cdr.markForCheck();
  }

  send() {
    const txt = this.messageText().trim();
    if (!txt) return;
    this.chat.sendMessage(txt);
    this.messageText.set('');
    this.chat.stopTyping();
    clearTimeout(this.typingTimer);
    this.shouldScroll = true;
  }

  onKey(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.send(); return; }
    this.chat.startTyping();
    clearTimeout(this.typingTimer);
    this.typingTimer = setTimeout(() => this.chat.stopTyping(), 2000);
  }

  createChannel() {
    const name = this.newChannel().trim();
    if (!name) return;
    this.chat.createChannel(name).subscribe({
      next: (res: any) => {
        const room: ChatRoom = res.data ?? res;
        this.chat.rooms.update(list => [...list, room]);
        this.newChannel.set('');
        this.showNewChan.set(false);
        this.selectRoom(room);
        this.cdr.markForCheck();
      },
    });
  }

  openDM(userId: string) {
    this.chat.openDirect(userId).subscribe({
      next: (res: any) => {
        const room: ChatRoom = res.data ?? res;
        this.chat.rooms.update(list => list.find(r => r.id === room.id) ? list : [...list, room]);
        this.selectRoom(room);
        this.cdr.markForCheck();
      },
    });
  }

  dmLabel(room: ChatRoom): string {
    const parts = room.name.replace('dm:', '').split(':');
    const otherId = parts.find(id => id !== this.currentUserId());
    const member = this.members().find(m => m.user?.id === otherId || m.id === otherId);
    return member?.user?.name ?? member?.name ?? 'Mensagem direta';
  }

  dmInitials(room: ChatRoom): string {
    return this.dmLabel(room).slice(0, 2).toUpperCase();
  }

  loadAnnouncements() {
    this.annLoading.set(true);
    this.annSvc.list().subscribe({
      next: r => { this.announcements.set(r as any ?? []); this.annLoading.set(false); this.cdr.markForCheck(); },
      error: () => this.annLoading.set(false),
    });
  }

  setSidebar(s: Sidebar) {
    this.sidebar.set(s);
    if (s === 'announcements' && !this.announcements().length) this.loadAnnouncements();
  }

  hasRead(ann: Announcement): boolean {
    return ann.reads.some(r => r.userId === this.currentUserId());
  }

  markRead(ann: Announcement) {
    if (this.hasRead(ann)) return;
    this.annSvc.markRead(ann.id).subscribe({
      next: () => {
        this.announcements.update(list => list.map(a =>
          a.id === ann.id ? { ...a, reads: [...a.reads, { userId: this.currentUserId() }] } : a
        ));
        this.cdr.markForCheck();
      },
    });
  }

  saveAnnouncement() {
    const dto = { title: this.annTitle().trim(), content: this.annContent().trim(), isPinned: this.annPinned() };
    if (!dto.title || !dto.content) return;
    this.annSvc.create(dto).subscribe({
      next: (r: any) => {
        this.announcements.update(list => [r, ...list]);
        this.annTitle.set(''); this.annContent.set(''); this.annPinned.set(false);
        this.showAnnForm.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  deleteAnn(id: string) {
    if (!confirm('Excluir comunicado?')) return;
    this.annSvc.delete(id).subscribe({
      next: () => { this.announcements.update(list => list.filter(a => a.id !== id)); this.cdr.markForCheck(); },
    });
  }

  deleteMsg(msg: ChatMessage) {
    this.chat.deleteMessage(msg.id, msg.roomId);
  }

  initials(name: string) { return this.chat.initials(name); }

  private scrollToBottom() {
    try { this.msgEnd?.nativeElement?.scrollIntoView({ behavior: 'smooth' }); } catch {}
  }

  trackById(_: number, item: any) { return item.id; }
}
