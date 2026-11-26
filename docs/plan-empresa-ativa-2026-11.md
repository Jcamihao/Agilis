# Plano: empresa ativa, remoções (IA e Portfólio), importação em massa

Criado em 2026-11-26, reorganizado em fases no mesmo dia. Status: **PLANEJAMENTO — nenhum código escrito.** Nenhuma fase começa antes de o dono validar as decisões da seção 4.

## 1. Pedidos do dono (2026-11-26)

1. Menu "⋮" da tela Membros fica cortado.
2. **Trocar** a empresa em que atua e **deletar** empresa (tela Empresas).
3. **Empresa ativa com switch**: com a codeStage ativa, todas as páginas mostram só o que é dela; ao trocar para a HEX360, só o dela.
4. Opção **Geral** no switch: mostra tarefas, planos e afins de todas as empresas, cada item identificado, com filtro por empresa.
5. **Remover** as telas **Assistente de IA** e **Portfólio Executivo**.
6. **Importação de várias tasks de uma vez** por arquivo **CSV, XLS ou XLSX**.
7. **Auditoria do design system** nos modos claro e escuro: achar tudo que não muda de aparência no escuro (o dono já viu ocorrências) e corrigir.
8. **Modelo de ML para estatísticas do app**, usado para identificar gargalos e melhorar o mapa de calor (Carga de Trabalho), os gráficos e os dashboards.
9. **Minhas Tarefas vira um Kanban** com as tarefas do usuário.
10. Novo item **Kanban** no menu "Principal" (abaixo de Calendário ou onde ficar melhor), levando ao Kanban de **toda a equipe**, com as colunas **Backlog, Em dev, Testes, Validação e Finalizado**.

## 2. Estado atual (lido no código, 2026-11-26)

- A "empresa ativa" é sempre `user.companies[0]` (`auth.service.ts:20`, `sidebar.component.ts:38`, `topbar.component.ts:29`, `diagnostico.component.ts:35`, `global-search.component.ts:59`). Não existe troca.
- **Risco principal:** o backend também decide a empresa sozinho. `jwt.strategy.ts:48` põe `req.user.companyId = user.companies[0]`. Workload e telemetria leem isso. Se o front trocar de empresa e o backend continuar na primeira, as telas misturam empresas. A troca precisa chegar ao backend.
- A maioria dos controllers recebe `companyId` do front (teams, calendar, ai, users, search, projects). Alguns podem não conferir se o usuário é membro daquela empresa (a conferir na Fase 3).
- `companies.controller.ts` não tem DELETE. O schema tem `onDelete: Cascade` de Company para UserCompany, Project, Team, Insight etc.: apagar a empresa apaga tudo dela.
- **Assistente IA:** tela `features/ia`, rota `/ia`, serviço `core/services/ai.service.ts`, backend `ai/` (`POST chat`, `conversations`, `summarize/project`, `action-plan`, `bottlenecks`, `strategic-brief`, `usage`), tabelas `AiConversation`/`AiMessage`/`AiUsageLog`. **O Workload também usa o cliente Selah** (`workload.service.ts:4`, sugestão de redistribuição) e o `portfolio.component.ts` chama o `ai.service` do front.
- **Portfólio Executivo:** tela `features/portfolio`, rota `/portfolio`, `portfolio.service.ts`, backend `GET /projects/portfolio` (`projects.service.ts:222`, com sinais de risco da F6). Citado no onboarding (tarefa de exemplo), README e FOUNDER_CONTEXT.
- **Sidebar** grupo "Inteligência": Portfolio Executivo, Assistente IA, Insights, Carga de Trabalho.
- **Importação:** o backend já tem `exceljs` (usado em `reports.service.ts`) e o módulo `upload/` (multer, 20 MB, MIME de planilha já permitido). `exceljs` lê CSV e XLSX, **não lê XLS** (formato binário antigo). Não existe importador de tarefas.
- **Dados que um modelo pode usar hoje:** `Task` (status, prioridade, `startDate`, `dueDate`, `createdAt`, `updatedAt`, responsável, projeto, sprint, subtarefas, recorrência), `TimeEntry`, `Activity` (histórico; a conferir se registra cada mudança de status com data, que é o que permite medir tempo parado em cada coluna), `Comment`, `TaskApproval`, `ProductEvent`. Já existem `Insight` (+ `insights.service.ts`), Carga de Trabalho (mapa de calor de 14 dias), Relatórios (tarefas, produtividade, tempo) e o Dashboard, todos por regras fixas, sem modelo. Não há histórico longo: o produto ainda está em pilotos, então volume de dados é pequeno.
- **Kanban hoje:** só existe por projeto (`/projects/:id/kanban`, `kanban.component`, 939 linhas ts + 1693 html, drag-drop CDK). O enum `TaskStatus` tem **4 valores** (`BACKLOG`, `IN_PROGRESS`, `IN_REVIEW`, `DONE`); o Kanban mostra "Em Progresso" e "Em Revisão". **O pedido tem 5 colunas, então faltam dois status** (Testes e Validação): é mudança de enum no banco, que afeta tarefas, relatórios, dashboard, calendário, aprovações, modelos de tarefa, seed e as fases de importação e estatística. Minhas Tarefas é uma lista (`my-tasks.component`, 321 linhas html). Menu "Principal" (`sidebar.component.ts`, `mainNav`): Dashboard, Minhas Tarefas, Aprovações, Calendário. O handoff registra "status personalizados" como removido de propósito; aqui o conjunto de colunas é fixo e igual para todos, não personalizável.
- **Tema:** claro é o padrão; escuro liga com `[data-theme="dark"]` no `<html>` (`theme.service.ts`, `localStorage` `agilis-theme`). As cores vêm de variáveis CSS (`--p-*`, `--f-*`, `--c-*`) mapeadas no `tailwind.config` (`darkMode: ['selector', '[data-theme="dark"]']`; `styles/main.scss`). Varredura estática rápida de 2026-11-26: **68 arquivos** com cor literal (`#hex`, `rgb()`/`rgba()`) e **26 arquivos** com classes de paleta fixa do Tailwind (`bg-white`, `text-gray-*`, `border-slate-*` etc.); só **1 arquivo** usa `dark:`. Esses são os suspeitos de não acompanhar o tema escuro. Ainda não conferi tela por tela.
- Menu "⋮" de Membros (`members.component.ts`): dropdown "ALTERAR PAPEL" cortado, provável `overflow` do container da lista.

