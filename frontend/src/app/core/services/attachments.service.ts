import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { Attachment } from '../models';

@Injectable({ providedIn: 'root' })
export class AttachmentsService {
  private readonly api = inject(ApiService);

  getByTask(taskId: string) {
    return this.api.get<Attachment[]>('/attachments', { taskId });
  }

  create(dto: { taskId: string; fileName: string; fileUrl: string; fileSize: number; mimeType: string }) {
    return this.api.post<Attachment>('/attachments', dto);
  }

  delete(id: string) {
    return this.api.delete<Attachment>(`/attachments/${id}`);
  }
}
