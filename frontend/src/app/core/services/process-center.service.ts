import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { Process } from '../models';

@Injectable({ providedIn: 'root' })
export class ProcessCenterService {
  private readonly api = inject(ApiService);

  list(companyId: string) {
    return this.api.get<Process[]>('/process-center', { companyId });
  }

  get(id: string) {
    return this.api.get<Process>(`/process-center/${id}`);
  }

  create(input: Partial<Process> & { companyId: string; name: string }) {
    return this.api.post<Process>('/process-center', input);
  }

  update(id: string, data: Partial<Process>) {
    return this.api.patch<Process>(`/process-center/${id}`, data);
  }

  start(id: string) {
    return this.api.post<any>(`/process-center/${id}/start`, {});
  }
}
