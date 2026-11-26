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

## 2. Estado atual (lido no código, 2026-11-26)

- A "empresa ativa" é sempre `user.companies[0]` (`auth.service.ts:20`, `sidebar.component.ts:38`, `topbar.component.ts:29`, `diagnostico.component.ts:35`, `global-search.component.ts:59`). Não existe troca.
- **Risco principal:** o backend também decide a empresa sozinho. `jwt.strategy.ts:48` põe `req.user.companyId = user.companies[0]`. Workload e telemetria leem isso. Se o front trocar de empresa e o backend continuar na primeira, as telas misturam empresas. A troca precisa chegar ao backend.
- A maioria dos controllers recebe `companyId` do front (teams, calendar, ai, users, search, projects). Alguns podem não conferir se o usuário é membro daquela empresa (a conferir na Fase 3).
- `companies.controller.ts` não tem DELETE. O schema tem `onDelete: Cascade` de Company para UserCompany, Project, Team, Insight etc.: apagar a empresa apaga tudo dela.
- **Assistente IA:** tela `features/ia`, rota `/ia`, serviço `core/services/ai.service.ts`, backend `ai/` (`POST chat`, `conversations`, `summarize/project`, `action-plan`, `bottlenecks`, `strategic-brief`, `usage`), tabelas `AiConversation`/`AiMessage`/`AiUsageLog`. **O Workload também usa o cliente Selah** (`workload.service.ts:4`, sugestão de redistribuição) e o `portfolio.component.ts` chama o `ai.service` do front.
- **Portfólio Executivo:** tela `features/portfolio`, rota `/portfolio`, `portfolio.service.ts`, backend `GET /projects/portfolio` (`projects.service.ts:222`, com sinais de risco da F6). Citado no onboarding (tarefa de exemplo), README e FOUNDER_CONTEXT.
- **Sidebar** grupo "Inteligência": Portfolio Executivo, Assistente IA, Insights, Carga de Trabalho.
- **Importação:** o backend já tem `exceljs` (usado em `reports.service.ts`) e o módulo `upload/` (multer, 20 MB, MIME de planilha já permitido). `exceljs` lê CSV e XLSX, **não lê XLS** (formato binário antigo). Não existe importador de tarefas.
- **Tema:** claro é o padrão; escuro liga com `[data-theme="dark"]` no `<html>` (`theme.service.ts`, `localStorage` `agilis-theme`). As cores vêm de variáveis CSS (`--p-*`, `--f-*`, `--c-*`) mapeadas no `tailwind.config` (`darkMode: ['selector', '[data-theme="dark"]']`; `styles/main.scss`). Varredura estática rápida de 2026-11-26: **68 arquivos** com cor literal (`#hex`, `rgb()`/`rgba()`) e **26 arquivos** com classes de paleta fixa do Tailwind (`bg-white`, `text-gray-*`, `border-slate-*` etc.); só **1 arquivo** usa `dark:`. Esses são os suspeitos de não acompanhar o tema escuro. Ainda não conferi tela por tela.
- Menu "⋮" de Membros (`members.component.ts`): dropdown "ALTERAR PAPEL" cortado, provável `overflow` do container da lista.

## 3. Fases

Cada fase: branch `feature/<nome>` ou `fix/<nome>` a partir da `develop` atualizada, merge `--no-ff` na `develop`, handoff atualizado logo depois, relatório de revisão em `.superpowers/sdd/<fase>/`. `master` só com pedido explícito do dono. Versão: uma minor por fase (a partir da v3.17.0), definida ao implementar.

### Fase 1 — Menu de Membros cortado (`fix/membros-menu-cortado`)
- Corrigir o dropdown do "⋮" (overflow/posição), sem mudar comportamento.
- Pronto quando: menu inteiro visível na primeira e na última linha, em 360 e 1280 px, tema claro e escuro (Chrome real).

### Fase 2 — Remover Assistente IA e Portfólio Executivo (`feature/remover-ia-portfolio`, `feat!:`)
- Front: apagar `features/ia`, `features/portfolio`, `portfolio.service.ts`, uso do `ai.service` que sobrar, rotas `/ia` e `/portfolio`, itens da sidebar (o grupo "Inteligência" fica com Insights e Carga de Trabalho), tarefa de exemplo do onboarding que cita o Portfólio.
- Backend: remover `GET /projects/portfolio` e os endpoints do `ai.controller` que só a tela de IA usa (`chat`, `conversations`, `summarize`, `action-plan`, `bottlenecks`, `strategic-brief`). **Manter** `selah-ai-client.service`, as formatações e a redistribuição do Workload, e o registro de uso (`ai_usage_logs`, `GET /ai/usage`, que o /diagnostico consome).
- Docs: README, FOUNDER_CONTEXT e textos comerciais deixam de citar as duas telas.
- Banco: ver D6 (tabelas `ai_conversations`/`ai_messages`). Sem DROP sem decisão do dono.
- Pronto quando: `tsc` com `--noUnusedLocals` limpo, nenhuma rota/link morto, Workload e /diagnostico seguem funcionando, build front e back verdes, testes ajustados.

