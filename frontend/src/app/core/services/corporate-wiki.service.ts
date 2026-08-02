import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface WikiAuthor { id: string; name: string; avatarUrl?: string; }
export interface CorporateWikiRevision { id: string; title: string; content: string; createdAt: string; author: WikiAuthor; }
export interface CorporateWikiPage {
  id: string;
  companyId: string;
  parentId?: string;
  title: string;
  content: string;
  icon: string;
  position: number;
  createdAt: string;
  updatedAt: string;
  createdBy: WikiAuthor;
  updatedBy: WikiAuthor;
  children?: { id: string; title: string; icon: string }[];
  revisions?: CorporateWikiRevision[];
  _count?: { children: number; revisions: number };
}

@Injectable({ providedIn: 'root' })
export class CorporateWikiService {
  private readonly http = inject(HttpClient);
  private readonly api  = environment.apiUrl;

  list(companyId: string) {
    return this.http.get<CorporateWikiPage[]>(`${this.api}/corporate-wiki/${companyId}`);
  }

  getOne(id: string) {
    return this.http.get<CorporateWikiPage>(`${this.api}/corporate-wiki/pages/${id}`);
  }

  create(companyId: string, dto: { title: string; content?: string; parentId?: string; icon?: string }) {
    return this.http.post<CorporateWikiPage>(`${this.api}/corporate-wiki/${companyId}`, dto);
  }

  update(id: string, dto: { title?: string; content?: string; icon?: string; position?: number; parentId?: string }) {
    return this.http.patch<CorporateWikiPage>(`${this.api}/corporate-wiki/pages/${id}`, dto);
  }

  delete(id: string) {
    return this.http.delete<void>(`${this.api}/corporate-wiki/pages/${id}`);
  }
}
