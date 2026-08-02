import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ApiService } from './api.service';
import { Attachment } from '../models';
import { environment } from '../../../environments/environment';

export interface UploadResult {
  url: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

@Injectable({ providedIn: 'root' })
export class AttachmentsService {
  private readonly api = inject(ApiService);
  private readonly http = inject(HttpClient);

  getByTask(taskId: string) {
    return this.api.get<Attachment[]>('/attachments', { taskId });
  }

  uploadFile(file: File): Observable<UploadResult> {
    const form = new FormData();
    form.append('file', file, file.name);
    return this.http.post<{ data: UploadResult }>(`${environment.apiUrl}/upload`, form).pipe(
      map((res: any) => res?.data ?? res),
    );
  }

  create(dto: { taskId: string; fileName: string; fileUrl: string; fileSize: number; mimeType: string }) {
    return this.api.post<Attachment>('/attachments', dto);
  }

  delete(id: string) {
    return this.api.delete<Attachment>(`/attachments/${id}`);
  }
}
