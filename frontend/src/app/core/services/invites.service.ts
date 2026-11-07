import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { CompanyInvite, CreatedCompanyInvite, InviteAcceptResult, InvitePreview } from '../models';

export type InviteValidityDays = 1 | 7 | 30;

@Injectable({ providedIn: 'root' })
export class InvitesService {
  private readonly api = inject(ApiService);

  create(companyId: string, expiresInDays: InviteValidityDays) {
    return this.api.post<CreatedCompanyInvite>('/invites', { expiresInDays }, { companyId });
  }

  list(companyId: string) {
    return this.api.get<CompanyInvite[]>('/invites', { companyId });
  }

  revoke(id: string) {
    return this.api.delete<{ revoked: boolean }>(`/invites/${id}`);
  }

  preview(token: string) {
    return this.api.get<InvitePreview>(`/invites/${encodeURIComponent(token)}/preview`);
  }

  accept(token: string) {
    return this.api.post<InviteAcceptResult>(`/invites/${encodeURIComponent(token)}/accept`, {});
  }
}
