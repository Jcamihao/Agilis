# Founder Context

Contexto de negócio do Agilis. Atualizado em 2026-11-26 para o produto v3.15.2 (master local). Fatos técnicos foram verificados no repositório; hipóteses comerciais e dados externos continuam marcados como tal.

## Negócio

- **Produto:** Agilis, SaaS B2B multiempresa de gestão de projetos e tarefas da codeStage.
- **Cliente inicial:** gestor de operações, PMO, head de produto ou CTO de empresa brasileira com 10 a 60 pessoas, três ou mais projetos ativos e uso atual de Trello, planilhas ou ClickUp.
- **Problema:** esse gestor descobre atrasos e gargalos perguntando no grupo e juntando status manualmente.
- **Proposta de valor atual:** reunir tarefas, prazos e responsáveis e transformar esses dados em Portfolio Executivo, Insights automáticos e análises da IA em português. A promessa é dar visão de onde agir, não substituir o trabalho do time.
- **Tom:** direto, prático, confiável, sem jargão corporativo. Usar “projeto”, “entrega”, “prazo”, “gargalo” e “visão executiva”. Evitar “revolucionário”, “all-in-one” e promessas sem evidência.

## Produto real em v3.15.2

Kanban, lista, calendário com iCal, sprints e burndown, tarefas recorrentes, time tracking, busca global com buscas recentes, Portfolio Executivo com score de risco, Assistente IA via Selah IA, Brief Estratégico, Insights automáticos (incluindo conflito de prazos), Workload com navegação de semana, relatórios CSV/Excel/PDF e wizard de onboarding com projeto de exemplo. Interface responsiva para celular. Convite de membros somente por link ou QR code, com validade de 1, 7 ou 30 dias; o convidado entra como membro. Recuperação de senha por e-mail existe desde a v3.12.0.

Automações saíram do produto na v3.11.0 (corte YAGNI: motor sem tração no ICP, custo de suporte alto para fundador solo). Não entra em nenhuma oferta.

**Sob observação até o dia 60 do piloto** (existem no app, decisão de corte com dado, não agora): Campos Personalizados, Templates de Tarefa, página Equipes, Aprovações.

**Limites que afetam piloto:** a sessão usa uma empresa só, sem seletor (a empresa ativa agora aparece no topo, mas trocar não existe). A produção está na v3.10.4 desde o deploy de 2026-11-16 (verificado); tudo que saiu da v3.11 à v3.15.2 está commitado na master local e ainda precisa de push + deploy — na produção de hoje ainda não há recuperação de senha nem e-mails reais, e a IA está desligada por falta de chave no Selah IA (registro de sessões anteriores, não reconferido).

Health Score, OKRs, auditoria, webhooks, chat, portal do cliente, intake forms, wiki e Gantt não fazem parte do produto. Nunca devem aparecer como promessa de venda, diferencial ou item de plano.

## Estágio e metas

- **Estágio:** beta fechado proposto. O repositório não contém CRM, pilotos, clientes ou receita; portanto esses dados precisam ser confirmados fora dele antes de serem tratados como fatos.
- **Recursos:** fundador solo, poucas horas por semana, orçamento de aquisição próximo de zero e rede inicial limitada.
- **Meta de 60 dias:** cinco times ativos em piloto e três conversas de disposição a pagar documentadas.
- **Meta de 90 dias:** uma conversão paga manual ou uma decisão explícita, baseada em evidência, de mudar ICP ou proposta.
- **Métricas:** convites enviados, respostas, conversas realizadas, pilotos iniciados, retorno na semana 2, projetos ativos por piloto e citações de preço aceitável.

## Concorrência e posição

- **Alternativas percebidas:** Trello, ClickUp, Asana, monday.com, Linear, Jira e planilhas.
- **Posição a testar:** visão executiva em português para times que já têm trabalho espalhado, sem forçar uma ferramenta de engenharia pesada.
- **Risco:** IA e Portfolio só viram diferencial se os primeiros times tomarem decisões com eles. Não alegar diferenciação comprovada antes de entrevistas e uso real.

## Oferta inicial e preço

- **Oferta de piloto:** até cinco times, 60 dias sem cobrança, onboarding assistido e conversa semanal curta. Em troca, pede-se uso em um projeto real, feedback franco e autorização explícita antes de qualquer case ou depoimento.
- **Cobrança:** não há assinatura, limites por plano, medição de uso de IA ou integração de pagamento implementados. A conversão inicial, se houver, deve ser manual e só depois da validação de disposição a pagar.
- **Landing:** os nomes Starter, Business e Enterprise são apenas apresentação comercial estática. Não representam permissões ou preços aplicados pelo sistema.

## Fonte única de trabalho comercial

1. `docs/estrategia-founder-skills.md` define a ordem e os critérios de decisão.
2. `docs/outreach-sequencia.md` define a cadência de LinkedIn do primeiro movimento.
3. Uma planilha externa, criada antes do primeiro envio, registra prospects, contexto, data de cada contato, resposta, piloto, uso e objeções.
