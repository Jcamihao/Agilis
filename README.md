# Agilis — Plataforma de Gestão Operacional

Plataforma moderna de gestão operacional inspirada em ClickUp, Linear, Jira e Notion. Multi-tenant, full-stack, com IA embarcada.

## Stack

| Camada | Tecnologias |
|--------|------------|
| **Backend** | NestJS 10 · Prisma 5 · PostgreSQL · Redis · JWT |
| **Frontend** | Angular 16 · Angular Material · TailwindCSS · Angular CDK |
| **IA** | Selah IA (serviço interno da codeStage; prompts, provedor e modelo ficam lá) |
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
| Selah IA | `SELAH_IA_BASE_URL` (ex.: http://localhost:3010) | chave `AgilisBack` |

---

## Módulos e Funcionalidades

### Núcleo Operacional
- **Kanban Board** — drag-and-drop, colunas customizáveis, filtros, swimlanes
- **Lista de Tarefas** — view tabular com ordenação, filtros avançados, edição inline
- **Calendário** — views mês/semana/dia, tarefas por data de vencimento, exportação iCal (.ics)
- **Sprint Planning** — drag-and-drop de tarefas entre sprints, burndown chart SVG (ideal vs real)
- **Minhas Tarefas** — fila pessoal com filtros de status/prioridade

### Produtividade
- **Busca Global** (⌘K) — modal de busca universal: tarefas, projetos, membros
- **Ações em Massa** — seleção múltipla no kanban + barra flutuante (mover status, excluir)
- **Templates de Tarefa** — CRUD de templates corporativos, aplicar template no kanban
- **Recorrência de Tarefas** — DAILY/WEEKLY/BIWEEKLY/MONTHLY, cron diário recria tarefas DONE
- **Aprovações** — fluxo de aprovação com múltiplos aprovadores e etapas
- **Time Tracking** — apontamento de horas por tarefa + registro de ponto (entrada/saída)

### Inteligência & Analytics
- **Assistente IA** — chat via Selah IA, contexto do workspace em tempo real, resumo de projetos/tarefas, plano de ação, gargalos, sugestão de responsável
- **Portfolio Executivo** (`/portfolio`) — visão consolidada de todos os projetos: progresso %, health score, velocidade, previsão de entrega, OKR linkado, sortável/buscável
- **Brief Estratégico IA** — análise estruturada gerada por IA (Resumo Executivo, Riscos, Oportunidades, Recomendações) com métricas consolidadas
- **OKRs e Metas** — Objectives + Key Results com progress tracking
- **Health Score** — score A/B/C/D por projeto, calculado automaticamente
- **Insights** — alertas automáticos (CRON horário): tarefas atrasadas, estagnação, backlog excessivo, tarefas urgentes sem responsável
- **Workload** — carga de trabalho por membro (14 dias), sugestão de rebalanceamento via IA
- **Métricas** — KPIs por usuário, equipe e empresa

### Automações & Integrações
- **Motor de Automações** — regras "se evento X → ação Y" (CRUD completo + engine de execução)
  - Triggers: tarefa criada, status alterado, prazo vencido, comentário, atribuição
  - Ações: mudar status, atribuir usuário, notificar, criar tarefa, e-mail

### Administração
- **Relatórios** (CSV / Excel / PDF) — Tarefas, Produtividade, Auditoria, Time Tracking, OKRs
- **Auditoria** — log completo de todas as ações (quem, o quê, quando)
- **Log de Auditoria** — exportável em CSV/Excel

### Onboarding
- **Wizard de Primeiro Acesso** — 3 passos guiados: criar empresa → projeto → primeira tarefa

---

## Estrutura do Projeto

```
Agilis/
├── backend/                    # NestJS API
│   ├── src/
│   │   ├── ai/                 # Cliente do Selah IA + conversas, resumos, gargalos e brief estratégico
│   │   ├── auth/               # JWT + guards
│   │   ├── automation/         # Motor de automações + cron
│   │   ├── calendar/           # Calendário + exportação iCal
│   │   ├── companies/          # Multi-tenant
│   │   ├── dashboard-widgets/  # Widgets customizáveis
│   │   ├── health-score/       # Score automático por projeto
│   │   ├── insights/           # Insights CRON horário
│   │   ├── metrics/            # KPIs por usuário/equipe/empresa
│   │   ├── okrs/               # Objectives + Key Results
│   │   ├── projects/           # Projetos + portfolio + forecast
│   │   ├── reports/            # CSV/Excel: tarefas, produtividade, time, OKRs
│   │   ├── search/             # Busca global
│   │   ├── sprints/            # Sprint planning + burndown
│   │   ├── task-templates/     # Templates reutilizáveis
│   │   ├── tasks/              # Kanban + bulk + recorrência
│   │   ├── time-tracking/      # Apontamento de horas + ponto
│   │   └── workload/           # Carga de trabalho da equipe
│   └── prisma/
│       ├── schema.prisma       # Modelo de dados completo
│       ├── seed.ts             # Dados demo
│       └── migrations/         # Histórico de migrações
│
├── frontend/                   # Angular 16
│   └── src/app/
│       ├── features/           # Páginas (kanban, gantt, dashboard, portfolio, …)
│       ├── shared/components/  # GlobalSearch, OnboardingWizard, …
│       ├── core/
│       │   ├── services/       # Services para todos os módulos
│       │   ├── models/         # Interfaces TypeScript
│       │   └── guards/         # AuthGuard
│       └── layout/             # Sidebar, Topbar, MainLayout
│
├── docker-compose.yml          # PostgreSQL · Redis · MinIO · N8N · Uptime Kuma
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
npm run infra:logs       # Ver logs de todos os containers
```

---

## Versão

**v2.5.0** — Redução de escopo: produto focado em gestão de projetos/tarefas.

Changelog:
- **v3.3.0** — Remoção de Wiki de Projetos, Centro de Processos e Webhooks (editor de documentos, fluxos BPM/checklist e integrações de saída fora do escopo de gestão de tarefas) e das 9 dependências Tiptap, que ficaram sem uso. Fila BullMQ de webhooks removida; a de e-mail permanece
- **v3.2.0** — Fim da auditoria ponytail: remoção de Labels e de Status Personalizados (dava pra criar, mas nenhuma tarefa podia usar), da aba "Geral" placeholder em Configurações do Projeto, de 17 rotas/métodos sem chamador (okrs summary/link, time-tracking active/my-log/update, métricas me/team, forecast por projeto, audit por entidade, custom-fields em lote, IA resumir tarefa/sugerir responsável, health-score por escopo, webhooks/events) e de 3 colunas nunca usadas
- **v3.1.1 a v3.1.4** — Remoção de 18 dependências sem uso, Angular Material (menu do usuário virou dropdown nativo; CSS global 157 kB → 65 kB), código morto e helpers de formatação unificados em `core/utils/format.ts`
- **v3.1.0** — Remoção de Gestão de Riscos, Centro de Operações, SLA e Gantt/Dependências entre tarefas (escopo focado em PM; SLA duplicava o sinal de "tarefa atrasada" sob outro nome, dependências nunca tinham UI de criação). Insights replanejado: regra de SLA trocada por "tarefa urgente sem responsável"; Health Score e Dashboard param de reimplementar a lista de Insights e passam a linkar pra ela. Relatórios e Auditoria deixam de ter uma versão duplicada mais fraca dentro de Métricas
- **v2.5.0** — Remoção de Chat em tempo real, Mural/Announcements e HR (escopo focado em PM, sem intranet/RH)
- **v2.4.0** — Remoção de Telegram, Portal do Cliente, Intake Forms e Wiki Corporativa (escopo focado em PM, sem intranet/RH/agência)
- **v2.3.2** — Correção de mapeamento Prisma (`@map`) em colunas de migrations manuais
- **v2.3.1** — Mensagens de erro genéricas na API, correção de mapeamento de `notifPreferences`
- **v2.3.0** — Portfolio Executivo, Burndown Chart SVG, Delivery Forecast, Brief Estratégico IA
- **v2.2.0** — Reports (Time Tracking + OKRs + PDF), iCal Export, Onboarding Wizard
- **v2.1.0** — Busca Global (⌘K), Ações em Massa, Templates de Tarefa, Recorrência, Gantt Dependencies
- **v2.0.0** — Sprint Planning, Gantt, Time Tracking, SLA, Automações, Workload, OKRs, Health Score, Insights, Webhooks, Chat, Wiki, Feed, HR, Portal do Cliente
- **v1.x** — Kanban, Auth, Dashboard, Projetos, Equipes
