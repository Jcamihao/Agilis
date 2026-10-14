# Agilis Competitive Architecture

## Product Surface

- IA Operacional: Selah IA (serviço interno) com contexto real do workspace para resumos, planos de ação, gargalos, sugestão de responsáveis e perguntas executivas.
- Health Score: pontuação 0-100 por empresa, equipe e projeto usando atraso, produtividade, backlog e inatividade.
- WhatsApp Integration: Evolution API para cobranças, lembretes e alertas manuais ou por automação.
- Process Center: processos versionados com documentação, checklist, tarefas, aprovações/automações e execuções rastreáveis.
- Insights Inteligentes: riscos, gargalos, atrasos previstos, recomendações e conquistas gerados automaticamente.

## Event Driven Design

Eventos atuais:

- `task.created`
- `task.status_changed`
- `task.assigned`
- `task.overdue`
- `comment.created`

Consumidores:

- Automation Engine executa regras e ações.
- WhatsApp é acionado por `SEND_WHATSAPP`.
- Insights roda por cron e pode evoluir para consumir eventos em fila.
- Health Score recalcula por cron e por endpoint administrativo.

Evolução para 100.000 usuários:

- Trocar EventEmitter local por BullMQ, Kafka ou RabbitMQ.
- Separar consumidores por domínio: automations-worker, insights-worker, ai-worker, whatsapp-worker.
- Idempotência por `eventId` e deduplicação por janela.
- Outbox table para persistir eventos transacionais do Prisma antes de publicar.

## NestJS Modules

- `AiModule`: chat, resumos, plano de ação, gargalos, sugestão de responsável.
- `HealthScoreModule`: score por empresa/equipe/projeto.
- `WhatsAppModule`: Evolution API, configuração e histórico.
- `ProcessCenterModule`: processos, etapas, checklists e instâncias.
- `InsightsModule`: geração automática e gestão de insights.
- `AutomationModule`: ações event-driven, incluindo WhatsApp.

## Database

Tabelas V4:

- `ai_conversations`, `ai_messages`
- `health_scores`
- `whatsapp_configs`, `whatsapp_messages`
- `processes`, `process_steps`, `checklist_items`
- `process_instances`, `process_instance_steps`, `checklist_item_answers`
- `insights`

Índices críticos:

- `health_scores(companyId, calculatedAt desc)`
- `health_scores(entityType, entityId)`
- `insights(companyId, isDismissed, createdAt desc)`
- `whatsapp_messages(configId, status)`
- `processes(companyId, status)`

## AI Strategy

- Toda a IA passa pelo Selah IA (`/v1/adapters/agilis/workspace/*`): prompts específicos do Agilis, provedor e modelo configurados no Selah, saída estruturada e validada.
- O Agilis só monta os dados do workspace, chama o Selah e persiste o histórico das conversas.
- Prompt com métricas reais e contexto resumido; temperatura baixa nas respostas operacionais.
- Persistência de histórico por conversa.
- Próximo passo: RAG com documentos do Process Center e permissões por empresa.

## Angular UI

A rota `/competitive` que reunia IA Operacional, Health Score, Insights,
Processos e WhatsApp numa aba só foi removida (v3.1.0) — era puramente um
agregador de chamadas que já existiam em `/ia` e `/process-center`, sem
dado ou lógica própria. Cada módulo abaixo continua com sua própria rota:
`/ia`, `/health-score`, `/insights`, `/process-center`.

## Scaling Plan

- PostgreSQL com índices compostos e read replicas.
- Workers horizontais para IA, WhatsApp, insights e automações.
- Cache Redis para score e dashboards.
- Rate limit por empresa, usuário e módulo.
- Filas com retry, dead-letter e backoff.
- Observabilidade com tracing por evento, métricas por worker e logs estruturados.
- Multi-tenant por `companyId` com validação em todos os serviços.
