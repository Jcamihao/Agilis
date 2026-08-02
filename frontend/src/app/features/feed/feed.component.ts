import {
  Component, OnInit, signal, computed,
  ChangeDetectionStrategy, ChangeDetectorRef, inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FeedService, FeedPost, FeedComment } from '../../core/services/feed.service';
import { AttachmentsService } from '../../core/services/attachments.service';
import { AuthService } from '../../core/services/auth.service';

const EMOJIS = ['👍', '❤️', '😂', '🎉', '👏', '🔥'];
const PAGE_SIZE = 10;

@Component({
  selector: 'ag-feed',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  templateUrl: './feed.component.html',
  styleUrls: ['./feed.component.scss'],
})
export class FeedComponent implements OnInit {
  private readonly svc         = inject(FeedService);
  private readonly attachSvc   = inject(AttachmentsService);
  private readonly auth        = inject(AuthService);
  private readonly cdr         = inject(ChangeDetectorRef);

  readonly emojis = EMOJIS;

  // ── Post list ─────────────────────────────────────────────────────────────
  posts        = signal<FeedPost[]>([]);
  loading      = signal(true);
  loadingMore  = signal(false);
  total        = signal(0);
  currentPage  = signal(1);
  hasMore      = computed(() => this.posts().length < this.total());

  // ── Compose ───────────────────────────────────────────────────────────────
  postText        = signal('');
  saving          = signal(false);
  uploadingImage  = signal(false);
  pendingImage    = signal<File | null>(null);
  imagePreview    = signal<string | null>(null);

  // ── Interactions ──────────────────────────────────────────────────────────
  expandedComments = signal<Set<string>>(new Set());
  commentTexts     = signal<Record<string, string | undefined>>({});
  emojiPickerFor   = signal<string | null>(null);

  readonly me        = computed(() => this.auth.user());
  readonly companyId = computed(() => this.auth.currentCompanyId() ?? '');

  ngOnInit() { this.load(); }

  // ── Load / pagination ─────────────────────────────────────────────────────

  load() {
    this.loading.set(true);
    this.currentPage.set(1);
    this.svc.list(this.companyId(), 1, PAGE_SIZE).subscribe({
      next: (res: any) => {
        const r = res?.data ?? res;
        this.posts.set(r.posts ?? []);
        this.total.set(r.total ?? 0);
        this.loading.set(false);
        this.cdr.markForCheck();
      },
      error: () => { this.loading.set(false); this.cdr.markForCheck(); },
    });
  }

  loadMore() {
    if (this.loadingMore() || !this.hasMore()) return;
    const next = this.currentPage() + 1;
    this.loadingMore.set(true);
    this.svc.list(this.companyId(), next, PAGE_SIZE).subscribe({
      next: (res: any) => {
        const r = res?.data ?? res;
        this.posts.update(list => [...list, ...(r.posts ?? [])]);
        this.total.set(r.total ?? this.total());
        this.currentPage.set(next);
        this.loadingMore.set(false);
        this.cdr.markForCheck();
      },
      error: () => { this.loadingMore.set(false); this.cdr.markForCheck(); },
    });
  }

  // ── Compose ───────────────────────────────────────────────────────────────

  onImageSelect(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.pendingImage.set(file);
    const url = URL.createObjectURL(file);
    this.imagePreview.set(url);
    (event.target as HTMLInputElement).value = '';
    this.cdr.markForCheck();
  }

  removeImage() {
    const prev = this.imagePreview();
    if (prev) URL.revokeObjectURL(prev);
    this.pendingImage.set(null);
    this.imagePreview.set(null);
  }

  createPost() {
    const txt = this.postText().trim();
    const file = this.pendingImage();
    if (!txt && !file) return;
    this.saving.set(true);

    const doCreate = (imageUrl?: string) => {
      this.svc.create(this.companyId(), { content: txt, imageUrl }).subscribe({
        next: (res: any) => {
          const p: FeedPost = res?.data ?? res;
          this.posts.update(list => [p, ...list]);
          this.total.update(t => t + 1);
          this.postText.set('');
          this.removeImage();
          this.saving.set(false);
          this.cdr.markForCheck();
        },
        error: () => { this.saving.set(false); this.cdr.markForCheck(); },
      });
    };

    if (file) {
      this.uploadingImage.set(true);
      this.attachSvc.uploadFile(file).subscribe({
        next: (up) => { this.uploadingImage.set(false); doCreate(up.url); },
        error: () => { this.uploadingImage.set(false); doCreate(); },
      });
    } else {
      doCreate();
    }
  }

  // ── Post actions ──────────────────────────────────────────────────────────

  deletePost(id: string) {
    if (!confirm('Excluir post?')) return;
    this.svc.delete(id).subscribe({
      next: () => {
        this.posts.update(l => l.filter(p => p.id !== id));
        this.total.update(t => Math.max(0, t - 1));
        this.cdr.markForCheck();
      },
    });
  }

  react(post: FeedPost, emoji: string) {
    this.emojiPickerFor.set(null);
    const uid = this.me()?.id ?? '';
    const hasIt = post.reactions.some(r => r.userId === uid && r.emoji === emoji);
    this.posts.update(list => list.map(p => p.id !== post.id ? p : {
      ...p,
      reactions: hasIt
        ? p.reactions.filter(r => !(r.userId === uid && r.emoji === emoji))
        : [...p.reactions, { id: 'tmp', userId: uid, emoji }],
    }));
    this.svc.react(post.id, emoji).subscribe();
    this.cdr.markForCheck();
  }

  toggleComments(postId: string) {
    this.expandedComments.update(s => {
      const n = new Set(s);
      n.has(postId) ? n.delete(postId) : n.add(postId);
      return n;
    });
  }

  setCommentText(postId: string, val: string) {
    this.commentTexts.update(m => ({ ...m, [postId]: val }));
  }

  sendComment(post: FeedPost) {
    const txt = (this.commentTexts()[post.id] ?? '').trim();
    if (!txt) return;
    this.svc.comment(post.id, txt).subscribe({
      next: (res: any) => {
        const c: FeedComment = res?.data ?? res;
        this.posts.update(list => list.map(p => p.id !== post.id ? p : { ...p, comments: [...p.comments, c] }));
        this.commentTexts.update(m => ({ ...m, [post.id]: '' }));
        this.cdr.markForCheck();
      },
    });
  }

  deleteComment(post: FeedPost, comment: FeedComment) {
    this.svc.deleteComment(comment.id).subscribe({
      next: () => {
        this.posts.update(list => list.map(p => p.id !== post.id ? p : {
          ...p, comments: p.comments.filter(c => c.id !== comment.id),
        }));
        this.cdr.markForCheck();
      },
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  reactionSummary(post: FeedPost): { emoji: string; count: number; mine: boolean }[] {
    const uid = this.me()?.id ?? '';
    const map = new Map<string, { count: number; mine: boolean }>();
    for (const r of post.reactions) {
      const cur = map.get(r.emoji) ?? { count: 0, mine: false };
      map.set(r.emoji, { count: cur.count + 1, mine: cur.mine || r.userId === uid });
    }
    return [...map.entries()].map(([emoji, v]) => ({ emoji, ...v }));
  }

  initials(name: string): string {
    const p = name.trim().split(' ');
    return p.length >= 2 ? p[0][0] + p[p.length - 1][0] : p[0].slice(0, 2);
  }

  isOwn(authorId: string) { return authorId === (this.me()?.id ?? ''); }

  trackById(_: number, item: { id: string }) { return item.id; }
}