## 3. Fases

Regras de toda fase: branch `feature/<nome>` ou `fix/<nome>` a partir da `develop` atualizada; merge `--no-ff` na `develop`; handoff atualizado logo depois; relatório de revisão em `.superpowers/sdd/<fase>/`. `master` só com pedido explícito do dono. Versão: uma minor por fase, a partir da v3.17.0, definida ao implementar.

### 3.1 Visão geral

| Bloco | Fase | Nome | Depende de | Mexe em |
|---|---|---|---|---|
| A. Correção e limpeza | 1 | Menu de Membros cortado | — | front |
| A. Correção e limpeza | 2 | Remover Assistente IA e Portfólio | — | front, back, docs |
| B. Empresas | 3 | Empresa ativa confiável no backend | 2 | back |
| B. Empresas | 4 | Excluir empresa | 3 | back, front |
| B. Empresas | 5 | Switch de empresa no front | 3 | front |
| B. Empresas | 6 | Modo Geral | 5 | back, front |
| C. Kanban | 7 | Fluxo de 5 status (Backlog, Em dev, Testes, Validação, Finalizado) | 3 | banco, back, front |
| C. Kanban | 8 | Minhas Tarefas em Kanban | 7 | front |
| C. Kanban | 9 | Kanban da equipe + item no menu Principal | 5, 7 | front, back |
| D. Importação | 10 | Importar tasks: backend | 3, 7 | back |
| D. Importação | 11 | Importar tasks: tela | 10 | front |
| E. Inteligência de dados | 12 | Base de dados e estatística (baseline) | 3, 7 | back |
| E. Inteligência de dados | 13 | Modelo de ML: gargalos e previsões | 12 | back (e Selah, ver D12) |
| E. Inteligência de dados | 14 | Mapa de calor, gráficos e dashboards com as estatísticas | 6, 13 | front, back |
| F. Qualidade visual | 15 | Auditoria claro/escuro | 2, 5, 6, 8, 9, 11, 14 | front |
| G. Fechamento | 16 | Relatório, docs, versão | todas | docs |

