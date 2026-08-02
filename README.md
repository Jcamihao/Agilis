# Agilis — Plataforma de Gestão Operacional

Plataforma moderna de gestão operacional inspirada em ClickUp, Linear, Jira e Notion. Multi-tenant, full-stack, com IA embarcada.

## Stack

| Camada | Tecnologias |
|--------|------------|
| **Backend** | NestJS 10 · Prisma 5 · PostgreSQL · Redis · JWT |
| **Frontend** | Angular 16 · Angular Material · TailwindCSS · Angular CDK |
| **IA** | Ollama (Mistral/Llama) — local, sem custo de API |
| **Infra** | Docker Compose · MinIO · N8N · Uptime Kuma |

## Início Rápido

```bash
# Setup completo (instala deps, sobe infra, roda migrations e seed)
npm run setup

# Desenvolvimento (backend + frontend simultâneos)
npm run dev
```

### URLs

| Serviço | URL | Credenciais |
|---------|-----|------------|
| Frontend | http://localhost:4200 | admin@agilis.app / Admin@123 |
| Backend API | http://localhost:3000/api/v1 | JWT Bearer |
| Swagger | http://localhost:3000/docs | — |
| Prisma Studio | `npm run db:studio` | — |
| N8N | http://localhost:5678 | admin / agilis123 |
| Ollama | http://localhost:11434 | — |

---

## Módulos e Funcionalidades

### Núcleo Operacional
- **Kanban Board** — drag-and-drop, colunas customizáveis, filtros, swimlanes
- **Lista de Tarefas** — view tabular com ordenação, filtros avançados, edição inline
- **Gantt Chart** — timeline com dependências visuais (setas SVG), bloqueios e tipos de dependência
- **Calendário** — views mês/semana/dia, tarefas por data de vencimento, exportação iCal (.ics)
- **Sprint Planning** — drag-and-drop de tarefas entre sprints, burndown chart SVG (ideal vs real)
- **Minhas Tarefas** — fila pessoal com filtros de status/prioridade

### Produtividade
- **Busca Global** (⌘K) — modal de busca universal: tarefas, projetos, membros, wiki
- **Ações em Massa** — seleção múltipla no kanban + barra flutuante (mover status, excluir)
- **Templates de Tarefa** — CRUD de templates corporativos, aplicar template no kanban
- **Recorrência de Tarefas** — DAILY/WEEKLY/BIWEEKLY/MONTHLY, cron diário recria tarefas DONE
- **Aprovações** — fluxo de aprovação com múltiplos aprovadores e etapas
- **Time Tracking** — apontamento de horas por tarefa + registro de ponto (entrada/saída)
- **SLA** — configuração e monitoramento de SLAs por prioridade/projeto

### Comunicação & Conhecimento
- **Chat em Tempo Real** — WebSocket, salas por projeto e gerais, histórico
- **Wiki de Projetos** — editor rich text por projeto
- **Wiki Corporativa** — base de conhecimento da empresa
- **Mural (Feed)** — announcements e updates da empresa
- **Portal do Cliente** — link público por projeto para clientes acompanharem progresso

### Inteligência & Analytics
- **Assistente IA** — chat com Ollama (Mistral), contexto do workspace em tempo real, resumo de projetos/tarefas, plano de ação, gargalos, sugestão de responsável
- **Portfolio Executivo** (`/portfolio`) — visão consolidada de todos os projetos: progresso %, health score, velocidade, previsão de entrega, riscos, OKR linkado, sortável/buscável
- **Brief Estratégico IA** — análise estruturada gerada por IA (Resumo Executivo, Riscos, Oportunidades, Recomendações) com métricas consolidadas
- **OKRs e Metas** — Objectives + Key Results com progress tracking
- **Health Score** — score A/B/C/D por projeto, calculado automaticamente
- **Insights** — alertas automáticos (CRON horário): tarefas atrasadas, estagnação, backlog excessivo, SLA
- **Workload** — carga de trabalho por membro (14 dias), sugestão de rebalanceamento via IA
- **Métricas** — KPIs por usuário, equipe e empresa
- **Risks** — matriz de riscos (impacto × probabilidade), mitigação e acompanhamento

### Automações & Integrações
- **Motor de Automações** — regras "se evento X → ação Y" (CRUD completo + engine de execução)
  - Triggers: tarefa criada, status alterado, prazo vencido, comentário, atribuição
  - Ações: mudar status, atribuir usuário, notificar, criar tarefa, e-mail, Telegram
