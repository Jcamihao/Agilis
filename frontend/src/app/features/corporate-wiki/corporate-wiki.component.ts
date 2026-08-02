import {
  Component, OnInit, signal, computed,
  ChangeDetectionStrategy, ChangeDetectorRef, inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { CorporateWikiService, CorporateWikiPage } from '../../core/services/corporate-wiki.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'ag-corporate-wiki',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  templateUrl: './corporate-wiki.component.html',
  styleUrls: ['./corporate-wiki.component.scss'],
})
export class CorporateWikiComponent implements OnInit {
  private readonly svc  = inject(CorporateWikiService);
  private readonly auth = inject(AuthService);
  private readonly cdr  = inject(ChangeDetectorRef);

  pages      = signal<CorporateWikiPage[]>([]);
  activePage = signal<CorporateWikiPage | null>(null);
  loading    = signal(true);
  editing    = signal(false);
  editTitle  = signal('');
  editContent = signal('');
  showNew    = signal(false);
  newTitle   = signal('');
  saving     = signal(false);

  readonly companyId = computed(() => this.auth.currentCompanyId() ?? '');
  readonly rootPages = computed(() => this.pages().filter(p => !p.parentId));

  childrenOf(parentId: string) {
    return this.pages().filter(p => p.parentId === parentId);
  }

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.svc.list(this.companyId()).subscribe({
      next: r => {
        this.pages.set(r as any ?? []);
        this.loading.set(false);
        if (r.length > 0 && !this.activePage()) this.openPage((r as any[])[0]);
        this.cdr.markForCheck();
      },
      error: () => this.loading.set(false),
    });
  }

  openPage(page: CorporateWikiPage) {
    this.svc.getOne(page.id).subscribe({
      next: (full: any) => {
        this.activePage.set(full);
        this.editing.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  startEdit() {
    const p = this.activePage();
    if (!p) return;
    this.editTitle.set(p.title);
    this.editContent.set(p.content);
    this.editing.set(true);
  }

  saveEdit() {
    const p = this.activePage();
    if (!p) return;
    this.saving.set(true);
    this.svc.update(p.id, { title: this.editTitle().trim(), content: this.editContent() }).subscribe({
      next: (updated: any) => {
        this.activePage.set(updated);
        this.pages.update(list => list.map(pg => pg.id === updated.id ? { ...pg, title: updated.title } : pg));
        this.editing.set(false);
        this.saving.set(false);
        this.cdr.markForCheck();
      },
      error: () => this.saving.set(false),
    });
  }

  createPage() {
    const title = this.newTitle().trim();
    if (!title) return;
    this.saving.set(true);
    this.svc.create(this.companyId(), { title }).subscribe({
      next: (p: any) => {
        this.pages.update(l => [...l, p]);
        this.newTitle.set('');
        this.showNew.set(false);
        this.saving.set(false);
        this.openPage(p);
        this.cdr.markForCheck();
      },
      error: () => this.saving.set(false),
    });
  }

  deletePage(page: CorporateWikiPage) {
    if (!confirm(`Excluir "${page.title}"?`)) return;
    this.svc.delete(page.id).subscribe({
      next: () => {
        this.pages.update(l => l.filter(p => p.id !== page.id));
        if (this.activePage()?.id === page.id) this.activePage.set(null);
        this.cdr.markForCheck();
      },
    });
  }

  cancelEdit() { this.editing.set(false); }

  trackById(_: number, item: { id: string }) { return item.id; }
}
