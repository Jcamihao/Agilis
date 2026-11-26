import {
  Component, signal, inject, Output, EventEmitter, HostListener,
  ChangeDetectionStrategy, OnInit, OnDestroy, ElementRef, ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';
import { of, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SearchService, SearchResults } from '../../../core/services/search.service';
import { CompaniesService } from '../../../core/services/companies.service';
import { AuthService } from '../../../core/services/auth.service';
import { Company } from '../../../core/models';

@Component({
  selector: 'ag-global-search',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './global-search.component.html',
  styleUrls: ['./global-search.component.scss'],
})
export class GlobalSearchComponent implements OnInit, OnDestroy {
  @Output() close = new EventEmitter<void>();
  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

  private readonly searchSvc  = inject(SearchService);
  private readonly companySvc = inject(CompaniesService);
  private readonly auth       = inject(AuthService);
  private readonly router     = inject(Router);
  private readonly destroy$   = new Subject<void>();

  queryControl = new FormControl('');
  loading      = signal(false);
  results      = signal<SearchResults | null>(null);
  companyId    = signal('');

  // Últimos termos buscados (até 8), por usuário, no localStorage.
  private static readonly RECENT_MAX = 8;
  recent = signal<string[]>([]);

  readonly PRIORITY_LABEL: Record<string, string> = {
    LOW: 'Baixa', MEDIUM: 'Média', HIGH: 'Alta', CRITICAL: 'Crítica',
  };
  readonly STATUS_LABEL: Record<string, string> = {
    BACKLOG: 'Backlog', IN_PROGRESS: 'Em Progresso', IN_REVIEW: 'Em Revisão', DONE: 'Concluído',
  };
  readonly STATUS_COLOR: Record<string, string> = {
    BACKLOG: '#94a3b8', IN_PROGRESS: '#4648d4', IN_REVIEW: '#8b5cf6', DONE: '#10b981',
  };

  ngOnInit() {
    this.recent.set(this.loadRecent());

    this.companySvc.getAll().pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        const companies: Company[] = res?.data ?? res ?? [];
        if (companies.length > 0) this.companyId.set(companies[0].id);
      },
    });

    this.queryControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((q) => {
        if (!q || q.trim().length < 2 || !this.companyId()) {
          this.results.set(null);
          return of(null);
        }
        this.recordRecent(q.trim());
        this.loading.set(true);
        return this.searchSvc.search(q.trim(), this.companyId()).pipe(catchError(() => of(null)));
      }),
      takeUntil(this.destroy$),
    ).subscribe({
      next: (res: any) => {
        this.loading.set(false);
        this.results.set(res?.data ?? res ?? null);
      },
    });

    setTimeout(() => this.searchInput?.nativeElement?.focus(), 50);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('keydown.escape')
  onEscape() { this.close.emit(); }

  hasResults(): boolean {
    const r = this.results();
    if (!r) return false;
    return r.tasks.length + r.projects.length + r.members.length > 0;
  }

  isEmpty(): boolean {
    const q = this.queryControl.value ?? '';
    return q.trim().length >= 2 && !this.loading() && !this.hasResults();
  }

  goTask(projectId: string, taskId: string) {
    this.router.navigate(['/projects', projectId, 'kanban'], { queryParams: { task: taskId } });
    this.close.emit();
  }

  goProject(id: string) {
    this.router.navigate(['/projects', id, 'kanban']);
    this.close.emit();
  }

  // ── Termos recentes (localStorage, até 8 por usuário) ─────────────────────

  private recentKey(): string {
    return `agilis_search_recent_${this.auth.user()?.id ?? 'anon'}`;
  }

  private loadRecent(): string[] {
    try {
      const raw = JSON.parse(localStorage.getItem(this.recentKey()) ?? '[]');
      return Array.isArray(raw) ? raw.filter((t) => typeof t === 'string').slice(0, 8) : [];
    } catch {
      return [];
    }
  }

  private recordRecent(term: string) {
    const next = [term, ...this.recent().filter((t) => t.toLowerCase() !== term.toLowerCase())]
      .slice(0, GlobalSearchComponent.RECENT_MAX);
    this.recent.set(next);
    try { localStorage.setItem(this.recentKey(), JSON.stringify(next)); } catch { /* cota/modo privado: segue sem histórico */ }
  }

  applyRecent(term: string) {
    this.queryControl.setValue(term); // dispara o mesmo fluxo de digitação (debounce + busca)
    this.searchInput?.nativeElement?.focus();
  }

  clearRecent() {
    this.recent.set([]);
    try { localStorage.removeItem(this.recentKey()); } catch { /* idem */ }
  }

}
