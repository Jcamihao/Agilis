import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface HrUser { id: string; name: string; avatarUrl?: string; email: string; }

export interface HrProfile {
  id: string;
  userId: string;
  companyId: string;
  jobTitle?: string;
  department?: string;
  managerId?: string;
  admissionDate?: string;
  birthDate?: string;
  status: 'ACTIVE' | 'ON_LEAVE' | 'TERMINATED';
  daysUntil?: number;
  user: HrUser;
  manager?: { user: HrUser };
  _count?: { reports: number };
  children?: HrProfile[];
}

export interface LeaveRequest {
  id: string;
  userId: string;
  companyId: string;
  type: 'VACATION' | 'SICK' | 'PERSONAL' | 'MATERNITY' | 'PATERNITY' | 'OTHER';
  startDate: string;
  endDate: string;
  reason?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  createdAt: string;
  user: HrUser;
  approvedBy?: HrUser;
}

export interface TimeRecord {
  id: string;
  userId: string;
  type: 'CLOCK_IN' | 'BREAK_START' | 'BREAK_END' | 'CLOCK_OUT';
  timestamp: string;
  note?: string;
  user?: HrUser;
}

export const LEAVE_TYPE_LABELS: Record<string, string> = {
  VACATION: 'Férias', SICK: 'Licença médica', PERSONAL: 'Pessoal',
  MATERNITY: 'Maternidade', PATERNITY: 'Paternidade', OTHER: 'Outro',
};

export const TIME_RECORD_LABELS: Record<string, string> = {
  CLOCK_IN: 'Entrada', BREAK_START: 'Início intervalo',
  BREAK_END: 'Fim intervalo', CLOCK_OUT: 'Saída',
};

export const HR_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Ativo', ON_LEAVE: 'Afastado', TERMINATED: 'Desligado',
};

@Injectable({ providedIn: 'root' })
export class HrService {
  private readonly http = inject(HttpClient);
  private readonly api  = environment.apiUrl;

  listProfiles(companyId: string) {
    return this.http.get<HrProfile[]>(`${this.api}/hr/${companyId}/profiles`);
  }

  upsertProfile(companyId: string, userId: string, dto: Partial<HrProfile>) {
    return this.http.patch<HrProfile>(`${this.api}/hr/${companyId}/profiles/${userId}`, dto);
  }

  orgChart(companyId: string) {
    return this.http.get<HrProfile[]>(`${this.api}/hr/${companyId}/org-chart`);
  }

  birthdays(companyId: string) {
    return this.http.get<HrProfile[]>(`${this.api}/hr/${companyId}/birthdays`);
  }

  listLeave(companyId: string, userId?: string) {
    const q = userId ? `?userId=${userId}` : '';
    return this.http.get<LeaveRequest[]>(`${this.api}/hr/${companyId}/leave${q}`);
  }

  createLeave(companyId: string, dto: { type: string; startDate: string; endDate: string; reason?: string }) {
    return this.http.post<LeaveRequest>(`${this.api}/hr/${companyId}/leave`, dto);
  }

  reviewLeave(id: string, approve: boolean) {
    return this.http.patch<LeaveRequest>(`${this.api}/hr/leave/${id}/review`, { approve });
  }

  cancelLeave(id: string) {
    return this.http.patch<LeaveRequest>(`${this.api}/hr/leave/${id}/cancel`, {});
  }

  clockIn(companyId: string, type: string, note?: string) {
    return this.http.post<TimeRecord>(`${this.api}/hr/${companyId}/time-records`, { type, note });
  }

  myRecords(companyId: string, date?: string) {
    const q = date ? `?date=${date}` : '';
    return this.http.get<TimeRecord[]>(`${this.api}/hr/${companyId}/time-records/me${q}`);
  }

  allRecords(companyId: string, date?: string) {
    const q = date ? `?date=${date}` : '';
    return this.http.get<TimeRecord[]>(`${this.api}/hr/${companyId}/time-records/all${q}`);
  }
}
