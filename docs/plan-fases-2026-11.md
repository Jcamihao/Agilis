# Plano de fases — 2026-11 (a partir da v3.10.5)

Fonte de decisão: análise YAGNI de 2026-11-25 com o dono. Cada fase é um commit com bump de versão na raiz e linha no changelog do README (convenção do repo). Fases que dependem de acesso externo (chaves, VPS) ficam com checklist manual e pulam para a próxima.

| Fase | Entrega | Versão alvo | Status |
|---|---|---|---|
| F1 | Remover Automações (back, front, schema, migration) | v3.11.0 | ✅ `a09be86` |
| F2 | Convite: limite de tentativas em `preview`/`accept` + checklist de verificação em produção | — (código já existia) | ✅ verificado vivo; produção pendente do dono |
| F3 | Recuperação de senha (token com hash + e-mail + telas) | v3.12.0 | ✅ `056ecd6` |
| F4 | Chaves IA/e-mail em produção: checklist manual + medição de custo por mensagem de IA (código) | v3.12.1 | ✅ código; chaves pendentes do dono |
| F5 | Onboarding wizard: "usar projeto de exemplo" | v3.13.0 | ✅ 2026-11-25 |
| F6 | Portfolio: ordenação por risco + insight "conflito de prazos" | v3.14.0 | ✅ 2026-11-26 |
| F7 | Workload: navegação de semana (confirmar ausência antes) | v3.15.0 | |
| F8 | Busca global: termos recentes (Ctrl+K já existe) | v3.15.1 | |
| F9 | Multiempresa: empresa ativa visível fora da sidebar (topbar/mobile) | v3.15.2 | |
| F10 | Alinhamento docs↔app (FOUNDER_CONTEXT/README: o que existe, o que saiu, o que está sob observação até o dia 60) + HANDOFF | docs | |

**Pendências manuais do dono (não dá pra executar daqui):**
1. VPS: definir `RESEND_API_KEY` (e-mails reais) e `SELAH_IA_API_KEY`/`SELAH_IA_BASE_URL` (religar IA) + `APP_BASE_URL` com o domínio público; depois rodar o convite ponta a ponta e um `forgot-password` de verdade em produção.
2. Publicar no Selah IA a entrada `AgilisBack` em `SELAH_APP_KEYS` se ainda não existir.
3. Ao publicar os commits: `git push origin master` e deploy da VPS (migration `20261125000003_ai_usage_logs` etc. rodam no deploy).
4. Medição de custo é estimativa por caracteres até o Selah devolver `usage` na resposta do adaptador (`ai_usage_logs` já está pronto para receber números reais).

Sob observação até a decisão com dado no dia 60 dos pilotos (não cortar agora): Custom Fields, Modelos de tarefa, página Equipes, Aprovações.

## F1 — Remover Automações (v3.11.0, `feat!:`)

- Backend: apagar `src/automation/` (controller, service, engine, cron, module, enums); tirar do `app.module.ts`; remover `AUTOMATION_TRIGGERED` de `NotificationType` e os enums `AutomationTrigger`, `AutomationActionType`, `ExecutionStatus`.
- Schema: apagar `AutomationRule` e `AutomationExecution`; relações `Company.automations`, `Project.automations`, `Task.executions`.
- Migration via `prisma migrate diff` + DELETE prévio de notificações `AUTOMATION_TRIGGERED` (cast de enum falha sem isso).
- Frontend: apagar `features/automations/`, `core/services/automation.service.ts`, rota e item da sidebar.
- E-mail: `MailService` continua (notificações nativas o usam). Eventos continuam (notificações e insights consomem).
- Aceite: `npm --prefix backend run build`, testes do backend, `build:prod` do frontend, tsc noUnusedLocals nos dois.

## F2 — Convite: limite de tentativas (v3.11.1)

- **Feito em 2026-11-25 (verificação ao vivo, código já estava na v3.10.x):** limite de 30/min por IP em `preview` e `accept` confirmado ativo; fluxo testado contra o backend local: criar convite → preview público ok → token inválido 404 → registrar com `inviteToken` vira MEMBER da empresa do convite (empresa única) → revogar → preview 404 → 35 requests de preview: 29×404 + 6×429 → token cru ausente do banco (só hash).
- **Pendente manual (dono, na VPS):** gerar link pela UI em produção, aceitar com usuário novo via HTTPS, revogar, conferir rate limit. Sem bump de versão (nenhum código mudou).

## F3 — Recuperação de senha (v3.12.0)

- Migration: `PasswordResetToken` (token aleatório 32 bytes, só hash sha256 no banco, expiração 1h, usado/revogável) — mesma pattern do convite.
- `POST /auth/forgot-password` (sempre 202, sem revelar e-mail; throttled por IP), `POST /auth/reset-password` (token + senha nova; invalida todas as sessões/tokens do usuário via lista de revogação no Redis).
- E-mail via `MailService` (Resend/Noop) com link `/redefinir-senha/:token`.
- Frontend: "Esqueci minha senha" no login, página de solicitação e página de redefinição.
- Testes: fluxo feliz, token expirado, token usado, e-mail inexistente (202), rate limit.

## F4 — Chaves + medição de custo de IA (v3.12.1)

- Código: gravar em `ai_messages` os números de uso devolvidos pelo Selah (tokens/custo, JSON `usage`); sem campo no response, gravar contagem de caracteres. Endpoint/script de agregação por empresa/mês.
- Manual (dono): colocar `RESEND_API_KEY` e `SELAH_IA_API_KEY` na VPS e religar IA; rodar convite ponta a ponta em produção (checklist da F2).

## F5 — Projeto de exemplo no wizard (v3.13.0)

- No onboarding, opção "criar com projeto de exemplo": cria empresa + projeto "Primeiros passos" com ~6 tarefas em colunas diferentes, 1 sprint e datas relativas, marcadas como exemplo. Meta: primeiro Portfolio populado em < 2 minutos.

## F6 — Risco no Portfolio + conflito de prazos (v3.14.0)

- Portfolio: score simples por projeto (atrasadas, vence em ≤3 dias, sem responsável) → badge "Onde agir" ordenando a lista.
- Insight novo: ≥3 tarefas do mesmo responsável vencendo na mesma semana → `CONFLICTO_PRAZOS` (mesmo mecanismo dos insights por cron).

## F7 — Workload: semana anterior/próxima (v3.15.0)

- Confirmar que a query é fixa na semana atual; adicionar parâmetro `weekStart` no backend e setas na UI.

## F8 — Busca: termos recentes (v3.15.1)

- Guardar últimos 8 termos por usuário no `localStorage`; sugerir quando o modal abre vazio.

## F9 — Empresa ativa visível (v3.15.2)

- Hoje o nome só aparece na sidebar (gaveta no mobile). Colocar no topbar, sempre visível.

## F10 — Docs

- FOUNDER_CONTEXT/README: produto real passa a não ter Automações; Custom Fields, Modelos, Equipes e Aprovações marcados como "no app, sob observação até dia 60"; remover a pendência de recuperação de senha dos limites; HANDOFF com estado das fases e o que ficou manual (chaves).