Ordem de execução: 1 → 2 → 3 → … → 16. A 7 (status) vem antes da importação e das estatísticas porque as duas dependem dos 5 status finais. A fase 1 e a 2 são independentes e podem ir antes de tudo. A 2 vem antes da 3 para reduzir superfície (menos telas para migrar para empresa ativa).

---

### BLOCO A — Correção e limpeza

#### Fase 1 — Menu de Membros cortado
- **Branch:** `fix/membros-menu-cortado`
- **Objetivo:** o menu "⋮" da linha do membro aparece inteiro.
- **Entrega:** corrigir o dropdown "ALTERAR PAPEL" (overflow/posição), sem mudar comportamento.
- **Pronto quando:** menu visível na primeira e na última linha, em 360 e 1280 px, claro e escuro (Chrome real).

#### Fase 2 — Remover Assistente IA e Portfólio Executivo
- **Branch:** `feature/remover-ia-portfolio` (commit `feat!:`)
- **Objetivo:** as duas telas deixam de existir, sem deixar código morto.
- **Entrega, front:** apagar `features/ia`, `features/portfolio`, `portfolio.service.ts`, uso do `ai.service` que sobrar, rotas `/ia` e `/portfolio`, itens da sidebar (o grupo "Inteligência" fica com Insights e Carga de Trabalho), tarefa de exemplo do onboarding que cita o Portfólio.
- **Entrega, backend:** remover `GET /projects/portfolio` e os endpoints do `ai.controller` que só a tela de IA usa (`chat`, `conversations`, `summarize`, `action-plan`, `bottlenecks`, `strategic-brief`). **Manter** `selah-ai-client.service`, as formatações e a redistribuição do Workload, e o registro de uso (`ai_usage_logs`, `GET /ai/usage`, que o /diagnostico consome).
- **Entrega, docs:** README, FOUNDER_CONTEXT e textos comerciais deixam de citar as duas telas.
- **Banco:** ver D6. Sem DROP sem decisão do dono.
- **Pronto quando:** `tsc --noUnusedLocals` limpo, nenhuma rota ou link morto, Workload e /diagnostico funcionando, builds e testes verdes.

---

### BLOCO B — Empresas (ativa, trocar, excluir, Geral)

#### Fase 3 — Empresa ativa confiável no backend
- **Branch:** `feature/empresa-ativa-backend`
- **Objetivo:** o backend sabe qual é a empresa de trabalho e nunca confia cegamente no cliente.
- **Entrega:** ler a empresa do cabeçalho `X-Company-Id`; conferir que o usuário é membro (403 se não); usar `companies[0]` só como padrão sem cabeçalho. A identidade continua vindo do token. Auditar todo controller que recebe `companyId` sem conferir membership e corrigir.
- **Pronto quando:** testes de isolamento A/B (A não lê B, cabeçalho forjado, cabeçalho ausente), integração em banco descartável, mutantes mortos.

#### Fase 4 — Excluir empresa
- **Branch:** `feature/empresa-excluir`
- **Objetivo:** o dono apaga uma empresa pela tela Empresas.
- **Entrega:** `DELETE /companies/:id` conforme D1 (só OWNER, confirmação pelo nome, bloqueio da última empresa, transação) com **recibo** das contagens apagadas; ação "Excluir" no menu "..." do cartão.
- **Pronto quando:** cascata real testada (projetos, tarefas, membros, convites), não-OWNER = 403, outra empresa intacta.

#### Fase 5 — Switch de empresa no front
- **Branch:** `feature/empresa-ativa-front`
- **Objetivo:** trocar codeStage ↔ HEX360 e ver só o que é da empresa escolhida.
- **Entrega:** `ActiveCompanyService` (signal + persistência conforme D2 + valor `ALL`); interceptor que manda `X-Company-Id`; troca recarrega as telas; substituir os 24 usos de `companies[0]`/`currentCompanyId()`; switch no topbar no lugar do chip atual (com a opção Geral já listada, ativada na Fase 6); troca na tela Empresas (cartão marca "em uso"); regra D5 ao excluir a ativa.
- **Pronto quando:** em todas as telas só aparecem dados da empresa ativa; a escolha persiste ao recarregar.

