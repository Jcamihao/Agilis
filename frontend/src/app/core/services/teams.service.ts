import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { Team } from '../models';

@Injectable({ providedIn: 'root' })
export class TeamsService {
  private readonly api = inject(ApiService);

  getAll(companyId: string) { return this.api.get<Team[]>('/teams', { companyId }); }
  getOne(id: string) { return this.api.get<Team>(`/teams/${id}`); }
  create(data: Partial<Team>) { return this.api.post<Team>('/teams', data); }
  update(id: string, data: Partial<Team>) { return this.api.put<Team>(`/teams/${id}`, data); }
  addMember(teamId: string, userId: string, role = 'MEMBER') {
    return this.api.post(`/teams/${teamId}/members`, { userId, role });
  }
  removeMember(teamId: string, memberId: string) {
    return this.api.delete(`/teams/${teamId}/members/${memberId}`);
  }
}
