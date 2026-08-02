import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';

export interface SearchTask    { id: string; title: string; status: string; priority: string; project: { id: string; name: string; color: string }; assignee?: { id: string; name: string } }
export interface SearchProject { id: string; name: string; color: string; icon: string; description?: string }
export interface SearchMember  { id: string; name: string; email: string; avatarUrl?: string }
export interface SearchWiki    { id: string; title: string; icon: string; project: { id: string; name: string } }
export interface SearchCorpWiki { id: string; title: string; icon: string }

export interface SearchResults {
  tasks:    SearchTask[];
  projects: SearchProject[];
  members:  SearchMember[];
  wikiPages: SearchWiki[];
  corpWiki: SearchCorpWiki[];
}

@Injectable({ providedIn: 'root' })
export class SearchService {
  private readonly api = inject(ApiService);

  search(q: string, companyId: string) {
    return this.api.get<SearchResults>('/search', { q, companyId });
  }
}
