# G2 — Fichas de indicadores de desempenho

> **Artefato:** Fichas de indicador (KPI) · **Bloco:** G — Gestão e Business Intelligence
> **Destino no TCC:** Capítulo 4, seção 4.8 — Indicadores de desempenho
> **Fundamentação:** Sharda, Delen e Turban (2015) definem métricas de desempenho como o método
> sistemático de definir metas acompanhado de feedback periódico sobre o progresso em relação a
> elas, e caracterizam os KPIs como **multidimensionais** — contemplando estratégia, metas
> específicas, faixas de desempenho, codificações, janelas de tempo e *benchmarks*. As fichas abaixo
> seguem essa estrutura.

---

## 1. Por que este artefato

Este documento atende ao **objetivo específico nº 4** do trabalho: *definir indicadores de desempenho
padrões para monitoramento de eficiência operacional*.

A definição precisa vir antes do painel. Um indicador construído a partir do que é fácil de exibir
mede o que o sistema já sabe; um indicador definido a partir da decisão que precisa ser tomada
determina o que o sistema precisa passar a saber. Cada ficha abaixo nasce de **uma pergunta que hoje
não tem resposta** na empresa.

---

## 2. Estrutura da ficha

| Campo | Significado |
|---|---|
| **Pergunta de negócio** | A decisão que o indicador subsidia. Se não houver decisão, não há indicador |
| **Definição** | O que o número expressa, em uma frase |
| **Fórmula** | Cálculo explícito |
| **Fonte** | Entidades de onde os dados provêm |
| **Unidade** | Como o valor se expressa |
| **Janela** | Período de apuração |
| **Periodicidade** | Frequência de atualização |
| **Meta** | Valor pretendido |
| **Faixas** | Limiares que separam desempenho favorável, de atenção e crítico |
| **Comparação** | Contra o que o valor é confrontado |
| **Responsável** | Quem responde pelo indicador |
| **Perfis** | Quem o visualiza |

---

## 3. Indicadores operacionais

### IND-01 · Taxa de mortalidade por espécie

| | |
|---|---|
| **Pergunta de negócio** | Que espécies estão morrendo além do aceitável, e por quê? |
| **Definição** | Proporção de mudas perdidas em relação à produção do período, por espécie |
| **Fórmula** | `perdas do período ÷ produção do período × 100` |
| **Fonte** | Perdas, atividades de produção |
| **Unidade** | Percentual |
| **Janela** | Mês corrente e acumulado de 12 meses |
| **Periodicidade** | Diária |
| **Meta** | ≤ 10% |
| **Faixas** | Favorável ≤ 10% · Atenção 10–20% · **Crítico > 20%** |
| **Comparação** | Mês anterior, mesma espécie no ano anterior, média do viveiro |
| **Responsável** | Gerência |
| **Perfis** | Chefia, Gerência |

O limiar de 20% **não é convenção de painel: é regra de negócio** que dispara alerta ativo (RF-29).
É o único indicador do conjunto que notifica sem que alguém abra a tela.

> Este é o indicador de maior valor imediato, porque mede algo que hoje é **inteiramente
> desconhecido**. A empresa não sabe sua taxa de mortalidade — nem por espécie, nem no agregado. O
> primeiro valor que ele exibir será a primeira vez que o número existirá.

### IND-02 · Custo unitário por espécie e recipiente

| | |
|---|---|
| **Pergunta de negócio** | Quanto custa, de verdade, produzir esta muda? |
| **Definição** | Custo total de uma muda, somando custo variável e rateio do custo fixo |
| **Fórmula** | `custo variável + (custo fixo do mês ÷ produção do mês)` |
| **Fonte** | Custos de produção, consumo de insumos, custos fixos, coleta de sementes |
| **Unidade** | Reais por unidade |
| **Janela** | Mês fechado |
| **Periodicidade** | Mensal, recalculado a cada alteração de insumo |
| **Meta** | Não se aplica — é medição, não desempenho |
| **Faixas** | Sinalização por **variação**: alta superior a 15% em relação ao mês anterior exige verificação |
| **Comparação** | Mês anterior, mesmo mês do ano anterior |
| **Responsável** | Chefia |
| **Perfis** | Chefia, Gerência |

**Indicador sem meta.** O custo não é bom nem ruim em si — é insumo de decisão. Atribuir-lhe meta
induziria a otimizá-lo pela via errada, reduzindo qualidade da muda em vez de eficiência. O que se
monitora é a **variação inexplicada**.

### IND-03 · Prazo médio de produção

| | |
|---|---|
| **Pergunta de negócio** | Quando essa espécie estará pronta para venda? |
| **Definição** | Tempo decorrido entre a semeadura e a disponibilidade para venda, por espécie e recipiente |
| **Fórmula** | `média(data de disponibilidade − data de semeadura)` |
| **Fonte** | Atividades de produção |
| **Unidade** | Meses |
| **Janela** | Últimos 24 meses |
| **Periodicidade** | Mensal |
| **Meta** | Aproximar-se do tempo estimado cadastrado na espécie |
| **Faixas** | Favorável: desvio ≤ 15% do estimado · Atenção: 15–30% · Crítico: > 30% |
| **Comparação** | Tempo estimado no cadastro da espécie |
| **Responsável** | Gerência |
| **Perfis** | Chefia, Gerência |

