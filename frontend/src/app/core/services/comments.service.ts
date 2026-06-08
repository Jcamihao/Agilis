import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { Comment } from '../models';

@Injectable({ providedIn: 'root' })
export class CommentsService {
  private readonly api = inject(ApiService);

  getByTask(taskId: string) {
    return this.api.get<Comment[]>('/comments', { taskId });
  }

  create(taskId: string, content: string) {
    return this.api.post<Comment>('/comments', { taskId, content });
  }

  update(id: string, content: string) {
    return this.api.put<Comment>(`/comments/${id}`, { content });
  }

  delete(id: string) {
    return this.api.delete<Comment>(`/comments/${id}`);
  }
}
