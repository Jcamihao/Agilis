# Arquitetura Agilis

## Visao geral

O Agilis segue uma arquitetura de monolito modular, com `backend/` e `frontend/` separados na raiz, inspirada na organizacao do Velo. A ideia e manter o projeto facil de navegar, com modulos de dominio claros, servicos responsaveis pela regra de negocio e infraestrutura local reduzida ao necessario.

## Estrutura raiz

```text
agilis/
  backend/
  frontend/
  docs/
  docker-compose.yml
  package.json
  package-lock.json
  .env.example
```

## Backend

O backend foi desenhado para manter:

- controllers apenas orquestrando entrada e saida
- services concentrando regra de negocio
- Prisma isolado em `src/prisma`
- DTOs para validacao e serializacao
- autorizacao baseada em JWT e papeis

### Estrutura do backend

```text
backend/
  prisma/
    schema.prisma
    migrations/
    seed.ts
  src/
    auth/
      dto/
      strategies/
    common/
      decorators/
      guards/
      interfaces/
    config/
    dashboard/
      dto/
    health/
    prisma/
    task-logs/
      interfaces/
    tasks/
      dto/
    users/
      dto/
    app.module.ts
    main.ts
```

### Modulos do backend

- `auth`: registro da primeira organizacao, login JWT e leitura do usuario autenticado.
- `users`: gestao de usuarios por `ADMIN` e `MANAGER`, sempre limitada a organizacao atual.
- `tasks`: criacao, listagem e mudanca de status de tarefas.
- `task-logs`: geracao e persistencia dos logs de auditoria de tarefas.
- `dashboard`: agregacoes para cards e resumo da operacao.
- `health`: endpoint simples para validacao da API.
- `prisma`: conexao com banco e acesso centralizado ao client.
- `common`: decorators, guards e interfaces compartilhadas.
- `config`: validacao de ambiente e bootstrap de configuracao.

### Regras de negocio do backend

- Toda tarefa pertence a uma organizacao.
- Todo usuario pertence a uma organizacao.
- Apenas `ADMIN` e `MANAGER` criam tarefas.
- Apenas `ADMIN` e `MANAGER` gerenciam usuarios.
- `MANAGER` so promove ou altera usuarios do tipo `USER`.
- Toda criacao ou alteracao relevante de tarefa gera `TaskLog`.
- Um cron roda a cada minuto para marcar tarefas vencidas como `DELAYED`.

### Fluxo de autenticacao

1. `POST /api/auth/register` cria a organizacao e o primeiro usuario administrador.
2. `POST /api/auth/login` autentica o usuario e devolve JWT.
3. O token carrega `sub`, `role` e `organizationId`.
4. Guards validam autenticacao e permissao por papel.
5. `GET /api/auth/me` reidrata o estado autenticado no frontend.

## Frontend

O frontend foi organizado em tres blocos principais:

- `core`: infraestrutura da aplicacao
- `shared`: componentes e recursos reutilizaveis
- `features`: paginas e fluxos de negocio

### Estrutura do frontend

```text
frontend/
  src/
    app/
      core/
        guards/
        interceptors/
        layout/
        models/
        services/
      features/
        auth/
        dashboard/
        planner/
        tasks/
        users/
      shared/
        components/
        material/
      app.component.ts
      app.config.ts
      app.routes.ts
```

### Responsabilidades no frontend

- `core/guards`: protecao de rotas autenticadas, guests e roles.
- `core/interceptors`: envio automatico do JWT nas requisicoes.
- `core/layout`: shell principal com sidebar fixa e navegacao interna.
- `core/models`: contratos tipados da API.
- `core/services`: acesso HTTP e estado da sessao.
- `shared/components`: componentes visuais reutilizaveis.
- `shared/material`: agrupamento central dos imports de Angular Material.
- `features/*`: telas de login, dashboard, planner, tasks e users.

## Infra local

O projeto nao dockeriza backend nem frontend. O Docker Compose existe apenas para o PostgreSQL local:

```text
docker-compose.yml
  postgres
```

Fluxo local recomendado:

1. `npm run db:up`
2. `npm install`
3. `npm run db:migrate`
4. `npm run db:seed`
5. `npm run dev`

## Scripts da raiz

- `npm run db:up`
- `npm run db:down`
- `npm run db:migrate`
- `npm run db:seed`
- `npm run dev`
- `npm run dev:backend`
- `npm run dev:frontend`
- `npm run build`

## Endpoints implementados

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/dashboard/overview`
- `GET /api/tasks`
- `POST /api/tasks`
- `PATCH /api/tasks/:id/status`
- `GET /api/users`
- `POST /api/users`
- `PATCH /api/users/:id/role`
- `GET /api/health`
