import {
  Component, signal, inject, OnInit,
  ChangeDetectionStrategy, ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { TimeTrackingService, ProjectTimeReport } from '../../core/services/time-tracking.service';
import { ProjectsService } from '../../core/services/projects.service';
import { Project } from '../../core/models';

@Component({
  selector: 'ag-time-report',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink],
  templateUrl: './time-report.component.html',
})
export class TimeReportComponent implements OnInit {
  private readonly route    = inject(ActivatedRoute);
  private readonly timeSvc  = inject(TimeTrackingService);
  private readonly projSvc  = inject(ProjectsService);
  private readonly cdr      = inject(ChangeDetectorRef);

  projectId = signal('');
  project   = signal<Project | null>(null);
  report    = signal<ProjectTimeReport | null>(null);
  loading   = signal(true);
  activeTab = signal<'tasks' | 'users' | 'log'>('tasks');

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.projectId.set(id);
    this.projSvc.getOne(id).subscribe({ next: (p) => { this.project.set(p); this.cdr.markForCheck(); } });
    this.load(id);
  }

  private load(id: string) {
    this.loading.set(true);
    this.timeSvc.projectReport(id).subscribe({
      next: (r) => { this.report.set(r); this.loading.set(false); this.cdr.markForCheck(); },
      error: () => this.loading.set(false),
    });
  }

  fmt(min: number) { return this.timeSvc.formatDuration(min); }

  pct(part: number, total: number): number {
    return total ? Math.round((part / total) * 100) : 0;
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    });
  }

  initials(name: string): string {
    const p = name.trim().split(' ');
    return p.length >= 2 ? p[0][0] + p[p.length - 1][0] : p[0].slice(0, 2);
  }
}