#### Fase 6 — Modo Geral
- **Branch:** `feature/empresa-modo-geral`
- **Objetivo:** visão de todas as empresas, cada item identificado, com filtro.
- **Entrega:** endpoints de leitura agregam as empresas de que o usuário é membro e devolvem `companyId`/`companyName` por item; telas da D3 mostram etiqueta e filtro por empresa; telas de gestão pedem para escolher uma empresa; criar item em Geral pergunta a empresa (D4).
- **Pronto quando:** em Geral aparecem as duas empresas, cada uma etiquetada; o filtro isola cada uma; nada de empresa onde o usuário não é membro aparece.

---

### BLOCO C — Kanban (status, Minhas Tarefas, equipe)

#### Fase 7 — Fluxo de 5 status
- **Branch:** `feature/status-fluxo-5-colunas`
- **Objetivo:** o produto passa a ter os 5 estágios pedidos: **Backlog, Em dev, Testes, Validação, Finalizado**.
- **Entrega, banco:** migration (escrita por `prisma migrate diff`, nunca à mão) que acrescenta `TESTING` e `VALIDATION` ao `TaskStatus`. Mapeamento dos dados existentes conforme D16 (recomendado: `IN_PROGRESS` → Em dev, `IN_REVIEW` → Validação, `DONE` → Finalizado, `BACKLOG` igual; nenhuma tarefa muda de status sozinha, só de rótulo, e Testes nasce vazio).
- **Entrega, backend e front:** trocar os pontos que listam status (Kanban do projeto, lista, dashboard, relatórios, calendário, aprovações, modelos de tarefa, seed, onboarding de exemplo, contagem de "concluídas"); rótulos novos em `TASK_STATUS_CONFIG`.
- **Pronto quando:** migration validada em banco limpo e sobre dados existentes (`migrate diff` fecha em "No difference detected"); nenhum lugar com lista fixa de 4 status (varredura); testes e `ng build` verdes; mutantes mortos nos cálculos que dependem de status (concluídas, atraso).

#### Fase 8 — Minhas Tarefas em Kanban
- **Branch:** `feature/minhas-tarefas-kanban`
- **Objetivo:** a tela Minhas Tarefas deixa de ser lista e vira um Kanban com as tarefas do usuário.
- **Entrega:** 5 colunas (Fase 7); só tarefas em que o usuário é o responsável (`assigneeId` vindo do token), de todos os projetos da empresa ativa; arrastar muda o status com recibo; cartão mostra projeto, prioridade e prazo; filtros por projeto e prioridade; estado vazio por coluna; no modo Geral (Fase 6) mostra a etiqueta da empresa. Reaproveitar o componente de coluna/cartão do Kanban do projeto em vez de copiar (o `kanban.component` tem 939 linhas: extrair o que for comum para um componente compartilhado, sem refatorar fora disso).
- **Pronto quando:** UI real no Chrome (arrastar entre as 5 colunas persiste; recarregar mantém), 360 e 1280 px, claro e escuro; usuário A não vê tarefas de B.

#### Fase 9 — Kanban da equipe + item no menu Principal
- **Branch:** `feature/kanban-equipe`
- **Objetivo:** visão única do trabalho de toda a equipe, nas 5 colunas.
- **Entrega:** novo item **"Kanban"** no grupo "Principal" da sidebar (`mainNav`), rota nova (por exemplo `/kanban`); mostra as tarefas de **todos os projetos da empresa ativa** (D17), agrupadas nas 5 colunas, com responsável no cartão; filtros por projeto, equipe, responsável e prioridade; arrastar muda o status (permissões em D18); no modo Geral, etiqueta e filtro por empresa. Endpoint de leitura com `companyId` validado (Fase 3) e paginação por coluna.
- **Pronto quando:** UI real no Chrome com dados semeados de 2 empresas; isolamento A/B (nada de outra empresa); permissão de arrastar conforme D18 testada; desempenho aceitável com muitas tarefas (coluna carrega por página).

---

### BLOCO D — Importação em massa de tasks