### Fase 3 — Backend: empresa ativa confiável (`feature/empresa-ativa-backend`)
- O backend lê a empresa do cabeçalho `X-Company-Id`, confere se o usuário é membro (403 se não) e usa `companies[0]` só como padrão quando o cabeçalho falta. A identidade continua vindo do token; só a empresa de trabalho vem do cliente, e sempre validada.
- Auditar todo controller que recebe `companyId` sem conferir membership e corrigir.
- Pronto quando: testes de isolamento A/B (usuário A não lê empresa de B, cabeçalho forjado, cabeçalho ausente) e integração em banco descartável passam; mutantes mortos.

### Fase 4 — Excluir empresa (`feature/empresa-excluir`)
- `DELETE /companies/:id` conforme D1: só OWNER, confirmação pelo nome, bloqueio da última empresa do usuário, transação, **recibo** com contagens do que foi apagado.
- Pronto quando: cascata real testada em banco descartável (projetos, tarefas, membros, convites), tentativa por não-OWNER = 403, outra empresa intacta.

### Fase 5 — Front: empresa ativa + switch (`feature/empresa-ativa-front`)
- `ActiveCompanyService` (signal + persistência conforme D2 + valor `ALL`), interceptor que manda `X-Company-Id`, troca recarrega as telas, substituir os usos de `companies[0]` e `currentCompanyId()` (24 pontos). Switch no topbar no lugar do chip atual, com a opção Geral. Troca e exclusão também na tela Empresas (cartão marca "em uso").
- Pronto quando: trocar codeStage ↔ HEX360 mostra só dados da empresa escolhida em todas as telas; excluir a empresa ativa cai na próxima (D5); persiste após recarregar.

### Fase 6 — Modo Geral (`feature/empresa-modo-geral`)
- Endpoints de leitura agregam as empresas de que o usuário é membro e devolvem `companyId`/`companyName` por item. Telas conforme D3 mostram etiqueta de empresa e filtro por empresa. Telas de gestão pedem para escolher uma empresa. Criar item em Geral pergunta a empresa (D4).
- Pronto quando: em Geral aparecem tarefas/projetos das duas empresas, cada uma etiquetada, o filtro isola cada empresa, e nada de empresa onde o usuário não é membro aparece.

### Fase 7 — Importação de tasks: backend (`feature/importar-tasks-backend`)
- Rota de prévia: recebe o arquivo (CSV, XLSX e, conforme D7, XLS), lê, valida linha a linha e devolve a prévia (linhas válidas, linhas com erro e o motivo, colunas reconhecidas). **Não grava nada.**
- Rota de confirmação: grava as linhas válidas numa transação e devolve **recibo** (quantas gravou, quantas recusou, ids). Resultado desconhecido (queda no meio) = não repetir automaticamente; orientar a conferir a lista.
- Campos: título (obrigatório), descrição, status, prioridade, prazo, responsável (por e-mail, tem de ser membro da empresa), projeto de destino (escolhido na tela; ver D8). Modelo de planilha para baixar (CSV e XLSX), com cabeçalhos em português.
- Segurança: empresa vem de `X-Company-Id` validado (Fase 3); tipo do arquivo conferido por conteúdo (não só extensão); limite de tamanho e de linhas (D9); limite de tamanho descompactado do XLSX (zip bomb); células tratadas como texto (sem executar fórmula); rate limit; duplo clique não duplica (chave de idempotência da prévia).
- Pronto quando: testes por formato, linhas inválidas (data ruim, e-mail de não-membro, status inexistente), arquivo grande/hostil, mutantes mortos, integração real em banco descartável, isolamento A/B.

### Fase 8 — Importação de tasks: tela (`feature/importar-tasks-front`)
- Botão "Importar tarefas" na tela do projeto (e/ou Projetos): escolher arquivo, baixar modelo, ver prévia com erros por linha, confirmar, ver o recibo ("42 criadas, 3 recusadas" com a lista dos motivos).
- Pronto quando: fluxo completo no Chrome real (CSV, XLSX e XLS), erro de arquivo inválido com mensagem clara, tema claro/escuro, 360 e 1280 px.

