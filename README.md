# Agilis

Disciplina que gera resultado

Agilis e um SaaS B2B de gestao operacional da codeStage Solucoes focado em reduzir atrasos, aumentar produtividade e automatizar a cobranca de tarefas vencidas.

## Visao geral

- Backend em NestJS 10 com Prisma, PostgreSQL, JWT e validacao com DTOs.
- Frontend em Angular 17 standalone com Angular Material e SCSS.
- Estrutura inspirada no Velo, com `backend/` e `frontend/` na raiz.
- Infra local simplificada: Docker apenas para o PostgreSQL.

## Estrutura do projeto

```text
agilis/
  backend/
    prisma/
    src/
      auth/
      common/
      config/
      dashboard/
      health/
      prisma/
      task-logs/
      tasks/
      users/
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
  docs/
  docker-compose.yml
  package.json
  package-lock.json
  .env.example
```

## Stack

### Backend

- NestJS 10
- TypeScript
- Prisma ORM
- PostgreSQL
- JWT Auth
- class-validator
- class-transformer

### Frontend

- Angular 17 standalone
- Angular Material
- SCSS
- Design system com sidebar fixa e cards premium

### Infra

- Docker Compose apenas para o PostgreSQL local
- npm workspaces na raiz

## Scripts da raiz

- `npm run db:up`: sobe o PostgreSQL local via Docker.
- `npm run db:down`: derruba os containers locais do banco.
- `npm run db:migrate`: executa `prisma migrate dev` no backend.
- `npm run db:seed`: popula a base com organizacao, usuarios e tarefas demo.
- `npm run dev`: sobe backend e frontend juntos.
- `npm run dev:backend`: sobe apenas o backend.
- `npm run dev:frontend`: sobe apenas o frontend.
- `npm run build`: builda backend e frontend.

## Como rodar localmente

1. Instale Node.js 20 e npm 10.
2. Copie `.env.example` para `.env`.
3. Suba o PostgreSQL com `npm run db:up`.
4. Instale as dependencias com `npm install`.
5. O backend e o Prisma leem automaticamente o `.env` da raiz do projeto.
6. Execute as migracoes com `npm run db:migrate`.
7. Popule a base com `npm run db:seed`.
8. Suba a aplicacao com `npm run dev`.

Versao minima suportada:

- Node.js `20.9+`
- npm `10+`

URLs locais:

- Frontend: `http://localhost:4200`
- API: `http://localhost:3000/api`
- Healthcheck: `http://localhost:3000/api/health`

## Como rodar backend e frontend separadamente

1. Suba o banco com `npm run db:up`.
2. Garanta que o `.env` exista na raiz do projeto.
3. Em um terminal, rode `npm run dev:backend`.
4. Em outro terminal, rode `npm run dev:frontend`.

## Endpoints principais

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

## Telas implementadas

- Login
- Dashboard
- Planner
- Tasks
- Users

## Credenciais seed

- Admin: `admin@agilis.local` / `Agilis@123`
- Gestor: `gestor@agilis.local` / `Agilis@123`
- Colaborador: `colaborador@agilis.local` / `Agilis@123`

O seed tambem cria tarefas exemplo em `PENDING`, `IN_PROGRESS`, `DONE` e `DELAYED`, com logs para alimentar Dashboard, Planner e Tasks logo no primeiro acesso.

## Regras de negocio

- Toda tarefa pertence a uma organizacao.
- Todo usuario pertence a uma organizacao.
- Apenas `ADMIN` e `MANAGER` gerenciam usuarios.
- Toda acao relevante de tarefa gera log.
- Um cron executa a cada minuto e marca tarefas vencidas como `DELAYED`.

## Documentacao complementar

- Arquitetura detalhada em `docs/architecture.md`

## Troubleshooting

Se aparecer erro de Angular CLI pedindo Node mais novo, ou erro de modulo nativo do `bcrypt`, sua instalacao provavelmente foi feita com Node antigo.

Fluxo recomendado para corrigir:

```bash
rm -rf node_modules frontend/node_modules
npm install
```

Antes disso, confirme que o terminal esta usando Node 20.19.5 ou superior.
