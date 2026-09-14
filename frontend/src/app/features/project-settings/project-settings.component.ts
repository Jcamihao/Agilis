import { Component, OnInit, signal, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ProjectsService } from '../../core/services/projects.service';
import { LabelsService, Label } from '../../core/services/labels.service';
import { TaskStatusConfigService, TaskStatusConfig } from '../../core/services/task-status-config.service';
import { AuthService } from '../../core/services/auth.service';
import { Project } from '../../core/models';
import { CustomFieldsManagerComponent } from '../../shared/components/custom-fields/custom-fields-manager.component';

type SettingsTab = 'fields' | 'general' | 'labels';

@Component({
  selector: 'ag-project-settings',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, RouterLink, CustomFieldsManagerComponent],
  templateUrl: './project-settings.component.html',
})
export class ProjectSettingsComponent implements OnInit {
  private readonly route      = inject(ActivatedRoute);
  private readonly projSvc    = inject(ProjectsService);
  private readonly labelsSvc  = inject(LabelsService);
  private readonly statusSvc  = inject(TaskStatusConfigService);
  private readonly auth       = inject(AuthService);
  private readonly cdr        = inject(ChangeDetectorRef);

  projectId = signal('');
  project   = signal<Project | null>(null);
  tab       = signal<SettingsTab>('fields');

  // Labels
  labels       = signal<Label[]>([]);
  labelName    = signal('');
  labelColor   = signal('#6366f1');
  editLabelId  = signal<string | null>(null);

  // Status config
  statuses     = signal<TaskStatusConfig[]>([]);
  statusName   = signal('');
  statusColor  = signal('#6366f1');
  editStatusId = signal<string | null>(null);

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.projectId.set(id);
    this.projSvc.getOne(id).subscribe({
      next: (res: any) => { this.project.set(res?.data ?? res); this.cdr.markForCheck(); },
    });
  }

  openLabelsTab()  { this.tab.set('labels');  this.loadLabels(); }

  loadLabels() {
    const cid = this.auth.currentCompanyId();
    if (!cid) return;
    this.labelsSvc.list(cid).subscribe({ next: r => { this.labels.set(r as any ?? []); this.cdr.markForCheck(); } });
    this.statusSvc.list(cid).subscribe({ next: r => { this.statuses.set(r as any ?? []); this.cdr.markForCheck(); } });
  }

  saveLabel() {
    const cid = this.auth.currentCompanyId();
    if (!cid || !this.labelName().trim()) return;
    const edit = this.editLabelId();
    const obs = edit
      ? this.labelsSvc.update(edit, { name: this.labelName(), color: this.labelColor() })
      : this.labelsSvc.create({ companyId: cid, name: this.labelName(), color: this.labelColor() });
    obs.subscribe({ next: () => { this.labelName.set(''); this.editLabelId.set(null); this.loadLabels(); } });
  }

  editLabel(l: Label) { this.editLabelId.set(l.id); this.labelName.set(l.name); this.labelColor.set(l.color); }

  deleteLabel(id: string) {
    if (!confirm('Excluir label?')) return;
    this.labelsSvc.delete(id).subscribe({ next: () => this.loadLabels() });
  }

  saveStatus() {
    const cid = this.auth.currentCompanyId();
    if (!cid || !this.statusName().trim()) return;
    const edit = this.editStatusId();
    const obs = edit
      ? this.statusSvc.update(edit, { name: this.statusName(), color: this.statusColor() })
      : this.statusSvc.create({ companyId: cid, name: this.statusName(), color: this.statusColor(), order: this.statuses().length });
    obs.subscribe({ next: () => { this.statusName.set(''); this.editStatusId.set(null); this.loadLabels(); } });
  }

  editStatus(s: TaskStatusConfig) { this.editStatusId.set(s.id); this.statusName.set(s.name); this.statusColor.set(s.color); }

  deleteStatus(id: string) {
    if (!confirm('Excluir status?')) return;
    this.statusSvc.delete(id).subscribe({ next: () => this.loadLabels() });
  }
}
