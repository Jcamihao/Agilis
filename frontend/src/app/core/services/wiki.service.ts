import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { WikiPage, WikiPageRevision } from '../models';

@Injectable({ providedIn: 'root' })
export class WikiService {
  private readonly api = inject(ApiService);

  getTree(projectId: string) {
    return this.api.get<WikiPage[]>(`/projects/${projectId}/wiki`);
  }

  getPage(projectId: string, id: string) {
    return this.api.get<WikiPage>(`/projects/${projectId}/wiki/${id}`);
  }

  search(projectId: string, q: string) {
    return this.api.get<WikiPage[]>(`/projects/${projectId}/wiki/search`, { q });
  }

  create(projectId: string, dto: { title: string; parentId?: string; icon?: string }) {
    return this.api.post<WikiPage>(`/projects/${projectId}/wiki`, dto);
  }

  update(projectId: string, id: string, dto: { title?: string; content?: string; icon?: string; parentId?: string | null }) {
    return this.api.patch<WikiPage>(`/projects/${projectId}/wiki/${id}`, dto);
  }

  delete(projectId: string, id: string) {
    return this.api.delete<void>(`/projects/${projectId}/wiki/${id}`);
  }

  reorder(projectId: string, orderedIds: string[]) {
    return this.api.patch<WikiPage[]>(`/projects/${projectId}/wiki/reorder`, { orderedIds });
  }
}