### Fase 9 — Auditoria do design system, claro e escuro (`fix/tema-claro-escuro`)
- Roda **depois** das fases de tela (2, 5, 6, 8), para cobrir também o switch, o modo Geral e a importação, e depois da remoção de IA/Portfólio (menos telas).
- Inventário: listar todos os tokens de cor/tipografia/espaço do design system e conferir que cada um tem valor nos dois temas (`styles/main.scss` e `tailwind.config`).
- Caça a defeitos: (a) cores literais e classes de paleta fixa nos 68 + 26 arquivos suspeitos, trocando por tokens; (b) componentes de terceiros (CDK drag-drop, overlays, inputs nativos, scrollbars, `color-scheme`) que não trocam de tema; (c) estados (hover, focus, disabled, erro, vazio, skeleton, toast, modal, dropdown, tabela, badge) em cada tema; (d) imagens/ícones/SVG com cor fixa; (e) contraste (meta: WCAG AA, 4.5:1 para texto normal); (f) troca de tema com a página aberta (nada pode ficar preso no tema antigo) e tema persistido ao recarregar.
- Método: Chrome real (Puppeteer), uma captura por rota nos dois temas, em 360 e 1280 px, comparando claro × escuro, com dado semeado para telas que dependem de dados; relatório com a lista de achados (tela, elemento, causa, correção) e a contagem antes/depois.
- Pronto quando: nenhuma tela com elemento ilegível ou com cor fixa fora do token (varredura estática zera, salvo exceções justificadas e listadas), capturas dos dois temas anexadas ao relatório, `ng build` verde.

### Fase 10 — Fechamento (`docs/fechamento-empresa-import`)
- Relatório de revisão persistido, `graphify update .`, handoff, README (linha de changelog por versão), números verdes com data, seção NÃO verificado.

**Ordem:** 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10. A 2 vem antes da 3 para reduzir superfície (menos telas para migrar para empresa ativa). A 7 depende da 3 (empresa validada no backend).

## 4. Decisões do dono (abertas; recomendação entre parênteses)

- D1 Exclusão de empresa: só OWNER; confirmar digitando o nome; bloquear a última empresa do usuário; cascata sem desfazer. (recomendado: sim)
- D2 Empresa ativa guardada no `localStorage`, por navegador, sem migration. (recomendado) Alternativa: coluna no banco.
- D3 Modo Geral só nas telas de dados: Dashboard, Minhas Tarefas, Projetos, Calendário, Relatórios (o Portfólio sai na Fase 2). Telas de gestão (Membros, Equipes, Convites, Diagnóstico, Configurações) exigem empresa específica. (recomendado)
- D4 Em Geral, criar item pergunta a empresa no formulário. (recomendado)
- D5 Ao excluir a empresa ativa, trocar para a próxima automaticamente. (recomendado)
- D6 Tabelas `ai_conversations` e `ai_messages` (histórico de conversas do assistente): apagar por migration ou manter sem uso? (recomendado: apagar numa migration própria, separada, depois de confirmar que ninguém precisa do histórico; o DROP é irreversível)
- D7 Formato XLS: o `exceljs` não lê. Para aceitar XLS é preciso uma dependência nova (SheetJS, versão corrigida, lida só no backend e com limites). (recomendado: aceitar CSV e XLSX na primeira entrega e incluir XLS na Fase 7 só se você confirmar a dependência nova; o histórico de falhas de segurança do pacote `xlsx` no npm é a razão da cautela.)
- D8 Projeto de destino: a importação vai para um projeto escolhido na tela. Coluna "projeto" na planilha para distribuir em vários projetos fica fora da primeira versão. (recomendado)
- D9 Limites: 5 MB e 1000 linhas por arquivo. (recomendado)
- D11 Auditoria de tema (Fase 9): corrigir tudo o que achar no mesmo fix (recomendado) ou só relatar e você escolhe o que corrigir. Se você já anotou ocorrências específicas, mande as telas para virarem casos de teste.
- D10 Linha inválida: importar as válidas e listar as recusadas (recomendado) ou recusar o arquivo inteiro se houver qualquer erro.

## 5. Verificação prevista

Backend: jest, mutantes, integração em Postgres/Redis descartáveis (portas conferidas com `ss -ltn`), isolamento A/B, exclusão em cascata, arquivos hostis. Front: `ng build`, UI real no Chrome (troca de empresa, Geral, filtro, menu de Membros, importação). Rodar os testes de data em TZ=UTC, America/Sao_Paulo e Asia/Tokyo (prazo da planilha). Registrar números verdes com data.

## 6. NÃO verificado (ainda)

Hipóteses até as fases rodarem: quais controllers deixam passar `companyId` sem conferir membership; o custo de trocar `companies[0]` nos 24 pontos do front; se o modo Geral fica rápido com muitas empresas; o motivo exato do corte do menu em Membros; quantos dos 68 + 26 arquivos suspeitos de tema são defeito real e quantos são cor fixa intencional (ex.: cor de status); se algo além do Workload e do /diagnostico depende do módulo `ai/`; como o XLS legado se comporta com datas e fusos; o tamanho real das planilhas dos pilotos.
