import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { User } from '../models';

export type CompanyMember = Pick<User, 'id' | 'name' | 'email' | 'avatarUrl'>;

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly api = inject(ApiService);

  getCompanyMembers(companyId: string) {
    return this.api.get<CompanyMember[]>('/users/company-members', { companyId });
  }
}
