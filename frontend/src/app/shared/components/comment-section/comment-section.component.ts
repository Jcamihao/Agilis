import {
  Component, Input, OnInit, signal, inject, ChangeDetectionStrategy, ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl, Validators } from '@angular/forms';
import { CommentsService } from '../../../core/services/comments.service';
import { AttachmentsService } from '../../../core/services/attachments.service';
import { AuthService } from '../../../core/services/auth.service';
import { Comment, Attachment, User } from '../../../core/models';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

@Component({
  selector: 'ag-comment-section',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './comment-section.component.html',
  styleUrls: ['./comment-section.component.scss']
})
export class CommentSectionComponent implements OnInit {
  @Input({ required: true }) taskId!: string;
  @Input() companyMembers: Pick<User, 'id' | 'name' | 'email'>[] = [];

  private readonly commentsService = inject(CommentsService);
  private readonly attachmentsService = inject(AttachmentsService);
  private readonly auth = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly currentUser = this.auth.user;

  loading = signal(true);
  submitting = signal(false);
  uploadingFile = signal(false);
  editingId = signal<string | null>(null);
  mentionSuggestions = signal<Pick<User, 'id' | 'name' | 'email'>[]>([]);
  comments = signal<Comment[]>([]);
  attachments = signal<Attachment[]>([]);
  pendingFiles = signal<File[]>([]);
  contentControl = new FormControl('', [Validators.required, Validators.minLength(1)]);

  private mentionQuery = '';
  private mentionStart = -1;

  ngOnInit() {
    this.commentsService.getByTask(this.taskId).subscribe({
      next: (data) => { this.comments.set(data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
    this.attachmentsService.getByTask(this.taskId).subscribe({
      next: (data) => this.attachments.set(data),
      error: () => {},
    });
  }

  onFileSelect(event: Event) {
    const files = Array.from((event.target as HTMLInputElement).files ?? []);
    if (!files.length) return;
    this.pendingFiles.update((prev) => [...prev, ...files]);
    (event.target as HTMLInputElement).value = '';
  }

  removePendingFile(index: number) {
    this.pendingFiles.update((prev) => prev.filter((_, i) => i !== index));
  }

  uploadAttachments(): Promise<void> {
    const files = this.pendingFiles();
    if (!files.length) return Promise.resolve();
    this.uploadingFile.set(true);
    return new Promise((resolve) => {
      let remaining = files.length;
      files.forEach((file) => {
        const reader = new FileReader();
        reader.onload = () => {
          const fileUrl = reader.result as string;
          this.attachmentsService.create({
            taskId: this.taskId,
            fileName: file.name,
            fileUrl,
            fileSize: file.size,
            mimeType: file.type,
          }).subscribe({
            next: (att) => {
              this.attachments.update((prev) => [att, ...prev]);
              if (--remaining === 0) { this.uploadingFile.set(false); this.pendingFiles.set([]); this.cdr.markForCheck(); resolve(); }
            },
            error: () => { if (--remaining === 0) { this.uploadingFile.set(false); resolve(); } },
          });
        };
        reader.readAsDataURL(file);
      });
    });
  }

  deleteAttachment(id: string) {
    this.attachmentsService.delete(id).subscribe({
      next: () => this.attachments.update((list) => list.filter((a) => a.id !== id)),
    });
  }

  openAttachment(url: string) { window.open(url, '_blank'); }
  isImage(mimeType: string): boolean { return mimeType.startsWith('image/'); }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  }

  async submit() {
    const content = this.contentControl.value?.trim();
    if (!content && !this.pendingFiles().length) return;

    this.submitting.set(true);
    await this.uploadAttachments();

    if (!content) { this.submitting.set(false); return; }

    this.commentsService.create(this.taskId, content).subscribe({
      next: (comment) => {
        this.comments.update((list) => [...list, comment]);
        this.contentControl.reset();
        this.submitting.set(false);
        this.mentionSuggestions.set([]);
        this.cdr.markForCheck();
      },
      error: () => this.submitting.set(false),
    });
  }

  startEdit(comment: Comment) {
    this.editingId.set(comment.id);
  }

  cancelEdit() { this.editingId.set(null); }

  saveEdit(id: string, content: string) {
    if (!content.trim()) return;
    this.commentsService.update(id, content.trim()).subscribe({
      next: (updated) => {
        this.comments.update((list) => list.map((c) => c.id === id ? updated : c));
        this.editingId.set(null);
      },
    });
  }

  deleteComment(id: string) {
    this.commentsService.delete(id).subscribe({
      next: () => this.comments.update((list) => list.filter((c) => c.id !== id)),
    });
  }

  onInput(event: Event) {
    const el = event.target as HTMLTextAreaElement;
    const value = el.value;
    const pos = el.selectionStart;

    // Detectar @mention sendo digitado
    const textBefore = value.slice(0, pos);
    const match = textBefore.match(/@([a-zA-ZÀ-ú0-9._-]*)$/);

    if (match) {
      this.mentionQuery = match[1].toLowerCase();
      this.mentionStart = textBefore.lastIndexOf('@');
      const suggestions = this.companyMembers.filter(
        (u) =>
          u.name.toLowerCase().includes(this.mentionQuery) &&
          u.id !== this.currentUser()?.id,
      ).slice(0, 5);
      this.mentionSuggestions.set(suggestions);
    } else {
      this.mentionSuggestions.set([]);
      this.mentionStart = -1;
    }
  }

  insertMention(user: Pick<User, 'id' | 'name' | 'email'>) {
    const current = this.contentControl.value ?? '';
    const before = current.slice(0, this.mentionStart);
    const after = current.slice(this.mentionStart + 1 + this.mentionQuery.length);
    this.contentControl.setValue(`${before}@${user.name} ${after}`);
    this.mentionSuggestions.set([]);
  }

  renderMentions(content: string): string {
    return content.replace(
      /@([a-zA-ZÀ-ú0-9._-]+)/g,
      '<span class="text-primary-600 font-medium bg-primary-50 px-1 rounded">@$1</span>',
    );
  }

  isAuthor(comment: Comment): boolean {
    return comment.authorId === this.currentUser()?.id;
  }

  timeAgo(date: string): string {
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ptBR });
  }
}
