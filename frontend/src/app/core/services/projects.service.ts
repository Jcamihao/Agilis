import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { Project } from '../models';

@Injectable({ providedIn: 'root' })
export class ProjectsService {
  private readonly api = inject(ApiService);

  getAll(companyId?: string, teamId?: string) {
    return this.api.get<Project[]>('/projects', { ...(companyId ? { companyId } : {}), ...(teamId ? { teamId } : {}) });
  }
  getOne(id: string) { return this.api.get<Project>(`/projects/${id}`); }
  create(data: Partial<Project>) { return this.api.post<Project>('/projects', data); }
  update(id: string, data: Partial<Project>) { return this.api.put<Project>(`/projects/${id}`, data); }
  archive(id: string) { return this.api.patch(`/projects/${id}/archive`, {}); }
  restore(id: string) { return this.api.patch<Project>(`/projects/${id}/restore`, {}); }
  getArchived(companyId?: string) { return this.api.get<Project[]>('/projects', { ...(companyId ? { companyId } : {}), archived: 'true' }); }

  addMember(projectId: string, userId: string, role = 'MEMBER') {
    return this.api.post<Project>(`/projects/${projectId}/members/${userId}`, { role });
  }
  removeMember(projectId: string, userId: string) {
    return this.api.delete<Project>(`/projects/${projectId}/members/${userId}`);
  }
  updateColumns(projectId: string, config: Record<string, string>) {
    return this.api.patch<Project>(`/projects/${projectId}/columns`, config);
  }
}
