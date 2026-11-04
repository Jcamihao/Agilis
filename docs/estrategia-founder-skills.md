# Agilis: estratégia (founder-skills)

Gerado em 2026-10-14 com `strategic-planning`, `go-to-market-plan` e `pricing-strategist`, a partir de [FOUNDER_CONTEXT.md](../FOUNDER_CONTEXT.md).

## Premissas (documentadas, como as skills exigem)

- Estágio: pré-lançamento, **zero usuários, zero receita**, v3.1.1.
- Fundador solo, **poucas horas por semana, orçamento ~R$ 0, rede zero** no público-alvo.
- Alvo: times internos de empresas brasileiras (suposição: 10 a 60 pessoas). Agências ficaram de fora porque o produto removeu Portal do Cliente e Intake Forms.
- Horizonte: primeiros sinais em 60 a 90 dias.
- Verificado no código: **não existe importador (Trello/CSV) nem módulo de cobrança/planos**.
- Preços de concorrentes vêm de sites de terceiros e podem estar desatualizados. Confirme nas páginas oficiais antes de publicar qualquer comparação.

## Diagnóstico em uma frase

O gargalo não é marketing. É **ter 5 times usando de verdade**. Sem isso, não dá para saber se a IA e o Health Score importam para alguém, e qualquer canal vira ruído.

---

# 1. strategic-planning: as 3 próximas jogadas

### Jogada 1: Design partners por abordagem direta (começar por esta)

**Estratégia:** Oferecer 60 dias grátis, com onboarding feito por você, a 5 gestores de empresas pequenas. Em troca, pedir uso semanal e uma conversa de 20 minutos por semana. Sem rede, a abordagem direta é o único caminho que não custa dinheiro.

**Playbook:**
1. Montar lista de 40 gestores (operações, PMO, head de produto, CTO de empresas de 10 a 60 pessoas) no LinkedIn.
2. Enviar nota de conexão sem pitch: mencionar um problema concreto ("saber o que está atrasado sem perguntar no grupo").
3. Para quem aceitar, mensagem curta oferecendo o piloto grátis e pedindo 20 min.
4. Fazer o onboarding por videochamada com os projetos reais deles.
5. Registrar toda objeção e todo uso em uma planilha.

**Métricas:** convites enviados (40), aceites (meta 25%), pilotos ativos (meta 5), times que voltam na semana 2.
**Resultado esperado:** 3 a 5 pilotos em 30 dias. A taxa de aceite de convite frio é incerta; o número é uma estimativa, não garantia.
**Faça hoje:** listar 10 perfis que se encaixam e salvar a dor que cada um já postou.

### Jogada 2: Tirar a fricção de troca (importador de Trello e CSV)

**Estratégia:** Hoje quem usa Trello ou planilha precisa recriar tudo à mão para testar o Agilis. Um importador transforma "vou testar" em 5 minutos. Como não existe no código, isso é trabalho de produto, não de marketing.

**Playbook:**
1. Importador do JSON exportado do Trello (quadros, listas, cartões, membros) para projeto e tarefas.
2. Importador CSV genérico para planilhas.
3. Ao importar, gerar o Health Score e o primeiro Brief Estratégico automaticamente. É o momento "uau".
4. Oferecer o importador a cada piloto da Jogada 1.

**Métricas:** % de pilotos que importam dados reais, tempo até o primeiro Health Score.
**Resultado esperado:** quase todos os pilotos com dados reais na primeira semana.
**Faça hoje:** exportar um quadro seu do Trello e olhar a estrutura do JSON.

### Jogada 3: Conteúdo em português que gera os primeiros contatos

**Estratégia:** Publicar uma vez por semana um caso real ("como descobri em 10 segundos que este projeto estava em risco") com tela do Health Score. Serve de prova para a Jogada 1 e atrai quem busca alternativa em português.

**Playbook:**
1. Post semanal no LinkedIn e em comunidades de gestão e tecnologia, usando dados do seed ou de pilotos autorizados.
2. Uma página "Agilis vs Trello e ClickUp" em português, com comparação verificável.
3. Link nos convites da Jogada 1.

**Métricas:** visitas à página, respostas a DMs, cadastros vindos do conteúdo.
**Resultado esperado:** pouco tráfego no começo. Serve mais como credibilidade nos convites do que como canal.
**Faça hoje:** escrever o rascunho do primeiro post com uma captura do Health Score.

## Prioridade

**Comece pela Jogada 1.** Ela custa só tempo e é a que gera aprendizado. Faça a Jogada 2 em paralelo, porque o primeiro piloto vai pedir o importador. A Jogada 3 vem depois, quando houver um caso real para mostrar.

## Critérios de sucesso

- 5 pilotos ativos em 45 dias.
- 3 deles ainda ativos na semana 4.
- 1 piloto dizendo que pagaria, com valor citado.

---

# 2. go-to-market-plan: 3 estratégias de entrada

**Cunha de mercado:** gestor de empresa pequena que acompanha vários projetos em Trello ou planilha e não tem visão consolidada. É um alvo estreito de propósito.

### Estratégia 1: Programa de design partners

É a Jogada 1 acima. Gera os casos de uso e a prova social que as outras estratégias precisam. **Marco:** 5 pilotos em 30 dias, 2 casos documentados em 60, 1 conversão paga em 90.

### Estratégia 2: Product-led por migração

