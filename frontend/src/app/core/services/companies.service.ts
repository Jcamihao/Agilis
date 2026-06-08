import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { Company, DashboardStats } from '../models';

@Injectable({ providedIn: 'root' })
export class CompaniesService {
  private readonly api = inject(ApiService);

  getAll() { return this.api.get<Company[]>('/companies'); }
  getOne(id: string) { return this.api.get<Company>(`/companies/${id}`); }
  create(data: Partial<Company>) { return this.api.post<Company>('/companies', data); }
  update(id: string, data: Partial<Company>) { return this.api.put<Company>(`/companies/${id}`, data); }
  getDashboard(id: string) { return this.api.get<DashboardStats>(`/companies/${id}/dashboard`); }
}
