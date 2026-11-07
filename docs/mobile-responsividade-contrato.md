# Contrato — correção de responsividade mobile

## Objetivo

Remover a dependência de rolagem horizontal para navegação e ações primárias em
viewport de 390 px. A correção é somente de frontend; não altera API, banco ou
dados.

## Escopo de implementação

1. `main-layout` deve tratar telas abaixo de `1024px` como mobile: conteúdo com
   `margin-left: 0`, sidebar inicialmente fechada e aberta como gaveta sobre o
   conteúdo. Em desktop, manter o recolhimento atual de 248 px para 68 px.
2. A sidebar mobile deve ter backdrop clicável e fechar ao navegar. Não pode
   permanecer visualmente exposta na carga inicial mobile.
3. Topbar e painel de notificações devem caber em 390 px. O painel pode usar
   `calc(100vw - 2rem)` como largura máxima.
4. Corrigir as barras de ação observadas no audit:
   - calendário;
   - insights;
   - cabeçalhos de projeto em Kanban, Lista e Apontamento;
   - planejamento de sprint.
   Em mobile, ações devem quebrar linha, reduzir texto para ícone quando já
   houver ícone, ou ficar em rolagem horizontal *local e visível* apenas para
   abas. Ações primárias não podem ficar inacessíveis fora da viewport.
5. Preservar comportamento desktop e funções existentes. Não alterar backend,
   dados de demonstração, rotas ou contratos HTTP.

## Critérios de aceite

- Em 390×844, dashboard abre com conteúdo utilizável de largura total, sem
  sidebar ocupando 248 px.
- Menu abre e fecha por botão e backdrop; um clique em link do menu o fecha.
- Nas telas listadas, botões e filtros principais são alcançáveis sem rolar o
  documento horizontalmente.
- `npm run build` do frontend passa.
- Não fazer commit, push ou deploy nesta tarefa.

## Arquivos candidatos

- `frontend/src/app/layout/main-layout/*`
- `frontend/src/app/layout/sidebar/*`
- `frontend/src/app/layout/topbar/*`
- `frontend/src/app/features/{calendar,insights,kanban,list-view,time-report,sprint-planning}/*.html`
- `frontend/src/styles/main.scss`, se um utilitário compartilhado for necessário.
