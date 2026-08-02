import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';

export interface Announcement {
  id:        string;
  companyId: string;
  authorId:  string;
  title:     string;
  content:   string;
  isPinned:  boolean;
  createdAt: string;
  author:    { id: string; name: string; avatarUrl: string | null };
  reads:     { userId: string }[];
  _count:    { reads: number };
}

@Injectable({ providedIn: 'root' })
export class AnnouncementsService {
  private readonly api = inject(ApiService);

  list()                                           { return this.api.get<Announcement[]>('/announcements'); }
  unread()                                         { return this.api.get<{ unread: number }>('/announcements/unread'); }
  create(dto: { title: string; content: string; isPinned?: boolean }) { return this.api.post<Announcement>('/announcements', dto); }
  update(id: string, dto: Partial<{ title: string; content: string; isPinned: boolean }>) { return this.api.patch<Announcement>(`/announcements/${id}`, dto); }
  delete(id: string)                               { return this.api.delete<void>(`/announcements/${id}`); }
  markRead(id: string)                             { return this.api.post<{ ok: boolean }>(`/announcements/${id}/read`, {}); }
}
