import { CommonModule } from '@angular/common';
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
import { FormsModule } from '@angular/forms';
import { AiService } from '../../core/services/ai.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { ProcessCenterService } from '../../core/services/process-center.service';
import { ProjectsService } from '../../core/services/projects.service';
import { Process, Project } from '../../core/models';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  loading?: boolean;
}

@Component({
  selector: 'ag-competitive',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  templateUrl: './competitive.component.html',
  styleUrls: ['./competitive.component.scss'],
})
export class CompetitiveComponent implements OnInit, AfterViewChecked {
  private readonly auth = inject(AuthService);
  private readonly ai = inject(AiService);
  private readonly processService = inject(ProcessCenterService);
  private readonly projectsService = inject(ProjectsService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly toast   = inject(ToastService);

  @ViewChild('chatEnd') chatEnd?: ElementRef<HTMLDivElement>;
  private shouldScrollChat = false;

  // ── Toast ──────────────────────────────────────────────────────────────────

  // ── AI Chat ────────────────────────────────────────────────────────────────
  chatMessages = signal<ChatMessage[]>([]);
  chatInput = '';
  chatLoading = signal(false);
  conversationId = signal<string | undefined>(undefined);

  readonly chatSuggestions = [
    'Quais projetos estão atrasados?',
    'Quem tem mais tarefas pendentes?',
    'Como está a saúde do workspace?',
    'Quais tarefas precisam de atenção urgente?',
  ];

  // ── AI Insights ────────────────────────────────────────────────────────────
  insightModal = signal<{ title: string; content: string } | null>(null);
  insightLoading = signal<'bottlenecks' | 'actionPlan' | 'summarize' | null>(null);

  // ── Project Picker ────────────────────────────────────────────────────────
  projects = signal<Project[]>([]);
  showProjectPicker = signal(false);
  projectPickerMode = signal<'actionPlan' | 'summarize'>('actionPlan');

  // ── Processes ──────────────────────────────────────────────────────────────
  processes = signal<Process[]>([]);
  processesLoading = signal(true);
  processSearch = signal('');
  showCreateProcess = signal(false);
  openMenuId = signal<string | null>(null);
  processName = '';
  processDescription = '';

  filteredProcesses = computed(() => {
    const q = this.processSearch().toLowerCase().trim();
    if (!q) return this.processes();
    return this.processes().filter((p) => p.name.toLowerCase().includes(q));
  });

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  ngOnInit() {
    this.load();
    document.addEventListener('click', () => this.openMenuId.set(null));
  }

  ngAfterViewChecked() {
    if (this.shouldScrollChat) {
      this.chatEnd?.nativeElement?.scrollIntoView({ behavior: 'smooth' });
      this.shouldScrollChat = false;
    }
  }

  private load() {
    const companyId = this.companyId();
    if (!companyId) return;

    this.processService.list(companyId).subscribe({
      next: (data) => { this.processes.set(data); this.processesLoading.set(false); },
      error: () => this.processesLoading.set(false),
    });

    this.projectsService.getAll(companyId).subscribe((p) => this.projects.set(p));
  }

  // ── AI Chat ────────────────────────────────────────────────────────────────
  sendMessage(text?: string) {
    const content = (text ?? this.chatInput).trim();
    if (!content || this.chatLoading()) return;

    this.chatInput = '';
    this.chatMessages.update((msgs) => [
      ...msgs,
      { role: 'user', content },
      { role: 'assistant', content: '', loading: true },
    ]);
    this.chatLoading.set(true);
    this.shouldScrollChat = true;

    this.ai.chat(this.companyId()!, content, this.conversationId()).subscribe({
      next: (res) => {
        this.conversationId.set(res.conversationId);
        this.chatMessages.update((msgs) => {
          const updated = [...msgs];
          updated[updated.length - 1] = { role: 'assistant', content: res.reply };
          return updated;
        });
        this.chatLoading.set(false);
        this.shouldScrollChat = true;
        this.cdr.markForCheck();
      },
      error: () => {
        this.chatMessages.update((msgs) => {
          const updated = [...msgs];
          updated[updated.length - 1] = {
            role: 'assistant',
            content: '❌ Erro ao processar resposta. Verifique a configuração da IA.',
          };
          return updated;
        });
        this.chatLoading.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  onChatKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  clearChat() {
    this.chatMessages.set([]);
    this.conversationId.set(undefined);
  }

  // ── AI Insights ────────────────────────────────────────────────────────────
  runBottlenecks() {
    if (this.insightLoading()) return;
    this.insightLoading.set('bottlenecks');
    this.ai.bottlenecks(this.companyId()!).subscribe({
      next: (res) => {
        this.insightLoading.set(null);
        this.insightModal.set({ title: 'Análise de Gargalos', content: res.analysis });
      },
      error: () => {
        this.insightLoading.set(null);
        this.toast.error('Erro ao analisar gargalos.');
      },
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
        next: (res) => {
          this.insightLoading.set(null);
          this.insightModal.set({ title: `Plano de Ação — ${project.name}`, content: res.plan });
        },
        error: () => { this.insightLoading.set(null); this.toast.error('Erro ao gerar plano.'); },
      });
    } else {
      this.insightLoading.set('summarize');
      this.ai.summarizeProject(project.id).subscribe({
        next: (res) => {
          this.insightLoading.set(null);
          this.insightModal.set({ title: `Resumo — ${project.name}`, content: res.summary });
        },
        error: () => { this.insightLoading.set(null); this.toast.error('Erro ao resumir projeto.'); },
      });
    }
  }

  // ── Processes ──────────────────────────────────────────────────────────────
  createProcess() {
    const companyId = this.companyId();
    const name = this.processName.trim();
    if (!companyId || !name) return;

    this.processService.create({ companyId, name, description: this.processDescription, status: 'ACTIVE' })
      .subscribe({
        next: (process) => {
          this.processes.update((items) => [process, ...items]);
          this.processName = '';
          this.processDescription = '';
          this.showCreateProcess.set(false);
          this.toast.success('Processo criado!');
        },
        error: () => this.toast.error('Erro ao criar processo.'),
      });
  }

  pauseProcess(process: Process) {
    this.openMenuId.set(null);
    this.processService.update(process.id, { status: 'DRAFT' }).subscribe({
      next: (updated) => {
        this.processes.update((list) => list.map((p) => p.id === updated.id ? updated : p));
        this.toast.success('Processo pausado.');
      },
      error: () => this.toast.error('Erro ao pausar processo.'),
    });
  }

  activateProcess(process: Process) {
    this.openMenuId.set(null);
    this.processService.update(process.id, { status: 'ACTIVE' }).subscribe({
      next: (updated) => {
        this.processes.update((list) => list.map((p) => p.id === updated.id ? updated : p));
        this.toast.success('Processo reativado!');
      },
      error: () => this.toast.error('Erro ao ativar processo.'),
    });
  }

  archiveProcess(process: Process) {
    this.openMenuId.set(null);
    this.processService.update(process.id, { status: 'ARCHIVED' }).subscribe({
      next: () => {
        this.processes.update((list) => list.filter((p) => p.id !== process.id));
        this.toast.success('Processo arquivado.');
      },
      error: () => this.toast.error('Erro ao arquivar.'),
    });
  }

  toggleProcessMenu(id: string | null, event?: Event) {
    event?.stopPropagation();
    this.openMenuId.set(this.openMenuId() === id ? null : id);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const diffDays = Math.floor((Date.now() - date.getTime()) / 86_400_000);
    if (diffDays === 0) return `Hoje, ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    if (diffDays === 1) return `Ontem`;
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  }

  private companyId() {
    return this.auth.currentCompanyId();
  }
}
