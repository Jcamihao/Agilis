# Agilis — Plataforma de Gestão Operacional

Uma plataforma moderna de gestão operacional inspirada em ClickUp, Linear, Jira e Notion.

## Stack

**Backend:** NestJS · Prisma · PostgreSQL · JWT

**Frontend:** Angular 20 · Angular Material · TailwindCSS · Angular CDK

## Funcionalidades V1

- ✅ Autenticação JWT (login, cadastro)
- ✅ Multiempresa (multi-tenant)
- ✅ Equipes com membros e roles
- ✅ Projetos com cores e ícones
- ✅ Kanban Board com Drag & Drop
- ✅ Tarefas com prioridade, status, data de vencimento
- ✅ Dashboard com estatísticas
- ✅ Minhas Tarefas com filtros
- ✅ Perfil do usuário
- ✅ Design System próprio
- ✅ Animações e microinterações
- ✅ Layout responsivo

## Início Rápido

```bash
# 1. Setup inicial
chmod +x setup.sh && ./setup.sh

# 2. Iniciar banco de dados (Docker)
docker-compose up -d postgres

# 3. Migrations e seed
cd agilis-backend
npx prisma migrate dev --name init
npm run prisma:seed

# 4. Iniciar backend
npm run start:dev

# 5. Iniciar frontend (outro terminal)
cd ../agilis-frontend
npm start
```

## URLs

| Serviço | URL |
|---------|-----|
| Frontend | http://localhost:4200 |
| Backend API | http://localhost:3000/api/v1 |
| Swagger Docs | http://localhost:3000/docs |
| Prisma Studio | `npx prisma studio` |

## Credenciais Demo

```
Email: admin@agilis.app
Senha: Admin@123
```

## Estrutura

```
Agilis/
├── agilis-backend/          # NestJS API
│   ├── src/
│   │   ├── auth/            # Autenticação JWT
│   │   ├── users/           # Usuários
│   │   ├── companies/       # Empresas (multi-tenant)
│   │   ├── teams/           # Equipes
│   │   ├── projects/        # Projetos
│   │   ├── tasks/           # Tarefas + Kanban
│   │   ├── prisma/          # Prisma service
│   │   └── common/          # Filtros, interceptors
│   └── prisma/
│       ├── schema.prisma    # Modelo de dados
│       └── seed.ts          # Dados iniciais
│
├── agilis-frontend/         # Angular 20 SPA
│   └── src/app/
│       ├── core/            # Services, models, guards
│       ├── features/        # Telas da aplicação
│       │   ├── auth/        # Login + Cadastro
│       │   ├── dashboard/   # Dashboard analítico
│       │   ├── companies/   # Gestão de empresas
│       │   ├── teams/       # Gestão de equipes
│       │   ├── projects/    # Gestão de projetos
│       │   ├── kanban/      # Kanban com drag & drop
│       │   ├── my-tasks/    # Minhas tarefas
│       │   └── profile/     # Perfil do usuário
│       ├── layout/          # Sidebar + Topbar
│       └── shared/          # Componentes reutilizáveis
│
└── docker-compose.yml       # Orquestração de containers
```

## API Endpoints

### Auth
- `POST /api/v1/auth/login` — Login
- `POST /api/v1/auth/register` — Cadastro
- `GET  /api/v1/auth/me` — Perfil autenticado

### Companies
- `GET  /api/v1/companies` — Listar empresas
- `POST /api/v1/companies` — Criar empresa
- `GET  /api/v1/companies/:id/dashboard` — Stats

### Teams
- `GET  /api/v1/teams?companyId=` — Listar equipes
- `POST /api/v1/teams` — Criar equipe
- `POST /api/v1/teams/:id/members` — Adicionar membro

### Projects
- `GET  /api/v1/projects?companyId=` — Listar projetos
- `POST /api/v1/projects` — Criar projeto

### Tasks
- `GET  /api/v1/tasks/kanban/:projectId` — Board Kanban
- `GET  /api/v1/tasks/my-tasks` — Minhas tarefas
- `POST /api/v1/tasks` — Criar tarefa
- `PATCH /api/v1/tasks/:id/move` — Mover no Kanban
