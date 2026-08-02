import { Component, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { ReportsService } from '../../core/services/reports.service';

interface ReportCard {
  key: string;
  title: string;
  description: string;
  icon: string;
  color: string;
}

@Component({
  selector: 'ag-reports',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.scss']
})
export class ReportsComponent {
  private readonly auth = inject(AuthService);
  private readonly reportsService = inject(ReportsService);
  private readonly fb = inject(FormBuilder);

  downloading = signal<string | null>(null);
  downloadSuccess = signal(false);

  filterForm = this.fb.group({
    from: [''], to: [''], status: [''], priority: [''],
  });

  reportCards: ReportCard[] = [
    {
      key: 'tasks',
      title: 'Relatório de Tarefas',
      description: 'Todas as tarefas com status, prioridade, responsável e datas. Filtros aplicáveis.',
      icon: 'task_alt',
      color: '#6366f1',
    },
    {
      key: 'productivity',
      title: 'Produtividade por Usuário',
      description: 'Taxa de conclusão, tarefas atrasadas e total por membro da equipe nos últimos 30 dias.',
      icon: 'insights',
      color: '#10b981',
    },
    {
      key: 'audit',
      title: 'Log de Auditoria',
      description: 'Histórico completo de ações: quem fez o quê, quando e em qual entidade.',
      icon: 'policy',
      color: '#f59e0b',
    },
    {
      key: 'time-tracking',
      title: 'Time Tracking',
      description: 'Apontamentos de horas por tarefa e registros de ponto (entrada/saída) da equipe.',
      icon: 'schedule',
      color: '#06b6d4',
    },
    {
      key: 'okrs',
      title: 'OKRs e Key Results',
      description: 'Objetivos estratégicos, key results e percentual de progresso por responsável.',
      icon: 'flag',
      color: '#ec4899',
    },
  ];

  printPdf() {
    window.print();
  }

  export(reportKey: string, format: 'csv' | 'excel') {
    const companyId = this.auth.currentCompanyId();
    if (!companyId) return;

    const key = `${reportKey}_${format}`;
    this.downloading.set(key);

    const { from, to, status, priority } = this.filterForm.value;
    const filters: Record<string, string> = {};
    if (status)   filters['status']   = status;
    if (priority) filters['priority'] = priority;
    if (from)     filters['from']     = from;
    if (to)       filters['to']       = to;

    try {
      if (reportKey === 'tasks')        this.reportsService.downloadTasks(companyId, format, filters);
      if (reportKey === 'productivity') this.reportsService.downloadProductivity(companyId, format);
      if (reportKey === 'audit')        this.reportsService.downloadAudit(companyId, format, from || undefined, to || undefined);
      if (reportKey === 'time-tracking') this.reportsService.downloadTimeTracking(companyId, format, from || undefined, to || undefined);
      if (reportKey === 'okrs')         this.reportsService.downloadOkrs(companyId, format);

      setTimeout(() => {
        this.downloading.set(null);
        this.downloadSuccess.set(true);
        setTimeout(() => this.downloadSuccess.set(false), 3000);
      }, 800);
    } catch {
      this.downloading.set(null);
    }
  }
}
