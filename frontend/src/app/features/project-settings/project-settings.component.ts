import { Component, OnInit, signal, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ProjectsService } from '../../core/services/projects.service';
import { ClientPortalService } from '../../core/services/client-portal.service';
import { Project, ClientPortal } from '../../core/models';
import { CustomFieldsManagerComponent } from '../../shared/components/custom-fields/custom-fields-manager.component';

type SettingsTab = 'fields' | 'portal' | 'general';

@Component({
  selector: 'ag-project-settings',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, RouterLink, CustomFieldsManagerComponent],
  templateUrl: './project-settings.component.html',
})
export class ProjectSettingsComponent implements OnInit {
  private readonly route     = inject(ActivatedRoute);
  private readonly projSvc   = inject(ProjectsService);
  private readonly portalSvc = inject(ClientPortalService);
  private readonly cdr       = inject(ChangeDetectorRef);

  projectId = signal('');
  project   = signal<Project | null>(null);
  tab       = signal<SettingsTab>('fields');

  portal        = signal<ClientPortal | null>(null);
  portalSaving  = signal(false);
  portalCopied  = signal(false);
  showPassword  = signal(false);

  // local editable portal state
  portalTitle       = signal('');
  portalAccent      = signal('#6366f1');
  portalShowKanban  = signal(true);
  portalShowTimeline = signal(true);
  portalShowTeam    = signal(true);
  portalPassword    = signal('');

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.projectId.set(id);
    this.projSvc.getOne(id).subscribe({
      next: (res: any) => { this.project.set(res?.data ?? res); this.cdr.markForCheck(); },
    });
  }

  loadPortal() {
    if (this.portal()) return;
    this.portalSvc.getOrCreate(this.projectId()).subscribe({
      next: (res: any) => {
        const p: ClientPortal = res?.data ?? res;
        this.portal.set(p);
        this.portalTitle.set(p.title ?? '');
        this.portalAccent.set(p.accentColor);
        this.portalShowKanban.set(p.showKanban);
        this.portalShowTimeline.set(p.showTimeline);
        this.portalShowTeam.set(p.showTeam);
        this.cdr.markForCheck();
      },
    });
  }

  openPortalTab() { this.tab.set('portal'); this.loadPortal(); }

  savePortal() {
    const p = this.portal();
    if (!p) return;
    this.portalSaving.set(true);
    const dto: Partial<ClientPortal> = {
      title:        this.portalTitle() || undefined,
      accentColor:  this.portalAccent(),
      showKanban:   this.portalShowKanban(),
      showTimeline: this.portalShowTimeline(),
      showTeam:     this.portalShowTeam(),
    };
    if (this.portalPassword()) (dto as any).password = this.portalPassword();
    this.portalSvc.update(this.projectId(), dto).subscribe({
      next: (res: any) => {
        this.portal.set(res?.data ?? res);
        this.portalSaving.set(false);
        this.cdr.markForCheck();
      },
      error: () => { this.portalSaving.set(false); },
    });
  }

  togglePortalEnabled() {
    const p = this.portal();
    if (!p) return;
    this.portalSvc.update(this.projectId(), { isEnabled: !p.isEnabled }).subscribe({
      next: (res: any) => { this.portal.set(res?.data ?? res); this.cdr.markForCheck(); },
    });
  }

  regenerateToken() {
    if (!confirm('Gerar novo link? O link anterior deixará de funcionar.')) return;
    this.portalSvc.regenerateToken(this.projectId()).subscribe({
      next: (res: any) => { this.portal.set(res?.data ?? res); this.cdr.markForCheck(); },
    });
  }

  copyPortalLink() {
    const p = this.portal();
    if (!p) return;
    navigator.clipboard.writeText(this.portalSvc.portalUrl(p.token)).then(() => {
      this.portalCopied.set(true);
      setTimeout(() => { this.portalCopied.set(false); this.cdr.markForCheck(); }, 2000);
      this.cdr.markForCheck();
    });
  }

  portalUrl(): string {
    const p = this.portal();
    return p ? this.portalSvc.portalUrl(p.token) : '';
  }
}