Este indicador **corrige o próprio cadastro**: quando o realizado diverge sistematicamente do
estimado, é o valor estimado que deve ser revisto. É a via pela qual a estimativa declarada de
[`E3`, R-01](../E-qualidade/E3-analise-de-riscos.md) se converte em medição ao longo do tempo.

---

## 4. Indicadores comerciais

### IND-04 · Margem por canal de venda

| | |
|---|---|
| **Pergunta de negócio** | Qual canal dá lucro, e qual está sendo subsidiado pelos outros? |
| **Definição** | Diferença percentual entre preço praticado e custo unitário, ponderada pela quantidade vendida |
| **Fórmula** | `(receita do canal − custo das mudas vendidas) ÷ receita do canal × 100` |
| **Fonte** | Itens de pedido, preços, custo unitário |
| **Unidade** | Percentual |
| **Janela** | Mês fechado e acumulado de 12 meses |
| **Periodicidade** | Mensal |
| **Meta** | Margem mínima definida para o canal |
| **Faixas** | Favorável: ≥ meta · Atenção: entre o piso e a meta · **Crítico: negativa** |
| **Comparação** | Meta do canal, mês anterior, demais canais |
| **Responsável** | Chefia |
| **Perfis** | Chefia |

Margem negativa é **venda com prejuízo** — a situação que o trabalho existe para tornar visível. Sua
sinalização é a mais destacada do painel.

### IND-05 · Taxa de atendimento de pedidos

| | |
|---|---|
| **Pergunta de negócio** | Quanto do que é pedido nós conseguimos entregar? |
| **Definição** | Proporção da quantidade pedida efetivamente atendida com produção própria |
| **Fórmula** | `quantidade aprovada ÷ quantidade pedida × 100` |
| **Fonte** | Itens de pedido, com quantidade pedida e disponível |
| **Unidade** | Percentual |
| **Janela** | Mês fechado |
| **Periodicidade** | Semanal |
| **Meta** | ≥ 85% |
| **Faixas** | Favorável ≥ 85% · Atenção 70–85% · Crítico < 70% |
| **Comparação** | Mês anterior, mesmo mês do ano anterior |
| **Responsável** | Gerência |
| **Perfis** | Chefia, Gerência |

Indicador de **planejamento de produção**: queda sustentada indica descompasso entre o que se produz
e o que o mercado pede. Cruzado com a lista de itens indisponíveis, aponta quais espécies produzir em
maior volume.

### IND-06 · Taxa de conversão de cotações

| | |
|---|---|
| **Pergunta de negócio** | Vale a pena manter esta rede de fornecedores? |
| **Definição** | Proporção de cotações enviadas que resultam em resposta e em compra |
| **Fórmula** | `cotações respondidas ÷ cotações enviadas × 100`; e `cotações escolhidas ÷ respondidas × 100` |
| **Fonte** | Cotações e seus itens |
| **Unidade** | Percentual |
| **Janela** | Últimos 6 meses |
| **Periodicidade** | Mensal |
| **Meta** | Resposta ≥ 50% |
| **Faixas** | Favorável ≥ 50% · Atenção 30–50% · Crítico < 30% |
| **Comparação** | Período anterior; por fornecedor |
| **Responsável** | Chefia |
| **Perfis** | Chefia |

Apurado **por fornecedor**, alimenta o grau de confiabilidade do cadastro: quem nunca responde deixa
de ser consultado, e a cotação deixa de ser disparo cego.

---

## 5. Indicadores financeiros

> Todos calculados **exclusivamente sobre mês fechado** (RF-61). Mês aberto exibe travessão, não
> número.

### IND-07 · Resultado dos centros de negócio

| | |
|---|---|
| **Pergunta de negócio** | O viveiro dá lucro? |
| **Definição** | Receita menos despesa dos centros de custo de natureza empresarial |
| **Fórmula** | `Σ receitas − Σ despesas`, restrito aos centros de natureza negócio |
| **Fonte** | Lançamentos, centros de custo, rateios |
| **Unidade** | Reais |
| **Janela** | Mês fechado e acumulado do ano |
| **Periodicidade** | Mensal |
| **Meta** | Positivo |
| **Faixas** | Favorável: positivo · Atenção: entre zero e a meta · Crítico: negativo |
| **Comparação** | Mesmo mês do ano anterior, acumulado do ano |
| **Responsável** | Chefia |
| **Perfis** | Chefia |

A exclusão dos centros de natureza pessoal é o que torna este número confiável — e é precisamente
onde a apuração anterior falhava, com gasto pessoal classificado como empresarial e vice-versa.

### IND-08 · Estrutura de custo fixo