#### Fase 10 — Importar tasks: backend
- **Branch:** `feature/importar-tasks-backend`
- **Objetivo:** ler CSV/XLSX (e XLS conforme D7), validar e gravar tasks de uma vez.
- **Entrega, prévia:** rota que recebe o arquivo e devolve linhas válidas, linhas com erro e o motivo, colunas reconhecidas. **Não grava nada.**
- **Entrega, confirmação:** rota que grava as válidas numa transação e devolve **recibo** (gravou N, recusou M, ids). Resultado desconhecido (queda no meio): não repetir, orientar a conferir a lista.
- **Campos:** título (obrigatório), descrição, status (um dos 5 da Fase 7), prioridade, prazo, responsável (e-mail de membro da empresa), projeto de destino escolhido na tela (D8). Modelo de planilha para baixar (CSV e XLSX), cabeçalhos em português.
- **Segurança:** empresa via `X-Company-Id` validado (Fase 3); tipo conferido por conteúdo, não só extensão; limites de tamanho e linhas (D9); limite de tamanho descompactado do XLSX (zip bomb); células lidas como texto (sem executar fórmula); rate limit; chave de idempotência (duplo clique não duplica).
- **Pronto quando:** testes por formato, linhas inválidas (data ruim, e-mail de não-membro, status inexistente), arquivo grande/hostil, mutantes mortos, integração real em banco descartável, isolamento A/B, datas em TZ=UTC, America/Sao_Paulo e Asia/Tokyo.

#### Fase 11 — Importar tasks: tela
- **Branch:** `feature/importar-tasks-front`
- **Objetivo:** o usuário importa sem sair do app.
- **Entrega:** botão "Importar tarefas" (projeto e/ou lista de Projetos); escolher arquivo; baixar modelo; prévia com erros por linha; confirmar; recibo ("42 criadas, 3 recusadas" com motivos).
- **Pronto quando:** fluxo completo no Chrome real com CSV, XLSX e (se D7) XLS; mensagem clara para arquivo inválido; claro/escuro; 360 e 1280 px.

---

### BLOCO E — Inteligência de dados (ML e estatísticas)

Princípio: primeiro medir bem (estatística simples e auditável), depois treinar modelo só onde a estatística não bastar. Com poucos dados de piloto, um modelo treinado cedo erra e dá falsa confiança. Cada número mostrado ao usuário diz de onde veio e quanta amostra tem por trás.

#### Fase 12 — Base de dados e estatística (baseline)
- **Branch:** `feature/estatisticas-base`
- **Objetivo:** ter, por empresa, as métricas que o modelo e as telas vão consumir, calculadas de forma determinística.
- **Entrega:** conferir/garantir o histórico de mudança de status (`Activity`); tabela ou consulta de métricas por tarefa e por projeto (tempo em cada status, tempo de ciclo, tarefas paradas, WIP por pessoa e por coluna, taxa de atraso, retrabalho = tarefa que volta de status); rotina de agregação (BullMQ já existe) com recálculo incremental; todas as consultas com `companyId` validado (Fase 3) e com o modo Geral (Fase 6) em mente.
- **Baseline estatístico (sem ML):** percentis (p50/p85), média móvel, z-score/IQR para anomalia, regressão linear simples para tendência. Serve de referência para medir se o modelo da Fase 13 é melhor.
- **Pronto quando:** métricas conferidas à mão em banco semeado, testes com casos de borda (projeto vazio, uma tarefa só, tarefas sem data), datas em TZ=UTC, America/Sao_Paulo e Asia/Tokyo, isolamento A/B.

#### Fase 13 — Modelo de ML: gargalos e previsões
- **Branch:** `feature/ml-gargalos`
- **Objetivo:** um modelo que aponta gargalos e prevê atraso e carga, melhor que o baseline.
- **Saídas previstas (D13):** (a) **gargalo**: coluna, pessoa ou projeto onde o trabalho acumula, com a causa provável; (b) **risco de atraso** por tarefa (probabilidade e fatores); (c) **previsão de carga** por pessoa nos próximos 14 dias (alimenta o mapa de calor); (d) **anomalias** (pico de retrabalho, queda de vazão).
- **Entrega:** definição das features a partir das métricas da Fase 12; treino e avaliação com separação por tempo (nunca embaralhar o futuro no treino); comparação com o baseline; rota que devolve a previsão com probabilidade, fatores e tamanho da amostra; regra de corte: abaixo de uma amostra mínima a rota devolve só o baseline e diz que não há dados suficientes.
- **Onde roda (D12):** toda IA do dono passa pelo Selah IA; o modelo é servido pelo Selah e o Agilis chama por um único cliente (o mesmo `selah-ai-client`, medido em `ai_usage_logs`). Falha do Selah nunca derruba a tela: cai no baseline.
- **Privacidade e isolamento (D14):** dados de uma empresa nunca treinam nem alimentam a previsão de outra; sem nome, título ou texto de tarefa saindo do Agilis (só números e categorias); LGPD registrada no handoff.
- **Pronto quando:** métrica de avaliação registrada e melhor que o baseline em dados de teste, ou o relatório diz com honestidade que ainda não é (e o baseline segue); teste de isolamento A/B; falha do Selah simulada; mutantes mortos.

