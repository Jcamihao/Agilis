import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface FeedAuthor { id: string; name: string; avatarUrl?: string; }
export interface FeedReaction { id: string; emoji: string; userId: string; }
export interface FeedComment { id: string; content: string; createdAt: string; author: FeedAuthor; }
export interface FeedPost {
  id: string;
  content: string;
  imageUrl?: string;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
  author: FeedAuthor;
  reactions: FeedReaction[];
  comments: FeedComment[];
  _count: { reactions: number; comments: number };
}

export interface FeedListResult {
  posts: FeedPost[];
  total: number;
  page: number;
  totalPages: number;
}

@Injectable({ providedIn: 'root' })
export class FeedService {
  private readonly http   = inject(HttpClient);
  private readonly api    = environment.apiUrl;

  list(companyId: string, page = 1, limit = 20) {
    return this.http.get<{ data: FeedListResult }>(`${this.api}/feed/${companyId}?page=${page}&limit=${limit}`);
  }

  create(companyId: string, dto: { content: string; imageUrl?: string; isPinned?: boolean }) {
    return this.http.post<FeedPost>(`${this.api}/feed/${companyId}`, dto);
  }

  update(id: string, dto: { content?: string; isPinned?: boolean }) {
    return this.http.patch<FeedPost>(`${this.api}/feed/posts/${id}`, dto);
  }

  delete(id: string) {
    return this.http.delete<void>(`${this.api}/feed/posts/${id}`);
  }

  react(postId: string, emoji: string) {
    return this.http.post<{ toggled: boolean }>(`${this.api}/feed/posts/${postId}/react`, { emoji });
  }

  comment(postId: string, content: string) {
    return this.http.post<FeedComment>(`${this.api}/feed/posts/${postId}/comments`, { content });
  }

  deleteComment(commentId: string) {
    return this.http.delete<void>(`${this.api}/feed/comments/${commentId}`);
  }
}
