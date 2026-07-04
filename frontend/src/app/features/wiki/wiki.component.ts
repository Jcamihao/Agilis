import {
  Component, OnInit, OnDestroy, AfterViewInit,
  signal, computed, inject, ViewChild, ElementRef,
  ChangeDetectionStrategy, ChangeDetectorRef, Input,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Placeholder from '@tiptap/extension-placeholder';
import { WikiService } from '../../core/services/wiki.service';
import { WikiPage } from '../../core/models';

@Component({
  selector: 'ag-wiki',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './wiki.component.html',
  styleUrls:   ['./wiki.component.scss'],
})
export class WikiComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('editorEl') editorEl!: ElementRef<HTMLDivElement>;

  private readonly route   = inject(ActivatedRoute);
  private readonly wikiSvc = inject(WikiService);
  private readonly cdr     = inject(ChangeDetectorRef);

  projectId   = signal('');
  tree        = signal<WikiPage[]>([]);
  activePage  = signal<WikiPage | null>(null);
  loading     = signal(true);
  saving      = signal(false);
  searchQ     = signal('');
  searchRes   = signal<WikiPage[]>([]);
  searching   = signal(false);
  showHistory = signal(false);
  editTitle   = signal(false);
  draftTitle  = signal('');

  private editor: Editor | null = null;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  // flat list for search
  readonly flatTree = computed(() => this.flatten(this.tree()));

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.projectId.set(id);
    this.loadTree();
  }

  ngAfterViewInit() { /* editor created when page selected */ }

  ngOnDestroy() {
    this.editor?.destroy();
    if (this.saveTimer) clearTimeout(this.saveTimer);
  }

  // ── Tree ───────────────────────────────────────────────────────────────────

  loadTree() {
    this.wikiSvc.getTree(this.projectId()).subscribe({
      next: (res: any) => {
        this.tree.set(res?.data ?? res ?? []);
        this.loading.set(false);
        this.cdr.markForCheck();
      },
      error: () => { this.loading.set(false); this.cdr.markForCheck(); },
    });
  }

  selectPage(page: WikiPage) {
    this.wikiSvc.getPage(this.projectId(), page.id).subscribe({
      next: (res: any) => {
        const p: WikiPage = res?.data ?? res;
        this.activePage.set(p);
        this.draftTitle.set(p.title);
        this.showHistory.set(false);
        this.editTitle.set(false);
        this.cdr.markForCheck();
        // Init/reset editor
        setTimeout(() => this.initEditor(p.content), 0);
      },
    });
  }

  createPage(parentId?: string) {
    this.wikiSvc.create(this.projectId(), { title: 'Nova Página', parentId }).subscribe({
      next: (res: any) => {
        const p: WikiPage = res?.data ?? res;
        this.loadTree();
        this.selectPage(p);
      },
    });
  }

  deletePage(id: string) {
    if (!confirm('Excluir esta página e seus filhos?')) return;
    this.wikiSvc.delete(this.projectId(), id).subscribe(() => {
      if (this.activePage()?.id === id) {
        this.activePage.set(null);
        this.editor?.destroy();
        this.editor = null;
      }
      this.loadTree();
    });
  }

  // ── Editor ─────────────────────────────────────────────────────────────────

  private initEditor(content: string) {
    if (!this.editorEl) return;
    this.editor?.destroy();

    this.editor = new Editor({
      element:    this.editorEl.nativeElement,
      extensions: [
        StarterKit,
        Underline,
        Highlight,
        TextAlign.configure({ types: ['heading', 'paragraph'] }),
        Link.configure({ openOnClick: false }),
        TaskList,
        TaskItem.configure({ nested: true }),
        Placeholder.configure({ placeholder: 'Comece a escrever…' }),
      ],
      content,
      onUpdate: () => this.scheduleSave(),
    });
    this.cdr.markForCheck();
  }

  private scheduleSave() {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.saveContent(), 1500);
  }

  saveContent() {
    const page = this.activePage();
    if (!page || !this.editor) return;
    const content = this.editor.getHTML();
    this.saving.set(true);
    this.wikiSvc.update(this.projectId(), page.id, { content }).subscribe({
      next: (res: any) => {
        const updated: WikiPage = res?.data ?? res;
        this.activePage.set({ ...page, content: updated.content, updatedAt: updated.updatedAt, updatedBy: updated.updatedBy });
        this.saving.set(false);
        this.cdr.markForCheck();
      },
      error: () => { this.saving.set(false); },
    });
  }

  saveTitle() {
    const page = this.activePage();
    if (!page) return;
    const title = this.draftTitle().trim() || 'Sem título';
    this.wikiSvc.update(this.projectId(), page.id, { title }).subscribe({
      next: (res: any) => {
        const updated: WikiPage = res?.data ?? res;
        this.activePage.set({ ...page, title: updated.title });
        this.editTitle.set(false);
        this.loadTree();
        this.cdr.markForCheck();
      },
    });
  }

  // ── Toolbar commands ───────────────────────────────────────────────────────

  cmd(action: string, value?: any) {
    if (!this.editor) return;
    const chain = this.editor.chain().focus();
    switch (action) {
      case 'bold':        chain.toggleBold().run(); break;
      case 'italic':      chain.toggleItalic().run(); break;
      case 'underline':   chain.toggleUnderline().run(); break;
      case 'strike':      chain.toggleStrike().run(); break;
      case 'highlight':   chain.toggleHighlight().run(); break;
      case 'h1':          chain.toggleHeading({ level: 1 }).run(); break;
      case 'h2':          chain.toggleHeading({ level: 2 }).run(); break;
      case 'h3':          chain.toggleHeading({ level: 3 }).run(); break;
      case 'bullet':      chain.toggleBulletList().run(); break;
      case 'ordered':     chain.toggleOrderedList().run(); break;
      case 'task':        chain.toggleTaskList().run(); break;
      case 'blockquote':  chain.toggleBlockquote().run(); break;
      case 'code':        chain.toggleCode().run(); break;
      case 'codeBlock':   chain.toggleCodeBlock().run(); break;
      case 'hr':          chain.setHorizontalRule().run(); break;
      case 'alignLeft':   chain.setTextAlign('left').run(); break;
      case 'alignCenter': chain.setTextAlign('center').run(); break;
      case 'alignRight':  chain.setTextAlign('right').run(); break;
      case 'undo':        chain.undo().run(); break;
      case 'redo':        chain.redo().run(); break;
      case 'link': {
        const url = prompt('URL do link:');
        if (url) chain.setLink({ href: url }).run();
        break;
      }
    }
    this.cdr.markForCheck();
  }

  isActive(nameOrAttrs: string | object, attrs?: object): boolean {
    return this.editor?.isActive(nameOrAttrs as any, attrs) ?? false;
  }

  // ── Search ─────────────────────────────────────────────────────────────────

  doSearch() {
    const q = this.searchQ().trim();
    if (!q) { this.searchRes.set([]); return; }
    this.searching.set(true);
    this.wikiSvc.search(this.projectId(), q).subscribe({
      next: (res: any) => {
        this.searchRes.set(res?.data ?? res ?? []);
        this.searching.set(false);
        this.cdr.markForCheck();
      },
      error: () => { this.searching.set(false); },
    });
  }

  clearSearch() { this.searchQ.set(''); this.searchRes.set([]); }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private flatten(pages: WikiPage[]): WikiPage[] {
    return pages.reduce<WikiPage[]>((acc, p) => {
      acc.push(p);
      if (p.children?.length) acc.push(...this.flatten(p.children));
      return acc;
    }, []);
  }

  trackById(_: number, p: WikiPage) { return p.id; }
}
