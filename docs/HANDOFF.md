# Handoff do Agilis

Atualizado em 2026-11-07, logo depois de fechar a feature "convite por link / QR code" (commitada, ainda sem push). Onde algo foi só presumido ou lido de memória de sessões anteriores, o texto diz isso.

## 1. Projeto

O Agilis é um SaaS B2B multiempresa para equipes brasileiras acompanharem projetos, tarefas, prazos e responsáveis. Atende gestores de operações, PMOs, heads de produto e CTOs que hoje usam Trello, ClickUp ou planilhas. O princípio que mais pesa nas decisões é foco: só fica no produto o que melhora a gestão de projetos e a visão executiva com dados reais. Por isso foram removidos de propósito, e não devem voltar sem o dono pedir: Riscos, Centro de Operações, SLA, Gantt/dependências, Labels, status personalizados, Wiki, Centro de Processos, Webhooks, OKRs, Health Score, Auditoria, Métricas e widgets personalizáveis do dashboard. Chat em tempo real, Portal do Cliente e Intake saíram antes.

## 2. Repositório

- Caminho local: `/home/caminhao/codeStage/Agilis`. Remoto: `git@github.com:Jcamihao/Agilis.git`. Branch: `master`.
- Convenção: Conventional Commits com a versão no assunto, por exemplo `feat!: remover Auditoria (v3.7.0)`. A versão sobe em `package.json` da raiz a cada commit (semver) e o `README.md` ganha uma linha no changelog. Os `package.json` de `backend/` e `frontend/` têm versões próprias e não são usados como versão do produto.
- Rodapé de commit: `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Versão atual: **3.10.2** (a 3.10.2 é só a atualização deste handoff; a última com código é a **3.10.1**). A `master` local está **7 commits à frente** do `origin/master` (nenhum pushado): `16df666` rate limit no login/cadastro (v3.9.3), `835b35d` correção do 400 ao editar projeto (v3.9.4), `58857c6` formulários duplicados removidos (v3.9.5), `1a427c8` handoff (v3.9.6), `2d6f32d` API de convite por link (v3.10.0) `4bffc25` tela de convite por link/QR (v3.10.1) e o commit deste handoff (v3.10.2). O último commit já no remoto é `06523c4` (v3.9.2).
- Estado do working tree (verificado com `git status` ao fechar o convite): sobram só dois grupos de mudanças não commitadas, que não são do convite:
  1. **Responsividade mobile (outro agente, Codex, via extensão do VS Code):** edições em `frontend/src/app/layout/*` (main-layout, sidebar, topbar), calendar, insights-page, list-view, sprint-planning e time-report, mais `docs/mobile-responsividade-contrato.md`. Não são minhas; não commitar, reverter ou sobrescrever sem alinhar.
  2. **Documentos comerciais** (`FOUNDER_CONTEXT.md`, `docs/estrategia-founder-skills.md`, `docs/outreach-sequencia.md`).
  Também não versionados: `CLAUDE.md` e `.claude/settings.json` (criados pelo `graphify claude install`), `graphify-out/` (artefato gerado, ainda sem entrada no `.gitignore`) e `.superpowers/` (contratos de fase, ver seção 11).
- Regra do repositório compartilhado: outro agente commita e edita na mesma árvore. Nunca usar `--amend`, `reset`, `rebase`, `stash` ou `checkout` para desfazer; commitar com caminhos explícitos (`git add <arquivos>`), nunca `git add -A`.

## 3. Stack

- Backend: NestJS 10, TypeScript, Prisma 5 (migrations escritas por `prisma migrate diff`, nunca à mão), PostgreSQL 16, Redis 7 (cache e lista de tokens revogados), BullMQ só para a fila de e-mail, EventEmitter2 para eventos internos (`backend/src/events`).
- Frontend: Angular 20 standalone, signals, OnPush, Tailwind com variáveis CSS (temas claro/escuro), `@angular/cdk` (drag-drop do Kanban). Sem Angular Material, sem animations module.
- IA: serviço externo **SelahIA** (projeto irmão do dono). O Agilis chama `/v1/adapters/agilis/workspace/*` com chave própria (`SELAH_IA_API_KEY`, app `AgilisBack`). Toda IA de qualquer app do dono passa pelo Selah. Em produção a IA do Agilis está desligada (sem chave).
- E-mail: Resend em produção; sem chave cai num adapter Noop. O adapter SMTP e o `nodemailer` foram removidos na v3.6.0.
- Uploads: disco local do backend (`uploads/`), servidos em `/uploads`.

## 4. Como rodar e verificar

Variáveis de ambiente (só nomes; modelo em `backend/.env.example`): `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `PORT`, `API_PREFIX`, `CORS_ORIGIN`, `TRUST_PROXY` (opcional, número de proxies confiáveis na frente do backend; vazio = `req.ip` é o do proxy), `REDIS_HOST`, `REDIS_PORT`, `SELAH_IA_BASE_URL`, `SELAH_IA_API_KEY`, `SELAH_IA_SOURCE_APP`, `SELAH_IA_TIMEOUT_MS`, `MAIL_FROM`, `RESEND_API_KEY`.

- Subir tudo: `npm run install:all`, `npm run infra:up` (Postgres e Redis do `docker-compose.yml`), `npm run db:migrate`, `npm run db:seed`, `npm run dev`. O seed cria `admin@agilis.app` com senha de desenvolvimento; isso é só local e nunca pode existir em produção.
- Build e testes: `npm --prefix backend run build`, `npm --prefix backend test`, `npm --prefix frontend run build:prod`. Checagem de código morto: `npx tsc --noEmit -p tsconfig.json --noUnusedLocals --noUnusedParameters` (back) e `npx tsc --noEmit -p tsconfig.app.json --noUnusedLocals` (front; o aviso do `theme` em `app.component.ts` é proposital).
- Números mais recentes que EU verifiquei (v3.10.1): **73 testes de backend passando** (13 suítes), build de back e front limpos, bundle inicial 382,84 kB (limite 600 kB). O aviso NG8107 do `DashboardComponent` no build é antigo e inofensivo.
- Portas: neste computador `3000`, `3101` e `4200` são usadas por outros projetos/agentes (Hora H e o agente de responsividade roda `nest start --watch` do Agilis na `3101`). Para testar eu uso `3102` (backend) e `4399` (front estático com proxy de `/api`). Nunca derrubar processos que não subi; guardar o PID de cada um e matar só por ele. Nunca usar `pkill -f` nem `pgrep -f` (já derrubou o próprio shell duas vezes).
- Docker no WSL: o `docker` do PATH falha; usar `/mnt/c/Program Files/Docker/Docker/resources/bin/docker.exe`. O Docker Desktop precisa estar ligado. Containers do Agilis: `agilis-postgres` e `agilis-redis` (ligados agora). Há também `agilis-n8n`, `agilis-uptime` e `agilis-ollama` parados, restos de infra antiga que não são usados.
- Teste de UI real: Chrome do Puppeteer está em `/home/caminhao/codeStage/Lumen/frontend/node_modules` (usar com `--no-sandbox`). O scratchpad da sessão é apagado entre interrupções, então scripts de teste devem ser recriados. Armadilhas: rótulos em CSS `uppercase` fazem `innerText` vir em maiúsculas (comparar em minúsculas); a página de login do app é `/auth/login`; `networkidle0` nunca chega no dashboard (usar `domcontentloaded` e uma espera).
- Banco de dev (`agilis_db`, no `agilis-postgres`): tem todas as migrations aplicadas, inclusive `20261107000001_company_invites`, e sem drift (verificado). Para testes com migrations do zero, criar banco descartável no mesmo container (`create database x`, `prisma migrate deploy`, `drop database x`).
- Grafo de código: `graphify-out/` foi montado em 2026-11-07 (2.764 nós). Rodar `graphify query "<pergunta>"` antes de buscar no código e `graphify update .` depois de mudar código.

## 5. Planos e fonte única da ordem de trabalho

- Plano comercial: `docs/estrategia-founder-skills.md` é a fonte única. Ordem: lista de 40 prospects, outreach, cinco conversas, até cinco pilotos assistidos, medição de retorno e objeções, e só então decidir onboarding, importador CSV, preço e cobrança. `docs/outreach-sequencia.md` tem a cadência de LinkedIn e `FOUNDER_CONTEXT.md` o ICP, a promessa e as restrições. Atenção: parte desses textos ainda cita OKRs e Health Score, que foram removidos; reescrever antes de usar.
- Plano técnico em curso: a feature de convite por link/QR tem contrato em `.superpowers/sdd/convite-link/contrato.md` (decisões já tomadas, rotas, modelo de dados, telas). É a fonte da verdade dessa fase.
- Decisões já tomadas pelo dono nesta frente: cortar escopo agressivamente (a sequência de remoções acima), manter só gestão de projetos/tarefas, usar subagentes em tarefas grandes ou que mexem em back e front.

## 6. Onde parou

**Concluído e commitado: convite por link / QR code para a empresa ("equipe" na UI é a página Membros).**
- Contrato em `.superpowers/sdd/convite-link/contrato.md` (decisões: token aleatório de 32 bytes, só o hash sha256 vai ao banco; validade de 1, 7 ou 30 dias; entra como MEMBER; revogável; QR gerado no navegador).
- Backend (`2d6f32d`, v3.10.0): `POST/GET /invites`, `DELETE /invites/:id`, `GET /invites/:token/preview` (público), `POST /invites/:token/accept`, e `inviteToken` em `POST /auth/register`. Feito por subagente haiku, revisado por sonnet com teste vivo (13 passos) e 6 mutantes; eu conferi o código e rodei build e testes.
- Frontend (`4bffc25`, v3.10.1): aba "Link / QR code" em Membros, página pública `/convite/:token`, `?convite=` em login e cadastro. O revisor sonnet achou e corrigiu um bug grave: o QR não aparecia no bundle de produção (a lib `qrcode` é CommonJS e os nomes saem em `.default`); o dev não pegou porque só rodou `build`, sem navegador.
- Eu refiz o fluxo no navegador real contra o build de produção e banco descartável: link gerado pela UI, QR decodificado igual à URL, convidado novo se cadastra pelo link e fica com uma empresa só (MEMBER), token cru ausente do banco, token revogado dá 404.
- Não verificado: botão Compartilhar (headless não tem `navigator.share`), ADMIN que não é OWNER na aba de link, Android/iOS/Capacitor, corrida real de dois accepts simultâneos, limite de tentativas do accept.
- Sobras de `ponytail-review` não aplicadas (≈ -34 linhas, sem mudar comportamento): `createdAgo` só chama `timeAgo`; `setValidity` com ternário; um mapeador de mensagens de erro repetido em 3 arquivos; fallback `execCommand` do Copiar (pedido pelo contrato); tipo `InviteValidityDays`.

**Produção (verificado pela memória de sessões anteriores, não reconferido hoje):** o Agilis roda na VPS compartilhada (host `31.220.104.87`, acesso só por chave SSH do dono) na versão **3.9.2**, com 42 migrations, banco do Agilis separado, containers `agilis-*` com `restart: unless-stopped`. Layout: código em `/root/Agilis` (chega por `git archive`, não é clone), infra em `/root/agilis-infra/` (`docker-compose.prod.yml` com `name: agilis`, `.env.production` com permissão 600 que nunca deve ser impresso). Backend em `127.0.0.1:3040`, front em `127.0.0.1:4240`, vhost do nginx do host em `127.0.0.1:8240`. O acesso externo é um quick tunnel da Cloudflare (`trycloudflare.com`, sem domínio próprio) atrás de uma "porta de entrada" por cookie secreto no nginx, com `limit_req` de 10 por minuto em login/cadastro. IA do Agilis desligada. **As versões 3.9.3 a 3.10.1 NÃO estão em produção** e ainda nem foram pushadas. A 3.10.0 traz uma migration nova (`company_invites`), a única pendente em relação à produção.

Fatos desta sessão que o próximo agente deve saber:
- v3.8.1 corrigiu um bug grave: o `angular.json` tinha perdido o `fileReplacements`, então o build de produção apontava para `http://localhost:3000/api/v1` e o login pelo navegador ficaria quebrado. Hoje o bundle usa `/api/v1` e tem 0 ocorrências de `localhost:3000` (verificado). Nunca reintroduzir.
- v3.9.3 trouxe rate limit real no login (5 por minuto por IP + e-mail) e cadastro (10 por minuto por IP), com `AuthThrottlerGuard` e mensagem em português no 429. Contador em memória (uma instância).
- v3.9.4 corrigiu `PUT /projects/:id`, que sempre devolvia 400 porque usava o DTO de criação (exigia `companyId`); novo `UpdateProjectDto` e `companyId` no corpo agora é recusado (fecha a brecha de mover projeto de empresa).
- v3.9.5: a edição de projeto existe só no modal de configurações do Kanban (o "..." do card em Projetos abre o Kanban com `?config=1`) e a criação de sprint só na página de Sprints.

## 7. O que falta, em ordem

1. Fazer push e deploy das versões 3.9.3 a 3.10.1 (detalhes no item 4); só depois de o outro agente fechar a responsividade.
2. Decidir com o dono o que fazer com o convite por e-mail existente (ver seção 8). Recomendação: remover a aba "Por e-mail" ou fazê-la enviar o link por e-mail.
3. Responsividade mobile: o outro agente está nisso (a sidebar nasce aberta com 248 px em 390 px de largura e várias telas deixam controles fora da viewport). Esperar ele terminar e commitar antes de qualquer deploy, para não subir o front dele pela metade.
4. Fazer push e deploy das versões pendentes (3.9.3 em diante) na VPS, definindo `TRUST_PROXY` conforme a cadeia real de proxies (nginx do host mais túnel) depois de conferir que o vhost repassa o IP do cliente em `X-Forwarded-For`. O deploy leva só o que está commitado. Receita que funcionou: dump do banco, `docker tag` das imagens como `:pre-<TS>`, extrair o `git archive` em diretório novo, trocar o diretório, build, subir backend e frontend, healthcheck, com rollback pelas tags.
5. Plano comercial, que depende do dono: planilha de 40 prospects, cinco conversas, até cinco pilotos, medição na semana 2.
6. Importador CSV somente se a migração bloquear pelo menos três dos cinco pilotos. Preço, limites e cobrança só depois de evidência de uso.
7. Pendências menores: colocar `graphify-out/` no `.gitignore` e decidir se `CLAUDE.md` e `.claude/settings.json` entram no repositório; reescrever os docs comerciais sem OKR/Health Score; limpar o aviso de parâmetros não usados no backend (`actor`, `companyId`, `context`, `configService` em `jwt.strategy`), que não foi feito porque mexe em contratos.

## 8. Desafios e riscos

- **Convite por e-mail atual está quebrado e é uma armadilha.** `POST /users/company-members/invite` devolve 400 (`property email should not exist`) porque o DTO não tem validadores. Além disso, se funcionasse, criaria a conta com senha aleatória, e o app **não tem recuperação de senha** (só um link morto na tela de login). A pessoa convidada nunca conseguiria entrar. A UI ainda oferece o papel VIEWER, que não existe no enum do banco. Nada disso foi alterado, por estar fora do pedido.
- Não existe recuperação de senha. Qualquer usuário que esquecer a senha fica trancado.
- A sessão do app é de **uma empresa só** (`user.companies[0]`); não há seletor de empresa. Quem já tem outra empresa e aceita um convite entra nela, mas o app continua na primeira; e num login seguinte sem `?convite=` a empresa ativa volta a ser a primeira (verificado no navegador). Limitação aceita no contrato; resolver exige um seletor de empresa.
- O token do convite viaja na URL (`/api/v1/invites/<token>/...`) e pode cair no log de acesso do nginx na VPS. O risco é baixo (log legível só por root), mas vale excluir esse caminho do access log, como já foi feito no SSE e no `/__gate/`.
- O contador do rate limit é em memória: reinicia com o backend e só vale para uma instância. Sem `TRUST_PROXY` correto, todos atrás do proxy dividem o balde do cadastro (10 por minuto no total). O login não sofre porque a chave inclui o e-mail. Quem varia IP por trás de proxy ainda pode testar senhas em contas diferentes; a defesa completa seria bloqueio por conta.
- O nginx da VPS já limita login/cadastro por `CF-Connecting-IP`; o limite do app é defesa extra.
- Não há prova no repositório de clientes, pilotos, receita ou outreach; confirmar fora do Git.
- Não existem importador Trello/CSV, controle de planos, assinatura, cobrança ou medição de custo de IA. A landing mostra Starter, Business e Enterprise sem limites reais, e o e-mail `contato@agilis.app` e os planos são placeholders.
- Outro agente edita a mesma árvore; já houve colisão de porta (3101) e de arquivos. Conferir `git status` e `ss -ltnp` antes de subir servidor ou commitar.
- Cuidado ao rodar testes no mesmo diretório `dist/` enquanto o `nest start --watch` do outro agente está ativo: ele recompila e reinicia o servidor dele quando o `dist` muda.

## 9. Decisões abertas do dono

- O que fazer com o convite por e-mail: remover a aba, converter para "enviar o link por e-mail", ou consertar o DTO e construir recuperação de senha. Recomendação: converter para enviar o link.
- Quando subir as versões pendentes em produção (depende de o outro agente terminar a responsividade).
- Se `graphify-out/` entra no `.gitignore` e se `CLAUDE.md` e `.claude/settings.json` entram no repositório.
- Domínio próprio para o Agilis (hoje só o túnel `trycloudflare`).
- Ligar a IA em produção (exige chave do app `AgilisBack` no Selah, que é serviço ativo compartilhado; perguntar antes de tocar nele).
- Manter o ICP amplo de empresas de 10 a 60 pessoas ou estreitar por setor depois das primeiras conversas; qual cobrança manual aceitar de um piloto; qual tela é a experiência inicial de maior valor.
- Quando o convite por link existir, se um segundo papel (ADMIN) ou limite de usos por link vale a pena. Hoje o contrato diz que não.

## 10. Regras do dono e convenções

- Ler `/home/caminhao/.claude/CLAUDE.md` inteiro antes de começar. Resumo: respostas curtas em modo caveman no chat (código, commits, docs e este arquivo ficam em prosa normal); toda resposta fecha com **Lista** das pendências planejadas, **Recomendação** e **Próximo passo** (um só); o dono tem TDAH, então ser assertivo, recomendar uma opção e explicar o porquê; separar "verifiquei" de "presumi".
- Nunca fazer push, deploy, commit sem estar no fluxo de commits, envio de mensagem ou mudança externa sem pedido explícito. O dono pediu para deixar tudo sempre bem commitado, em commits separados e claros, mas push segue sob pedido.
- Nunca colocar segredo, chave, senha, token ou dado pessoal em arquivo, commit, memória ou chat. Segredo que o dono precisa fornecer entra por script que ele roda no próprio terminal, não pelo chat.
- Tarefa grande ou que mexe em backend e frontend: subagentes, um por vez. Dev com `model: "haiku"`, revisão e correção com `model: "sonnet"`, opus só se o dono pedir. Eu defino antes o contrato (arquivo compartilhado em `.superpowers/sdd/<fase>/contrato.md`), os subagentes não commitam, e no fim eu reviso tudo: diffs, build, testes, integração real no navegador e `ponytail-review`. Item de segurança sempre passa pelo revisor sonnet.
- Rodar build do front e do back ao fim de cada implementação. Ao mudar código, `graphify update .`.
- Padrões do código: Angular com `@if`/`@for` (não `*ngIf`/`*ngFor`), signals e OnPush; sem funções-seta em template; datas "só dia" em UTC (o `new Date(x).toLocale...` mostra o dia anterior no Brasil); migrations por `prisma migrate diff`; testes de backend sem `@nestjs/testing` (instanciar o service com Prisma mockado, ou subir um app Nest mínimo com `NestFactory` e chamar por `fetch`).
- A IA de qualquer app do dono passa pelo SelahIA, com prompt específico por app.

## 11. Onde estão os detalhes

- Produto e changelog completo (v3.3.3 a v3.9.5): `README.md`.
- Contrato da feature de convite: `.superpowers/sdd/convite-link/contrato.md` (pode ganhar as seções "Dúvidas do backend" e "Dúvidas do revisor do backend").
- Contrato da responsividade mobile (do outro agente): `docs/mobile-responsividade-contrato.md`.
- Contexto e plano comerciais: `FOUNDER_CONTEXT.md`, `docs/estrategia-founder-skills.md`, `docs/outreach-sequencia.md`. Skills de estratégia, GTM e outreach: `.claude/skills/`.
- Código de domínio: `backend/src/` (módulos incluindo `invites/` em andamento); interface: `frontend/src/app/`; schema e migrations: `backend/prisma/`; infraestrutura local: `docker-compose.yml`.
- Mapa do código: `graphify-out/GRAPH_REPORT.md` e `graphify query`.
- Memória do dono sobre a VPS (layout, receitas de deploy, incidentes) e sobre este projeto: `/home/caminhao/.claude/projects/-home-caminhao-codeStage/memory/` (`reference_vps_prod.md`, `project_agilis.md`).