- **Webhooks** — HTTP callbacks para eventos do sistema
- **N8N** — integração via webhook para automações externas
- **Telegram** — notificações via bot

### Administração
- **Relatórios** (CSV / Excel / PDF) — Tarefas, Produtividade, Auditoria, Time Tracking, OKRs
- **Auditoria** — log completo de todas as ações (quem, o quê, quando)
- **Log de Auditoria** — exportável em CSV/Excel
- **HR** — gestão de colaboradores, cargos e departamentos
- **Centro de Processos** — fluxos de processo com etapas e checklists
- **Centro de Operações** — monitoramento e indicadores operacionais
- **SLA** — configuração de SLAs com breach detection
- **Intake Forms** — formulários públicos para solicitação de tarefas/projetos

### Onboarding
- **Wizard de Primeiro Acesso** — 3 passos guiados: criar empresa → projeto → primeira tarefa

---

## Estrutura do Projeto

```
Agilis/
├── backend/                    # NestJS API
│   ├── src/
│   │   ├── ai/                 # Ollama chat + resumos + brief estratégico
│   │   ├── auth/               # JWT + guards
│   │   ├── automation/         # Motor de automações + cron
│   │   ├── calendar/           # Calendário + exportação iCal
│   │   ├── chat/               # WebSocket em tempo real
│   │   ├── companies/          # Multi-tenant
│   │   ├── dashboard-widgets/  # Widgets customizáveis
│   │   ├── health-score/       # Score automático por projeto
│   │   ├── insights/           # Insights CRON horário
│   │   ├── metrics/            # KPIs por usuário/equipe/empresa
│   │   ├── okrs/               # Objectives + Key Results
│   │   ├── projects/           # Projetos + portfolio + forecast
│   │   ├── reports/            # CSV/Excel: tarefas, produtividade, time, OKRs
│   │   ├── risks/              # Gestão de riscos
│   │   ├── search/             # Busca global
│   │   ├── sprints/            # Sprint planning + burndown
│   │   ├── task-templates/     # Templates reutilizáveis
│   │   ├── tasks/              # Kanban + bulk + recorrência
│   │   ├── time-tracking/      # Apontamento de horas + ponto
│   │   ├── webhooks/           # HTTP callbacks
│   │   └── workload/           # Carga de trabalho da equipe
│   └── prisma/
│       ├── schema.prisma       # Modelo de dados completo
│       ├── seed.ts             # Dados demo
│       └── migrations/         # Histórico de migrações
│
├── frontend/                   # Angular 16
│   └── src/app/
│       ├── features/           # Páginas (kanban, gantt, dashboard, portfolio, …)
│       ├── shared/components/  # GlobalSearch, OnboardingWizard, ChatPanel, …
│       ├── core/
│       │   ├── services/       # Services para todos os módulos
│       │   ├── models/         # Interfaces TypeScript
│       │   └── guards/         # AuthGuard
│       └── layout/             # Sidebar, Topbar, MainLayout
│
├── docker-compose.yml          # PostgreSQL · Redis · MinIO · N8N · Ollama · Uptime Kuma
└── package.json                # Scripts raiz (dev, build, setup, …)
```

---

## Scripts Úteis

```bash
npm run dev              # Backend + Frontend simultâneos
npm run build:all        # Build completo
npm run db:migrate       # Rodar migrations pendentes
npm run db:seed          # Popular banco com dados demo
npm run db:reset         # Reset completo (perda de dados)
npm run db:studio        # Abrir Prisma Studio
npm run n8n:up           # Subir N8N
npm run ollama:up        # Subir Ollama
npm run ollama:pull      # Baixar modelo Mistral
npm run infra:logs       # Ver logs de todos os containers
```

---

## Versão

**v2.3.0** — Ciclos imediato + médio + estratégico completos.

Changelog:
- **v2.3.0** — Portfolio Executivo, Burndown Chart SVG, Delivery Forecast, Brief Estratégico IA
- **v2.2.0** — Reports (Time Tracking + OKRs + PDF), iCal Export, Onboarding Wizard
- **v2.1.0** — Busca Global (⌘K), Ações em Massa, Templates de Tarefa, Recorrência, Gantt Dependencies
- **v2.0.0** — Sprint Planning, Gantt, Time Tracking, SLA, Automações, Workload, OKRs, Health Score, Insights, Webhooks, Chat, Wiki, Feed, HR, Portal do Cliente
- **v1.x** — Kanban, Auth, Dashboard, Projetos, Equipes