**Estratégia:** Entrada gratuita e fácil para quem já usa Trello, com importador e um plano grátis genuinamente útil.
**Playbook:** importador (Jogada 2); plano Grátis até 3 usuários; demo pública com dados de exemplo, sem cadastro; e-mail curto no dia 3 mostrando o Health Score do que ele importou.
**Métricas:** cadastros, % que importa dados, % ativo na semana 2.
**Marco:** 30 cadastros e 10 importações em 60 dias.
**Faça hoje:** definir quais limites o plano Grátis terá.

### Estratégia 3: Comunidades e parcerias de nicho

**Estratégia:** Entrar em comunidades onde gestores brasileiros de projeto já conversam (grupos de PMO e gestão ágil, comunidades de tecnologia). Dar ajuda real antes de mencionar o produto.
**Playbook:** escolher 3 comunidades; responder dúvidas por 2 semanas; depois oferecer o piloto a quem tiver o problema; abrir uma conversa com 2 consultores de gestão ágil para indicarem o Agilis aos clientes deles.
**Métricas:** respostas úteis por semana, pedidos de piloto, indicações recebidas.
**Marco:** 2 pilotos vindos de comunidade em 60 dias.
**Faça hoje:** entrar em 3 comunidades e observar por 3 dias as perguntas que mais se repetem.

**Ordem:** 1, depois 2, depois 3. A estratégia 3 só funciona bem depois que existe um caso real para citar.

**Critério de sucesso:** 5 pilotos em 45 dias; 10 importações reais em 60; 1 cliente pagante em 90.

---

# 3. pricing-strategist: estratégia de preço

**Tipo:** SaaS em camadas, por usuário. **Por quê:** B2B, assinatura por usuário foi sua escolha, e ticket acima de R$ 200 por mês por time pede lógica por assento. O custo variável da IA justifica limitar o uso por camada.

**Referências (USD, anual, de sites de terceiros; confirmar nas páginas oficiais):** Trello Standard ~US$ 5 e Premium ~US$ 10; ClickUp Unlimited ~US$ 7 e Business ~US$ 12; Asana Starter ~US$ 10,99; monday Basic ~US$ 9 (mínimo de 3 assentos). Convertido a cerca de R$ 5,50 por dólar (câmbio suposto, ajuste), isso dá aproximadamente R$ 27 a R$ 66 por usuário.

### Grátis
- **Preço:** R$ 0
- **Para quem:** times de até 3 pessoas testando, e porta de entrada da migração
- **Inclui:** até 3 usuários, 3 projetos, kanban, lista, calendário, 20 mensagens de IA por mês
- **Justificativa:** concorrentes também têm plano grátis; sem ele o produto desconhecido não é testado. Limites de usuários e projetos empurram o upgrade.

### Time (camada principal)
- **Preço:** R$ 39 por usuário/mês | R$ 374 por usuário/ano (20% de desconto)
- **Para quem:** time de 5 a 30 pessoas que sai do Trello
- **Inclui:** usuários e projetos ilimitados, sprints, OKRs, Health Score, Insights, automações, time tracking, IA com 200 mensagens por usuário
- **Justificativa:** abaixo do Trello Premium e do ClickUp Business em reais, acima do Trello Standard. O Health Score e a IA justificam pagar mais que o Trello básico.

### Gestão
- **Preço:** R$ 69 por usuário/mês | R$ 662 por usuário/ano
- **Para quem:** diretor ou PMO que acompanha vários projetos
- **Inclui:** tudo do Time, mais Portfolio Executivo, Brief Estratégico IA, Workload, relatórios CSV/Excel/PDF, auditoria, webhooks, IA ampliada
- **Justificativa:** próximo ao ClickUp Business em reais. Funciona como âncora para o Time parecer razoável.

**Preço de fundador (pilotos):** 60 dias grátis e depois 50% de desconto por 12 meses no plano que usarem. Valor sugerido, não validado.

### Táticas psicológicas
- **Âncora:** o plano Gestão faz o Time parecer barato.
- **Preço charmoso (39, 69):** no plano principal, para parecer valor pensado.
- **Desconto anual de 20%:** aversão à perda; quem paga mensal vê o que deixa de economizar.

### Gatilhos de upgrade
- Grátis para Time: chegar ao 4º usuário, ao 4º projeto ou ao limite de IA.
- Time para Gestão: precisar de visão consolidada de vários projetos (Portfolio, Brief) ou de relatório para diretoria.

### Otimização de receita
- Cobrança anual desde o início, para reduzir churn.
- Pacote extra de IA, quando o consumo justificar.
- Revisar preço após 10 pilotos com a pergunta "quanto você pagaria?".

### Maior risco de preço
**Custo da IA sem medição.** Eu não sei quanto cada mensagem custa no Selah IA. Se o custo médio por usuário passar de cerca de 20 a 25% do preço, o plano Time perde a margem-alvo de 75 a 80%. Antes de publicar preço: medir custo por mensagem e confirmar que os limites de IA cobrem o pior caso.

**Pré-requisito técnico:** o código não tem planos nem cobrança. Para cobrar, será preciso construir isso. Nos pilotos, cobrança manual (Pix) resolve sem código.

---

# Pontos de atenção

1. **O produto não tem como cobrar nem importar hoje.** Os dois são lacunas de código, não de estratégia.
2. **Mercado lotado.** Trello, ClickUp e Asana já têm IA. O diferencial real é "visão executiva em português", e isso só é hipótese até um piloto confirmar.
3. **README desatualizado:** o título diz v2.5.0, o changelog e o package.json dizem 3.1.x.
