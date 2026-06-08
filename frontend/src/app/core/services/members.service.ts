import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';

export interface OrgMember {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
  joinedAt: string;
  createdAt: string;
  teamMemberships: Array<{ team: { id: string; name: string; color: string } }>;
  _count: { assignedTasks: number };
}

@Injectable({ providedIn: 'root' })
export class MembersService {
  private readonly api = inject(ApiService);

  getAll(companyId: string) {
    return this.api.get<OrgMember[]>('/users/company-members/detailed', { companyId });
  }

  invite(companyId: string, email: string, name: string, role: string) {
    return this.api.post<OrgMember[]>('/users/company-members/invite', { email, name, role }, { companyId });
  }

  updateRole(companyId: string, userId: string, role: string) {
    return this.api.patch<OrgMember[]>(`/users/company-members/${userId}/role?companyId=${companyId}`, { role });
  }

  remove(companyId: string, userId: string) {
    return this.api.delete<OrgMember[]>(`/users/company-members/${userId}?companyId=${companyId}`);
  }
}
