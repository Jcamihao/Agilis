import {
  AfterViewChecked,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { AiService, AiConversationSummary } from '../../core/services/ai.service';
import { ProjectsService } from '../../core/services/projects.service';
import { Project } from '../../core/models';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  loading?: boolean;
}

@Component({
  selector: 'ag-ia',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  templateUrl: './ia.component.html',
  styleUrls: ['./ia.component.scss'],
})
export class IaComponent implements OnInit, AfterViewChecked {
  private readonly auth = inject(AuthService);
  private readonly ai = inject(AiService);
  private readonly projectsService = inject(ProjectsService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly toastSvc = inject(ToastService);

  readonly toast = signal<{msg: string; type: 'success' | 'error'} | null>(null);
  private showToast(msg: string, type: 'success' | 'error' = 'error') {
    this.toast.set({ msg, type });
    setTimeout(() => this.toast.set(null), 3000);
  }

  @ViewChild('chatEnd') chatEnd?: ElementRef<HTMLDivElement>;
  private shouldScroll = false;

  // ── Chat ──────────────────────────────────────────────────────────────────
  messages = signal<ChatMessage[]>([]);
  chatInput = '';
  chatLoading = signal(false);
  conversationId = signal<string | undefined>(undefined);

  readonly suggestions = [
    'Quais projetos estão com mais atrasos?',
    'Quem está sobrecarregado na equipe?',
    'Como está a taxa de conclusão do workspace?',
    'Quais tarefas precisam de atenção urgente?',
    'Resuma o status geral do workspace',
    'Quais riscos operacionais existem agora?',
  ];

  // ── Histórico ─────────────────────────────────────────────────────────────
  conversations = signal<AiConversationSummary[]>([]);
  historyLoading = signal(true);
  activeConvId = signal<string | undefined>(undefined);

  // ── Insights ──────────────────────────────────────────────────────────────
  insightModal = signal<{ title: string; content: string } | null>(null);
  insightLoading = signal<'bottlenecks' | 'actionPlan' | 'summarize' | null>(null);

  // ── Project Picker ────────────────────────────────────────────────────────
  projects = signal<Project[]>([]);
  showProjectPicker = signal(false);
  projectPickerMode = signal<'actionPlan' | 'summarize'>('actionPlan');

  // ── Toast ──────────────────────────────────────────────────────────────────

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  ngOnInit() {
    const companyId = this.companyId();
    if (!companyId) return;
    this.loadHistory(companyId);
    this.projectsService.getAll(companyId).subscribe((p) => this.projects.set(p));
  }

  ngAfterViewChecked() {
    if (this.shouldScroll) {
      this.chatEnd?.nativeElement?.scrollIntoView({ behavior: 'smooth' });
      this.shouldScroll = false;
    }
  }

  private loadHistory(companyId: string) {
    this.historyLoading.set(true);
    this.ai.getConversations(companyId).subscribe({
      next: (list) => { this.conversations.set(list); this.historyLoading.set(false); },
      error: () => this.historyLoading.set(false),
    });
  }

  // ── Chat ──────────────────────────────────────────────────────────────────
  sendMessage(text?: string) {
    const content = (text ?? this.chatInput).trim();
    if (!content || this.chatLoading()) return;

    this.chatInput = '';
    this.messages.update((msgs) => [
      ...msgs,
      { role: 'user', content },
      { role: 'assistant', content: '', loading: true },
    ]);
    this.chatLoading.set(true);
    this.shouldScroll = true;

    this.ai.chat(this.companyId()!, content, this.conversationId()).subscribe({
      next: (res) => {
        const isNew = !this.conversationId();
        this.conversationId.set(res.conversationId);
        this.activeConvId.set(res.conversationId);

        this.messages.update((msgs) => {
          const updated = [...msgs];
          updated[updated.length - 1] = { role: 'assistant', content: res.reply };
          return updated;
        });
        this.chatLoading.set(false);
        this.shouldScroll = true;

        if (isNew) this.loadHistory(this.companyId()!);
        this.cdr.markForCheck();
      },
      error: () => {
        this.messages.update((msgs) => {
          const updated = [...msgs];
          updated[updated.length - 1] = {
            role: 'assistant',
            content: '❌ Erro ao processar a resposta. Verifique se o Ollama está rodando (`npm run ollama:up`) e se o modelo está baixado (`npm run ollama:pull`).',
          };
          return updated;
        });
        this.chatLoading.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  newChat() {
    this.messages.set([]);
    this.conversationId.set(undefined);
    this.activeConvId.set(undefined);
  }

  loadConversation(conv: AiConversationSummary) {
    if (this.activeConvId() === conv.id) return;
    this.activeConvId.set(conv.id);
    this.messages.set([{ role: 'assistant', content: '', loading: true }]);
    this.shouldScroll = true;

    this.ai.getConversation(conv.id).subscribe({
      next: (detail) => {
        this.conversationId.set(detail.id);
        this.messages.set(
          detail.messages.map((m) => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content,
          }))
        );
        this.shouldScroll = true;
        this.cdr.markForCheck();
      },
      error: () => {
        this.messages.set([]);
        this.showToast('Erro ao carregar conversa.', 'error');
      },
    });
  }

  // ── Insights ──────────────────────────────────────────────────────────────
  runBottlenecks() {
    if (this.insightLoading()) return;
    this.insightLoading.set('bottlenecks');
    this.ai.bottlenecks(this.companyId()!).subscribe({
      next: (res) => { this.insightLoading.set(null); this.insightModal.set({ title: 'Análise de Gargalos', content: res.analysis }); },
      error: () => { this.insightLoading.set(null); this.showToast('Erro ao analisar gargalos.', 'error'); },
    });
  }

  openProjectPicker(mode: 'actionPlan' | 'summarize') {
    this.projectPickerMode.set(mode);
    this.showProjectPicker.set(true);
  }

  runProjectInsight(project: Project) {
    this.showProjectPicker.set(false);
    const mode = this.projectPickerMode();

    if (mode === 'actionPlan') {
      this.insightLoading.set('actionPlan');
      this.ai.actionPlan(project.id).subscribe({
        next: (res) => { this.insightLoading.set(null); this.insightModal.set({ title: `Plano de Ação — ${project.name}`, content: res.plan }); },
        error: () => { this.insightLoading.set(null); this.showToast('Erro ao gerar plano.', 'error'); },
      });
    } else {
      this.insightLoading.set('summarize');
      this.ai.summarizeProject(project.id).subscribe({
        next: (res) => { this.insightLoading.set(null); this.insightModal.set({ title: `Resumo — ${project.name}`, content: res.summary }); },
        error: () => { this.insightLoading.set(null); this.showToast('Erro ao resumir projeto.', 'error'); },
      });
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  timeAgo(dateStr: string) {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: ptBR });
  }

  lastMessage(conv: AiConversationSummary): string {
    const msg = conv.messages?.[0];
    if (!msg) return 'Sem mensagens';
    return msg.content.slice(0, 55) + (msg.content.length > 55 ? '…' : '');
  }

  private companyId() { return this.auth.currentCompanyId(); }
}
