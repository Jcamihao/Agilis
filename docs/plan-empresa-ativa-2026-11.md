# Plano: empresa ativa, troca de empresa, exclusão e modo Geral

Criado em 2026-11-26. Status: **PLANEJAMENTO — nenhum código escrito.** Nenhuma fase começa antes de o dono validar as decisões da seção 3.

## 1. Pedido do dono (2026-11-26)

1. Menu "⋮" (hambúrguer) da tela Membros fica cortado.
2. Poder **trocar a empresa** em que atua e **deletar** uma empresa (tela Empresas).
3. **Empresa ativa com switch**: com a codeStage ativa, todas as páginas mostram só o que é dela (demandas, planos, etc.); ao trocar para a HEX360, só o dela.
4. Opção **Geral** no switch: mostra tarefas, planos e afins de todas as empresas, com cada item identificado e com filtro por empresa.

## 2. Estado atual (lido no código, 2026-11-26)

- A "empresa ativa" é sempre `user.companies[0]` (`auth.service.ts:20`, `sidebar.component.ts:38`, `topbar.component.ts:29`, `diagnostico.component.ts:35`, `global-search.component.ts:59`). Não existe troca.
- **Risco principal:** o backend também decide a empresa sozinho. `jwt.strategy.ts:48` põe `req.user.companyId = user.companies[0]`. Workload, telemetria (/diagnostico, eventos) e outros leem isso. Se o front trocar de empresa e o backend continuar na primeira, as telas misturam empresas. A troca precisa chegar ao backend.
- A maioria dos controllers recebe `companyId` do front (query/body): teams, calendar, ai, users, search, projects etc. Alguns não conferem se o usuário é membro daquela empresa (a conferir na F1; é furo de isolamento de dados mesmo antes desta feature).
- `companies.controller.ts` tem listar, buscar, criar, atualizar e dashboard. **Não tem DELETE.** O schema tem `onDelete: Cascade` de Company para UserCompany, Project, Team, Insight etc., então apagar a empresa apaga tudo dela.
- A tela Empresas mostra os cartões com "ATIVA" (hoje o rótulo é de status da empresa, não de "empresa em uso") e o menu "..." sem ações.
- Menu "⋮" de Membros (`members.component.ts`): dropdown "ALTERAR PAPEL" cortado, provável `overflow` do container da lista.

## 3. Decisões do dono (abertas; recomendação entre parênteses)

- D1 Exclusão: só OWNER; confirmar digitando o nome da empresa; bloquear a exclusão da última empresa do usuário; apaga em cascata e sem desfazer. (recomendado: sim)
- D2 Onde guardar a empresa ativa: `localStorage` por navegador, sem migration. (recomendado) Alternativa: coluna no banco, vale em qualquer dispositivo.
- D3 Páginas com modo Geral: Dashboard, Minhas Tarefas, Projetos, Portfólio, Calendário, Relatórios, com etiqueta da empresa em cada item e filtro por empresa. Páginas de gestão (Membros, Equipes, Convites, IA, Diagnóstico, Configurações) exigem uma empresa específica e pedem para escolher. (recomendado)
- D4 Em Geral, ações de escrita (criar projeto/tarefa) pedem para escolher a empresa no formulário. (recomendado)
- D5 Ao excluir a empresa ativa, trocar automaticamente para a próxima empresa. (recomendado)

## 4. Fases (cada uma: branch `feature/<nome>` ou `fix/<nome>` a partir da `develop`, merge `--no-ff` na `develop`, handoff atualizado; `master` só com pedido explícito do dono)

- **F1 — Backend: empresa ativa confiável** (`feature/empresa-ativa-backend`). O backend lê a empresa do cabeçalho `X-Company-Id`, confere se o usuário é membro (403 se não) e usa `companies[0]` só como padrão quando o cabeçalho falta. Auditar os controllers que recebem `companyId` sem conferir membership e corrigir. Testes: A não lê B, cabeçalho forjado, sem cabeçalho.
- **F2 — Backend: excluir empresa** (`feature/empresa-excluir`). `DELETE /companies/:id`, só OWNER, recibo do que foi apagado (contagens), transação, bloqueio da última empresa, derruba convites da empresa. Teste em banco descartável (cascata real) e mutantes.
- **F3 — Front: serviço de empresa ativa + switch** (`feature/empresa-ativa-front`). `ActiveCompanyService` (signal + `localStorage` + valor `ALL`), interceptor que manda `X-Company-Id`, troca de empresa recarrega os dados das telas, substituir os 24 usos de `companies[0]`/`currentCompanyId()`. Switch no topbar no lugar do chip atual, com a opção Geral. Troca/exclusão também na tela Empresas.
- **F4 — Modo Geral** (`feature/empresa-modo-geral`). Endpoints de leitura agregam as empresas do usuário (só as de que é membro) e devolvem `companyId`/`companyName` por item; telas da D3 mostram etiqueta e filtro por empresa. Telas de gestão mostram "escolha uma empresa".
- **F5 — Fix do menu de Membros** (`fix/membros-menu-cortado`). CSS; independente das outras, pode ir primeiro.
- **F6 — Fechamento**: relatório de revisão em `.superpowers/sdd/empresa-ativa/`, `graphify update .`, handoff, versão no `package.json` e linha no README.

Ordem sugerida: F5 → F1 → F2 → F3 → F4 → F6. Versões: uma minor por fase (v3.17.0 em diante), a definir ao implementar.

## 5. Verificação prevista

Backend: jest, mutantes, integração em Postgres/Redis descartáveis (portas conferidas com `ss -ltn`), isolamento A/B com duas empresas e dois usuários, exclusão em cascata. Front: `ng build`, teste de UI real no Chrome (troca de empresa, Geral, filtro, menu de Membros em 360 e 1280 px). Registrar números verdes com data.

## 6. NÃO verificado (ainda)

Tudo desta lista é hipótese até as fases rodarem: quais controllers deixam passar `companyId` sem conferir membership; o custo de trocar `companies[0]` nos 24 pontos do front; se as consultas agregadas do modo Geral ficam rápidas com muitas empresas; o motivo exato do corte do menu em Membros.