#### Fase 14 — Mapa de calor, gráficos e dashboards com as estatísticas
- **Branch:** `feature/dashboards-estatisticas`
- **Objetivo:** o usuário vê o que a Fase 12 e a Fase 13 produzem.
- **Entrega:** mapa de calor da Carga de Trabalho com previsão (dias futuros em tom distinto do realizado) e destaque de sobrecarga; gráficos de tempo de ciclo, vazão, WIP e atraso nos Relatórios; cartões de gargalo e de risco no Dashboard e na página Insights, cada um com "por quê", amostra e data do cálculo; filtro por empresa no modo Geral. Estados vazios claros quando não há dados suficientes.
- **Pronto quando:** UI real no Chrome com dado semeado nos dois temas, 360 e 1280 px; nenhum número sem origem; `ng build` verde. A conferência visual detalhada dos temas vem na Fase 15.

---

### BLOCO F — Qualidade visual

#### Fase 15 — Auditoria do design system, claro e escuro
- **Branch:** `fix/tema-claro-escuro`
- **Objetivo:** nada fica sem mudar, ilegível ou "preso" no tema escuro.
- **Por que depois das fases de tela:** cobre também o switch, o modo Geral, a importação e as telas de estatística (Fase 14), e há menos telas após a Fase 2.
- **Entrega:**
  - Inventário dos tokens (cor, tipografia, espaço) e conferência dos dois temas (`styles/main.scss`, `tailwind.config`).
  - Caça a defeitos: (a) cores literais e classes de paleta fixa nos 68 + 26 arquivos suspeitos, trocando por tokens; (b) componentes de terceiros (CDK drag-drop, overlays, inputs nativos, scrollbars, `color-scheme`); (c) estados (hover, focus, disabled, erro, vazio, skeleton, toast, modal, dropdown, tabela, badge); (d) imagens, ícones e SVG com cor fixa; (e) contraste WCAG AA (4.5:1); (f) troca de tema com a página aberta e persistência ao recarregar.
  - Método: Chrome real (Puppeteer), uma captura por rota nos dois temas, em 360 e 1280 px, com dado semeado; relatório de achados (tela, elemento, causa, correção) com contagem antes/depois.
- **Pronto quando:** nenhuma tela com elemento ilegível ou cor fixa fora do token (varredura estática zera, salvo exceções justificadas e listadas); capturas dos dois temas no relatório; `ng build` verde.

---

### BLOCO G — Fechamento

#### Fase 16 — Fechamento
- **Branch:** `docs/fechamento-empresa-import`
- **Entrega:** relatório de revisão persistido, `graphify update .`, handoff, README (linha de changelog por versão), números verdes com data e quem conferiu, seção NÃO verificado atualizada.

## 4. Decisões do dono (abertas; recomendação entre parênteses)