| | |
|---|---|
| **Pergunta de negócio** | Para onde vai o dinheiro do viveiro? |
| **Definição** | Composição percentual da despesa do centro viveiro, por categoria |
| **Fórmula** | `despesa da categoria ÷ despesa total do centro × 100` |
| **Fonte** | Lançamentos, categorias |
| **Unidade** | Percentual |
| **Janela** | Mês fechado e acumulado de 12 meses |
| **Periodicidade** | Mensal |
| **Meta** | Não se aplica |
| **Faixas** | Sinalização por variação: categoria que altera mais de 20 pontos percentuais exige verificação |
| **Comparação** | Mês anterior, média dos 12 meses |
| **Responsável** | Chefia |
| **Perfis** | Chefia |

Alimenta o rateio de IND-02: o custo fixo do custeio deixa de ser valor estimado e passa a ser o que
efetivamente saiu da conta.

### IND-09 · Fila de lançamentos pendentes

| | |
|---|---|
| **Pergunta de negócio** | A rotina de classificação está sendo cumprida? |
| **Definição** | Quantidade e valor de lançamentos ainda não classificados |
| **Fórmula** | `contagem e soma dos lançamentos em situação a classificar` |
| **Fonte** | Lançamentos |
| **Unidade** | Quantidade e reais |
| **Janela** | Momento atual |
| **Periodicidade** | Contínua |
| **Meta** | Zero ao fim de cada semana |
| **Faixas** | Favorável ≤ 10 · Atenção 10–50 · Crítico > 50 |
| **Comparação** | Semana anterior — **a tendência importa mais que o valor** |
| **Responsável** | Chefia |
| **Perfis** | Chefia |

**Indicador de processo, não de negócio.** Mede se o sistema está sendo alimentado, e é o alerta
precoce de que todos os demais indicadores financeiros deixarão de ser confiáveis. Uma fila que
cresce por três semanas seguidas antecipa exatamente o modo de falha que inviabilizou a apuração
anterior.

---

## 6. Painel por perfil

Sharda, Delen e Turban (2015) descrevem o dashboard em três camadas — **monitoramento**, **análise** e
**gestão** —, e recomendam sinalizar por cores, setas ou símbolos se o número representa algo
positivo ou negativo, de modo a acelerar a compreensão do cenário.

| Perfil | Indicadores | Camada predominante |
|---|---|---|
| **Chefia** | IND-01 a IND-09 | Monitoramento e gestão — decisão sobre preço, produção e finanças |
| **Gerência** | IND-01, IND-02, IND-03, IND-05 | Monitoramento e análise — operação, sem exposição financeira |
| **Colaborador** | Nenhum | Não acessa indicadores |

A restrição de IND-04 e IND-06 a IND-09 à chefia decorre diretamente da matriz de acesso
([`D4`](../D-arquitetura/D4-matriz-rbac.md)): margem, resultado e estrutura de custo são informação
financeira e concorrencialmente sensível.

**Onde este painel mora.** Os indicadores deixaram de ser subsistema próprio no reagrupamento de
19/08/2026: são os painéis do **módulo 4 · Financeiro**, em `/financeiro/indicadores` — o número
só é confiável depois que o mês fecha, e quem o fecha é o financeiro (RF-61).

Isso **não** fecha o painel para a gerência. O Financeiro restringe *por recurso*, não pela porta
do módulo ([`D4 §3.2`](../D-arquitetura/D4-matriz-rbac.md)): a base bancária é de chefia e
administrador, e o recurso *Indicadores* é `L` para a gerência — "L (parcial)" na matriz é
exatamente a linha desta tabela. A gerência entra na área e vê os quatro indicadores que são
dela; os cinco financeiros não são renderizados para o perfil, nem em travessão.

### Codificação visual

| Situação | Codificação |
|---|---|
| Favorável | Marcação de estado positivo, com seta na direção da melhora |
| Atenção | Marcação intermediária |
| Crítico | Marcação de estado crítico, **acompanhada de rótulo textual** |
| Sem dado | **Travessão**, jamais zero |

Duas regras deliberadas: a codificação nunca é apenas cor — acompanha símbolo e rótulo, para não
depender de percepção cromática; e **ausência de dado exibe travessão e não zero**, porque zero é um
valor e a ausência não é. Um mês incompleto exibindo zero produziria a mesma variação falsa que
invalidou a apuração anterior.

---

## 7. Dependências

Nenhum indicador funciona sem seus dados de origem. A tabela registra o que precisa existir antes de
cada um passar a ter significado.

| Indicador | Depende de |
|---|---|
| IND-01 | Registro contínuo de perdas e de produção |
| IND-02 | Levantamento primário completo — o mais crítico ([`E3`, R-01](../E-qualidade/E3-analise-de-riscos.md)) |
| IND-03 | Histórico de produção de ao menos um ciclo completo |
| IND-04 | IND-02 e preço registrado por canal |
| IND-05 | Verificação de disponibilidade em uso corrente |
| IND-06 | Cotações em uso corrente |
| IND-07 a IND-09 | Importação e classificação do extrato, com mês fechado |

**IND-02 é a raiz.** Sem custo apurado não há margem, e sem margem o trabalho não responde à sua
pergunta de pesquisa. É a mesma dependência que faz do custeio o primeiro projeto do cronograma.
