import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

export interface ChatUser {
  id: string;
  name: string;
  avatarUrl?: string;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  content: string;
  editedAt?: string;
  deletedAt?: string;
  createdAt: string;
  user: ChatUser;
}

export interface ChatRoom {
  id: string;
  name: string;
  type: 'GENERAL' | 'PROJECT' | 'DIRECT' | 'DEPARTMENT';
  projectId?: string;
  project?: { id: string; name: string };
  _count?: { messages: number };
}

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly http   = inject(HttpClient);
  private readonly auth   = inject(AuthService);
  private readonly apiUrl = environment.apiUrl;
  private readonly wsUrl  = environment.apiUrl.replace('/api/v1', '');

  private socket: Socket | null = null;

  // ── Reactive state ─────────────────────────────────────────────────────────
  readonly rooms         = signal<ChatRoom[]>([]);
  readonly activeRoomId  = signal<string | null>(null);
  readonly messages      = signal<ChatMessage[]>([]);
  readonly onlineUsers   = signal<Set<string>>(new Set());
  readonly typingUsers   = signal<Map<string, string>>(new Map()); // userId -> name
  readonly unreadCounts  = signal<Record<string, number>>({});
  readonly panelOpen     = signal(false);

  readonly activeRoom = computed(() =>
    this.rooms().find(r => r.id === this.activeRoomId())
  );

  readonly totalUnread = computed(() =>
    Object.values(this.unreadCounts()).reduce((s, n) => s + n, 0)
  );

  // ── Connect / disconnect ────────────────────────────────────────────────────

  connect() {
    if (this.socket?.connected) return;
    const token = this.auth.token();
    if (!token) return;

    this.socket = io(`${this.wsUrl}/chat`, {
      auth: { token },
      transports: ['websocket'],
    });

    this.socket.on('connect', () => this.loadRooms());

    this.socket.on('presence:online', ({ userId }: { userId: string }) => {
      this.onlineUsers.update(s => { const n = new Set(s); n.add(userId); return n; });
    });

    this.socket.on('presence:offline', ({ userId }: { userId: string }) => {
      this.onlineUsers.update(s => { const n = new Set(s); n.delete(userId); return n; });
    });

    this.socket.on('message:new', (msg: ChatMessage) => {
      if (msg.roomId === this.activeRoomId()) {
        this.messages.update(list => [...list, msg]);
      } else {
        this.unreadCounts.update(c => ({ ...c, [msg.roomId]: (c[msg.roomId] ?? 0) + 1 }));
      }
    });

    this.socket.on('message:updated', (msg: ChatMessage) => {
      this.messages.update(list => list.map(m => m.id === msg.id ? msg : m));
    });

    this.socket.on('message:deleted', ({ messageId }: { messageId: string }) => {
      this.messages.update(list => list.filter(m => m.id !== messageId));
    });

    this.socket.on('typing:start', ({ userId, name }: { userId: string; name: string }) => {
      this.typingUsers.update(m => { const n = new Map(m); n.set(userId, name); return n; });
    });

    this.socket.on('typing:stop', ({ userId }: { userId: string }) => {
      this.typingUsers.update(m => { const n = new Map(m); n.delete(userId); return n; });
    });

    // keep presence alive
    setInterval(() => this.socket?.emit('presence:ping'), 25_000);
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }

  // ── Room actions ────────────────────────────────────────────────────────────

  loadRooms() {
    this.http.get<any>(`${this.apiUrl}/chat/rooms`).subscribe({
      next: (res) => this.rooms.set(res.data ?? res),
    });
  }

  joinRoom(roomId: string) {
    this.activeRoomId.set(roomId);
    this.messages.set([]);
    this.unreadCounts.update(c => ({ ...c, [roomId]: 0 }));
    this.typingUsers.set(new Map());

    this.socket?.emit('room:join', { roomId }, (res: any) => {
      if (res?.data) this.messages.set(res.data);
    });
  }

  createChannel(name: string) {
    return this.http.post<any>(`${this.apiUrl}/chat/rooms/channel`, { name });
  }

  openDirect(targetUserId: string) {
    return this.http.post<any>(`${this.apiUrl}/chat/rooms/direct/${targetUserId}`, {});
  }

  deleteRoom(roomId: string) {
    return this.http.delete<any>(`${this.apiUrl}/chat/rooms/${roomId}`);
  }

  openGeneralRoom(companyId: string) {
    this.http.post<any>(`${this.apiUrl}/chat/rooms/general`, {}).subscribe({
      next: (res) => {
        const room: ChatRoom = res.data ?? res;
        this.rooms.update(list => list.find(r => r.id === room.id) ? list : [...list, room]);
        this.panelOpen.set(true);
        this.joinRoom(room.id);
      },
    });
  }

  openProjectRoom(projectId: string, projectName: string) {
    this.http.post<any>(`${this.apiUrl}/chat/rooms/project/${projectId}`, { projectName }).subscribe({
      next: (res) => {
        const room: ChatRoom = res.data ?? res;
        this.rooms.update(list => list.find(r => r.id === room.id) ? list : [...list, room]);
        this.panelOpen.set(true);
        this.joinRoom(room.id);
      },
    });
  }

  // ── Message actions ─────────────────────────────────────────────────────────

  sendMessage(content: string) {
    const roomId = this.activeRoomId();
    if (!roomId || !content.trim()) return;
    this.socket?.emit('message:send', { roomId, content: content.trim() });
  }

  deleteMessage(messageId: string, roomId: string) {
    this.socket?.emit('message:delete', { messageId, roomId });
  }

  startTyping() {
    const roomId = this.activeRoomId();
    if (roomId) this.socket?.emit('typing:start', { roomId });
  }

  stopTyping() {
    const roomId = this.activeRoomId();
    if (roomId) this.socket?.emit('typing:stop', { roomId });
  }

  loadMore(before: string) {
    const roomId = this.activeRoomId();
    if (!roomId) return;
    this.socket?.emit('messages:load-more', { roomId, before }, (res: any) => {
      if (res?.data?.length) {
        this.messages.update(list => [...res.data, ...list]);
      }
    });
  }

  togglePanel() {
    this.panelOpen.update(v => !v);
  }

  initials(name: string): string {
    const parts = name.trim().split(' ');
    return parts.length >= 2
      ? parts[0][0] + parts[parts.length - 1][0]
      : parts[0].slice(0, 2);
  }
}
