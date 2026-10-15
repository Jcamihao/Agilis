import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ThemeService } from '../../core/services/theme.service';

const TYPEWRITER_TEXT =
  'Que bom te ver por aqui. Times organizados tendem a nos encontrar. O que vamos organizar hoje?';
const TYPE_SPEED_MS = 38;
const TYPE_START_DELAY_MS = 600;
const PILLS_REVEAL_DELAY_MS = 400;
const COPY_TOOLTIP_DURATION_MS = 1800;
const CONTACT_EMAIL = 'contato@agilis.app';

interface FeatureCard {
  icon: string;
  title: string;
  description: string;
}

interface Differentiator {
  title: string;
  description: string;
}

interface PricingPlan {
  name: string;
  tagline: string;
  features: string[];
  ctaLabel: string;
  ctaLink: string;
  highlight?: boolean;
}

@Component({
  selector: 'ag-landing',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingComponent implements OnInit, OnDestroy {
  readonly typedText = signal('');
  readonly showCursor = signal(true);
  readonly pillsVisible = signal(false);
  readonly menuOpen = signal(false);
  readonly copied = signal(false);
  readonly contactEmail = CONTACT_EMAIL;
  readonly currentYear = new Date().getFullYear();
  readonly themeSvc = inject(ThemeService);

  readonly features: FeatureCard[] = [
    {
      icon: 'view_kanban',
      title: 'Kanban Inteligente',
      description: 'Arraste, solte e acompanhe tudo em tempo real, com campos personalizados pro fluxo da sua equipe.',
    },
    {
      icon: 'sprint',
      title: 'Sprints & Calendário',
      description: 'Rode sprints com metas claras pro time inteiro, e acompanhe prazos num calendário só pra todos os projetos.',
    },
    {
      icon: 'tips_and_updates',
      title: 'Insights automáticos',
      description: 'Atrasos, tarefas paradas e backlog acumulado viram alertas prontos, sem você montar relatório.',
    },
    {
      icon: 'smart_toy',
      title: 'Assistente Agilis IA',
      description: 'Resumos, alertas de risco e sugestões — sua copiloto acompanha o que importa, sem você pedir.',
    },
    {
      icon: 'bolt',
      title: 'Automações',
      description: 'Regras sem código que disparam notificações e e-mails quando uma tarefa muda, atrasa ou é atribuída.',
    },
    {
      icon: 'insights',
      title: 'Relatórios & Portfólio',
      description: 'Visão consolidada de múltiplos projetos pra quem decide, sem precisar pedir status a ninguém.',
    },
  ];

  readonly differentiators: Differentiator[] = [
    {
      title: 'Multiempresa de verdade',
      description: 'Empresas, times e membros com permissões próprias — não é um plano único disfarçado de multiusuário.',
    },
    {
      title: 'Segurança que não expõe detalhes',
      description: 'Conexão criptografada e mensagens de erro genéricas — nada de stack trace na tela de quem não deveria ver.',
    },
    {
      title: 'Design que reduz ruído',
      description: 'Sem sombra, sem enfeite. Hierarquia clara pra você achar o que precisa em segundos, não minutos.',
    },
    {
      title: 'Claro ou escuro, sua escolha',
      description: 'Tema alternável, com a mesma consistência visual em cada tela do produto.',
    },
  ];

  readonly pricingPlans: PricingPlan[] = [
    {
      name: 'Starter',
      tagline: 'Pra times pequenos validando o fluxo.',
      features: ['Kanban, Sprints e Calendário', 'Minhas Tarefas e Notificações', '1 empresa'],
      ctaLabel: 'Testar grátis',
      ctaLink: '/auth/register',
    },
    {
      name: 'Business',
      tagline: 'Pra operações com múltiplos times e projetos.',
      features: ['Tudo do Starter', 'Automações e Portfólio', 'Múltiplas equipes e empresas'],
      ctaLabel: 'Falar com vendas',
      ctaLink: '#contato',
      highlight: true,
    },
    {
      name: 'Enterprise',
      tagline: 'Pra quem precisa de controle e suporte dedicado.',
      features: ['Tudo do Business', 'Auditoria completa', 'Suporte prioritário'],
      ctaLabel: 'Falar com vendas',
      ctaLink: '#contato',
    },
  ];

  private typeTimeoutId?: ReturnType<typeof setTimeout>;
  private typeIntervalId?: ReturnType<typeof setInterval>;
  private pillsTimeoutId?: ReturnType<typeof setTimeout>;
  private copiedTimeoutId?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    this.startTypewriter();
    this.pillsTimeoutId = setTimeout(() => this.pillsVisible.set(true), PILLS_REVEAL_DELAY_MS);
  }

  ngOnDestroy(): void {
    clearTimeout(this.typeTimeoutId);
    clearInterval(this.typeIntervalId);
    clearTimeout(this.pillsTimeoutId);
    clearTimeout(this.copiedTimeoutId);
  }

  toggleMenu(): void {
    this.menuOpen.update((v) => !v);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  copyEmail(): void {
    const finish = () => {
      this.copied.set(true);
      clearTimeout(this.copiedTimeoutId);
      this.copiedTimeoutId = setTimeout(() => this.copied.set(false), COPY_TOOLTIP_DURATION_MS);
    };
    if (navigator.clipboard) {
      navigator.clipboard.writeText(this.contactEmail).then(finish).catch(() => {
        prompt('Copiar email:', this.contactEmail);
      });
    } else {
      prompt('Copiar email:', this.contactEmail);
    }
  }

  private startTypewriter(): void {
    this.typeTimeoutId = setTimeout(() => {
      let charIndex = 0;
      this.typeIntervalId = setInterval(() => {
        if (charIndex < TYPEWRITER_TEXT.length) {
          this.typedText.update((t) => t + TYPEWRITER_TEXT.charAt(charIndex));
          charIndex++;
        } else {
          clearInterval(this.typeIntervalId);
          this.showCursor.set(false);
        }
      }, TYPE_SPEED_MS);
    }, TYPE_START_DELAY_MS);
  }
}
