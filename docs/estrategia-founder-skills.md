# Agilis: plano de validação comercial

Atualizado em 2026-11-07 para o produto v3.9.2. Fonte de contexto: [FOUNDER_CONTEXT.md](../FOUNDER_CONTEXT.md). Este plano substitui as referências antigas a Health Score, OKRs, Auditoria e Webhooks.

## Estado de partida

- O código passou por redução de escopo até a v3.9.0. O último trabalho funcional conhecido foi simplificar o dashboard e corrigir o build de produção.
- O produto atual já tem o necessário para um beta fechado: projetos, tarefas, calendário, Portfolio, Insights, IA, automações e onboarding.
- O repositório não prova que exista piloto, cliente, receita, lista de prospects ou histórico de outreach. Trate a aquisição como não iniciada até haver uma planilha externa com esses dados.
- Não há importador Trello/CSV, planos aplicados pelo backend, cobrança ou medição de custo por mensagem de IA.

## Hipóteses a validar

1. Gestores de times internos de 10 a 60 pessoas pagariam para não montar status manualmente de vários projetos.
2. Portfolio, Insights e IA dão valor depois que um projeto real está preenchido.
3. A troca manual de dados é um bloqueio relevante o bastante para justificar um importador.

O gargalo agora é evidência de uso, não mais escopo de produto.

## Movimento 1: cinco pilotos assistidos

**Por quê:** sem uso real, não há como decidir preço, importador ou mensagem de venda. O founder pode fazer o onboarding manualmente antes de construir mais software.

**Oferta:** 60 dias sem cobrança para até cinco times. Cada time escolhe um projeto real; o founder ajuda a configurar empresa, projeto, membros, tarefas e prazos. Em troca, pede uma conversa de 20 minutos por semana e feedback direto. Não prometer resultado, case ou depoimento.

**Playbook:**

1. Criar uma planilha com: nome, empresa, cargo, tamanho estimado, ferramenta atual, sinal de dor, URL do LinkedIn, data de convite, resposta, reunião, piloto, retorno semana 2, objeção e preço citado.
2. Selecionar 40 gestores que tenham três ou mais projetos ativos, ou publiquem sobre atraso, acompanhamento, Trello, ClickUp ou planilha.
3. Enviar 10 convites personalizados por dia útil durante quatro dias, usando a sequência de [outreach](outreach-sequencia.md).
4. Em cada conversa, descobrir: como o status é consolidado, qual projeto está mais difícil, que ferramenta usam, quanto tempo gastam cobrando atualização e o que impediria uma troca.
5. Para cada aceite, conduzir onboarding de um único projeto e combinar o primeiro check-in em sete dias.

**Métricas e decisão:**

| Até quando | Sinal | Meta | Decisão |
|---|---|---:|---|
| Dia 7 | Convites enviados | 40 | Sem lista de 40, parar de planejar produto e completar a lista. |
| Dia 21 | Conversas de descoberta | 5 | Abaixo de 5, reescrever ICP e primeira mensagem. |
| Dia 30 | Pilotos ativos | 2 | Abaixo de 2, revisar dor e oferta antes de criar importador. |
| Dia 60 | Pilotos ativos | 5 | Com 5, consolidar objeções e decidir a próxima melhoria. |
| Dia 60 | Retorno na semana 2 | 3 | Abaixo de 3, investigar onboarding e valor percebido antes de cobrar. |

**Faça primeiro:** montar os primeiros 10 nomes com um sinal de dor específico para cada um.

## Movimento 2: migrar dados como serviço, validar importador depois

**Por quê:** o importador pode reduzir atrito, mas construir Trello e CSV agora é aposta. Primeiro medir se a entrada manual impede o piloto.

**Playbook:**