- D1 Exclusão de empresa: só OWNER; confirmar digitando o nome; bloquear a última empresa do usuário; cascata sem desfazer. (recomendado: sim)
- D2 Empresa ativa guardada no `localStorage`, por navegador, sem migration. (recomendado) Alternativa: coluna no banco.
- D3 Modo Geral só nas telas de dados: Dashboard, Minhas Tarefas (Kanban), Kanban da equipe, Projetos, Calendário, Relatórios (o Portfólio sai na Fase 2). Telas de gestão (Membros, Equipes, Convites, Diagnóstico, Configurações) exigem empresa específica. (recomendado)
- D4 Em Geral, criar item pergunta a empresa no formulário. (recomendado)
- D5 Ao excluir a empresa ativa, trocar para a próxima automaticamente. (recomendado)
- D6 Tabelas `ai_conversations` e `ai_messages` (histórico de conversas do assistente): apagar por migration ou manter sem uso? (recomendado: apagar numa migration própria, separada, depois de confirmar que ninguém precisa do histórico; o DROP é irreversível)
- D7 Formato XLS: o `exceljs` não lê. Para aceitar XLS é preciso uma dependência nova (SheetJS, versão corrigida, lida só no backend e com limites). (recomendado: aceitar CSV e XLSX na primeira entrega e incluir XLS na Fase 10 só se você confirmar a dependência nova; o histórico de falhas de segurança do pacote `xlsx` no npm é a razão da cautela.)
- D8 Projeto de destino: a importação vai para um projeto escolhido na tela. Coluna "projeto" na planilha para distribuir em vários projetos fica fora da primeira versão. (recomendado)
- D9 Limites: 5 MB e 1000 linhas por arquivo. (recomendado)
- D16 Mapeamento dos status antigos para os 5 novos: `IN_PROGRESS` → Em dev, `IN_REVIEW` → Validação, `DONE` → Finalizado, `BACKLOG` → Backlog, e Testes novo e vazio. (recomendado) Alternativa: `IN_REVIEW` → Testes.
- D17 O que o Kanban da equipe mostra: todas as tarefas de todos os projetos da empresa ativa (recomendado), com filtro por projeto e equipe. Alternativa: só tarefas das equipes de que o usuário participa.
- D18 Quem pode arrastar no Kanban da equipe: OWNER/ADMIN movem qualquer tarefa; MEMBER move só as tarefas em que é responsável ou criador. (recomendado) Alternativa: todos movem tudo.
- D11 Auditoria de tema (Fase 15): corrigir tudo o que achar no mesmo fix (recomendado) ou só relatar e você escolhe o que corrigir. Se você já anotou ocorrências específicas, mande as telas para virarem casos de teste.
- D12 Onde o modelo de ML roda: no Selah IA, único lugar de IA do dono (recomendado), ou dentro do backend do Agilis (sem serviço externo, mas contra a regra de que toda IA passa pelo Selah). O Selah tem de oferecer serviço de modelo/previsão; se ainda não oferece, a Fase 13 depende desse trabalho no projeto irmão.
- D13 Que previsões entram na primeira versão: gargalo, risco de atraso, carga futura, anomalia (recomendado: gargalo e carga futura primeiro, que alimentam o mapa de calor; atraso e anomalia depois).
- D14 Privacidade: modelo por empresa, sem misturar dados entre empresas e sem texto de tarefa saindo (recomendado). Alternativa: modelo global treinado com dados anonimizados de todas as empresas, o que exige base legal e aviso aos clientes.
- D15 Escopo de produto: Métricas e Health Score foram cortados antes por foco. Estas estatísticas voltam só como apoio a gargalo, mapa de calor, gráficos e dashboards, sem tela própria de "Métricas" nem nota de saúde. Confirma?
- D10 Linha inválida: importar as válidas e listar as recusadas (recomendado) ou recusar o arquivo inteiro se houver qualquer erro.

## 5. Verificação prevista

Backend: jest, mutantes, integração em Postgres/Redis descartáveis (portas conferidas com `ss -ltn`), isolamento A/B, exclusão em cascata, arquivos hostis. Front: `ng build`, UI real no Chrome (troca de empresa, Geral, filtro, menu de Membros, importação). Rodar os testes de data em TZ=UTC, America/Sao_Paulo e Asia/Tokyo (prazo da planilha). Registrar números verdes com data.

## 6. NÃO verificado (ainda)

Hipóteses até as fases rodarem: quais controllers deixam passar `companyId` sem conferir membership; o custo de trocar `companies[0]` nos 24 pontos do front; se o modo Geral fica rápido com muitas empresas; o motivo exato do corte do menu em Membros; se algum lugar do código assume só 4 status além dos listados na Fase 7; qual a carga de uma coluna com milhares de tarefas no Kanban da equipe; se o `Activity` guarda o histórico de status com data (sem isso o tempo por coluna não existe e a Fase 12 começa criando esse histórico, sem passado para recuperar); se há volume de dados para um modelo superar o baseline; se o Selah oferece serviço de modelo; quantos dos 68 + 26 arquivos suspeitos de tema são defeito real e quantos são cor fixa intencional (ex.: cor de status); se algo além do Workload e do /diagnostico depende do módulo `ai/`; como o XLS legado se comporta com datas e fusos; o tamanho real das planilhas dos pilotos.
