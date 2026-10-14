import { Component, OnInit, signal, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ProjectsService } from '../../core/services/projects.service';
import { Project } from '../../core/models';
import { CustomFieldsManagerComponent } from '../../shared/components/custom-fields/custom-fields-manager.component';

@Component({
  selector: 'ag-project-settings',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, CustomFieldsManagerComponent],
  templateUrl: './project-settings.component.html',
})
export class ProjectSettingsComponent implements OnInit {
  private readonly route   = inject(ActivatedRoute);
  private readonly projSvc = inject(ProjectsService);
  private readonly cdr     = inject(ChangeDetectorRef);

  projectId = signal('');
  project   = signal<Project | null>(null);

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.projectId.set(id);
    this.projSvc.getOne(id).subscribe({
      next: (res: any) => { this.project.set(res?.data ?? res); this.cdr.markForCheck(); },
    });
  }
}