1. No onboarding, migrar um projeto pequeno com o time, manualmente, em até 30 minutos. Registrar tempo, campos que faltaram e a reação do usuário.
2. Mostrar o valor com o que existe: Portfolio para visão consolidada, Insights para atrasos e tarefas paradas, e IA/Brief para leitura do contexto. Não citar Health Score.
3. Marcar “migração” como objeção somente quando o prospect disser que a entrada de dados impede ou adia o teste.
4. Abrir o projeto de importador somente se três dos primeiros cinco pilotos trouxerem essa objeção ou se a configuração manual ultrapassar 30 minutos em três casos.
5. Se o gatilho ocorrer, fazer primeiro CSV de tarefas com colunas mínimas: título, projeto, responsável, status, prioridade e prazo. Trello JSON vem depois, se houver demanda comprovada.

**Métricas:** minutos para o primeiro projeto utilizável, número de objeções de migração, número de projetos ativos por piloto e uso de Portfolio/Insights na semana 2.

**Faça primeiro:** preparar uma planilha modelo com as seis colunas mínimas, sem iniciar código.

## Movimento 3: prova antes de escala

**Por quê:** conteúdo comparativo e parcerias sem caso real viram opinião. Um piloto que volta na semana 2 produz mensagem, objeção e linguagem melhores do que uma página genérica “vs. Trello”.

**Playbook:**

1. Depois de dois pilotos retornarem na semana 2, registrar uma página interna por piloto: dor inicial, fluxo usado, dado que chamou atenção, decisão tomada e fala literal do gestor.
2. Publicar um post semanal no LinkedIn só com dado autorizado ou com cenário claramente demonstrativo. O tema é “como identificar o projeto que precisa de atenção”, não “Health Score”.
3. Depois de um caso autorizado, criar uma página comparativa factual: quando Trello/planilha bastam, quando o Agilis ajuda, e quais capacidades ainda não existem. Não usar preços de concorrentes sem verificação oficial na data da publicação.
4. Só então abordar três comunidades de PMO/operações e dois consultores de gestão. Entrar oferecendo a conversa de diagnóstico, não um cupom.

**Métricas:** dois relatos internos completos até o dia 45, um caso autorizado até o dia 60, respostas originadas de conteúdo e pilotos por indicação.

**Faça primeiro:** definir o formulário de entrevista de semana 2 com cinco perguntas: uso, decisão tomada, momento de valor, atrito e disposição a pagar.

## Preço: hipótese, não configuração do produto

Hoje não existe cobrança nem controle de plano. Por isso, a única política válida é piloto gratuito de 60 dias e cobrança manual apenas para quem disser que continuaria usando.

Antes de publicar preços ou construir billing, perguntar a cada piloto ativo:

1. “Se o Agilis deixasse de existir amanhã, o que você perderia?”
2. “Para continuar usando com este time, que faixa mensal pareceria justa?”
3. “Que recurso ou limite faria você trocar de plano?”

Não alterar os rótulos da landing nem implementar limites até haver pelo menos três respostas de preço e evidência de retorno na semana 2. A conta de custo por mensagem da Selah IA também precisa existir antes de prometer franquias de IA.

## Ordem única de execução

1. Criar planilha e lista de 40 prospects.
2. Enviar outreach e conduzir cinco conversas.
3. Onboardar até cinco pilotos com um projeto real.
4. Medir retorno e objeções na semana 2.
5. Decidir: melhorar onboarding, construir CSV ou ajustar ICP.
6. Só com evidência, produzir case, conteúdo, preço público e cobrança.

## Critério de sucesso aos 90 dias

- Cinco pilotos iniciados e ao menos três retornando na semana 2.
- Três entrevistas contendo uma faixa de preço aceitável.
- Uma conversão manual paga ou uma decisão documentada de reposicionar ICP, promessa ou onboarding.

## Decisões que continuam abertas

- O ICP inicial deve ser mantido como empresas de 10 a 60 pessoas, ou deve ser limitado a um setor específico depois das primeiras conversas?
- Qual método de cobrança manual o fundador aceita usar se alguém quiser continuar após o piloto?
- O uso real confirma que Portfolio e Insights são a primeira experiência de valor, ou outra tela assume esse papel?
