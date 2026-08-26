# Subrotina: Agenda de Pessoal

> Onde se anota **o que cada funcionário vai fazer** e **o que ele fez de fato**. É a porta de
> entrada da rotina de produção: ver [`00-visao-geral.md`](00-visao-geral.md). O apontamento em si,
> que é a parte da execução, tem documento próprio em
> [`05-apontamento-de-tarefas.md`](05-apontamento-de-tarefas.md).

## A ideia em 1 frase

**Uma grade de uma semana: linhas são pessoas, colunas são dias.** Preenche-se na segunda de
manhã em poucos minutos, e ela vira a agenda do dia que uma pessoa opera para a equipe inteira.

## O problema

Débora distribui tarefas verbalmente. Três consequências:

1. **Nada fica registrado**: no fim do mês ninguém sabe quanto tempo foi gasto em quê.
2. **Esquecimento é invisível**: se a irrigação do canteiro 4 não foi feita, só se descobre
   pela muda morta.
3. **Custo de mão de obra não existe**: é o maior custo do viveiro e o único que o custeio
   (P1) ainda não consegue calcular.

## As 5 decisões de desenho

### 1. Turno no planejamento, hora na execução

A unidade da agenda é **dia × turno** (manhã / tarde), nunca hora marcada. Ninguém no viveiro
planeja a semana de hora em hora, e pedir horário exato no planejamento garantiria que a agenda
não é preenchida.

**A hora aparece do outro lado**, na execução, e não custa digitação a ninguém: ela vem do relógio
quando se toca em "começar" e em "encerrar" (ver decisão 5).

**O turno não vale mais quatro horas por decreto.** A hora de início e de fim de cada turno é
**cadastro**, na tela de configurações. Muda com a estação e com a combinação da equipe, e
convenção que muda é dado, não constante escondida no código.

**Há uma exceção, e é declarada: a tarefa recorrente tem hora** (ver decisão 3). A irrigação das
sete às oito já tem horário na vida real, e é justamente por tê-lo que ela não precisa ser lançada
todo dia. O resto da agenda continua sendo turno.

### 2. Escolher, não digitar

Tudo é lista fechada: funcionário (do cadastro), tipo de tarefa (do catálogo), espécie,
recipiente e lote (quando o tipo de tarefa exigir). Campo livre só em "observação", opcional.

> Mesma regra do financeiro: **sem campo aberto = sem typo = dado que serve para somar.**

**O catálogo de tarefas comanda o formulário.** Cada tipo de tarefa tem um nome e quatro
declarações: se é **quantitativa por unidade**, se tem **lote específico**, e se exige espécie ou
recipiente. A tela não sabe nada por conta própria, e por isso "Irrigação" não pergunta lote e
"Repicar" pergunta. Cadastrar uma tarefa e deixá-la ativa é o que a faz aparecer na lista da
agenda.

### 3. Repetir é o caminho normal

A semana do viveiro se parece muito com a anterior. O botão principal da tela é
**"Copiar semana passada"**: traz tudo preenchido, e ajusta-se o que mudou. Preencher do
zero é a exceção.

Tarefas recorrentes (irrigação diária, por exemplo) deixaram de ser uma **marca** e viraram
**regra própria**: escolhe-se um funcionário ou um grupo, os dias da semana, a hora de início e de
fim, e até quando vale. Dali em diante a agenda nasce com elas dentro, sem ninguém lançar nada.

```
Nova tarefa recorrente

  Tarefa       [ Irrigação                  ▾ ]
  Quem         [ Rogério, Amélia, Jaison    ▾ ]   ← um ou um grupo
  Dias         [x] seg [x] ter [x] qua [x] qui [x] sex [x] sáb [ ] dom
  Horário      [ 07:00 ] às [ 08:00 ]
  Vale de      [ 26/08/2026 ] até [ (sem prazo) ]

  [ Salvar ]
```

> **Por que a marca não bastava.** Um "é fixa" no sim ou não dizia que a tarefa se repetia sem
> dizer **em que dias**, **em que horário** e **até quando**. Servia para copiar a semana; não
> serve para a irrigação de segunda a sábado que muda quando o verão acaba.

**O dia gerado é um dia comum.** Excluir a ocorrência de uma quarta não mexe na regra, e mexer na
regra não reescreve o que já foi trabalhado. Encerrar a recorrência é preencher a data de fim, e
não apagá-la: os dias que ela gerou continuam na agenda e no custo.

E uma tarefa pode ser lançada **para um intervalo de dias** de uma vez, em vez de cinco vezes.

### 4. A tarefa é do grupo, não da pessoa

Metade da equipe enchendo saquinho enquanto a outra metade repica é a **norma**, não a exceção.
Por isso uma atribuição tem **um grupo de funcionários**, e o mesmo turno comporta duas tarefas
com grupos diferentes.

> **Por que não uma linha por pessoa.** Escalar quatro pessoas na mesma tarefa criaria quatro
> atribuições idênticas, e a tarefa deixaria de ser uma coisa só para virar quatro coisas
> parecidas. Somar horas por tarefa passaria a depender de reconhecer que as quatro são a mesma.

### 5. O planejado vira realizado pelo relógio, e o turno é a rede de proteção

Durante o dia, quem coordena marca na faixa do funcionário quando ele **começa** e quando
**encerra**. Daí saem as horas reais.

**Onde ninguém apontou, o planejado é assumido como realizado**, pelo turno, com uma marca de
"não confirmado".

> **Por que os dois, e não um só.** Exigir apontamento sempre produziria dias sem hora nenhuma,
> e agenda com buraco não serve para calcular custo. Assumir sempre o turno, como a versão
> anterior deste documento fazia, joga fora a precisão nos dias em que alguém de fato apontou. O
> híbrido fica com o melhor dos dois: **mede quando há medida, estima quando não há, e diz qual é
> qual.**
>
> A decisão original do [`B2` §4](../../engenharia/B-requisitos/B2-especificacao-requisitos.md)
> descartou o apontamento individual para não impor **controle de ponto**, e essa preocupação
> segue de pé: quem aponta **não é o funcionário**, é quem coordena, de um aparelho só. Ninguém
> bate ponto, ninguém registra a própria entrada e saída, e o valor-hora continua sendo médio da
> equipe (ver "Do planejamento ao custo").

## As telas

### Gerência: grade da semana (planejamento)

Em tablet/computador, a grade inteira:

```
Semana de 10/08 a 15/08                    [Copiar semana passada] [Publicar]

              SEG        TER        QUA        QUI        SEX        SÁB
Rogério      Repicagem  Repicagem  Irrigação  Semeadura  Semeadura  Limpeza
Amélia       Repicagem  Repicagem  Semeadura  Semeadura  Semeadura  —
             Ipê-amar.  Ipê-amar.  Aroeira    Aroeira    Aroeira
             2026-0147  2026-0147  —          —          —
             M+T        M          M          M+T        M          M

Jaison       Separação  Entrega    Adubação   Adubação   Separação  —
             Ped. #124  Blumenau   —          —          Ped. #131
             M          M+T        M          M          M+T
```

Rogério e Amélia aparecem **na mesma célula** de segunda e terça: é uma tarefa com duas pessoas,
não duas tarefas.

No celular, a mesma agenda vira **um dia por tela**, deslizando entre os dias: a grade
completa não cabe e não deve ser espremida.

Cadastrar uma tarefa são **3 toques**: pessoas → tipo de tarefa → turno. Espécie, recipiente e
lote só aparecem se o tipo de tarefa exigir.

### Gerência: agenda do dia (execução)

É a tela do dia a dia, e está descrita em
[`05-apontamento-de-tarefas.md`](05-apontamento-de-tarefas.md): **uma linha do tempo horizontal,
com uma faixa por funcionário** e as tarefas como barras posicionadas pelo horário.

É a **primeira aba da tela inicial da Produção**; a segunda é o mapa de produção
([`04`](04-lotes-e-canteiros.md)). São as duas perguntas que se faz ao entrar no módulo: *quem
está fazendo o quê agora* e *como está o viveiro*.

### Colaborador: hoje

```
Segunda, 10 de agosto

☐  MANHÃ    Repicagem · Ipê-amarelo · lote 2026-0147 (A-3) · saco 10x18
☐  TARDE    Repicagem · Ipê-amarelo · lote 2026-0147 (A-3) · saco 10x18

            [Concluir]  → pergunta só a quantidade
```

Uma lista curta, sem menu, sem navegação. Concluir pede **um número** e nada mais, e só quando o
tipo de tarefa for quantitativo por unidade: tarefa não quantitativa conclui sem pedir nada. É a
mesma disciplina de formulário de campo já aplicada em `/producao/consumo-insumos`, inclusive a
fila offline.

O número que o colaborador informa é **o dele**. Quando quem coordena encerra a tarefa do grupo
inteiro (a tela da equipe, não a do colaborador), aparece um campo por participante: quatro
pessoas encheram saquinho, quatro números. Nunca um total dividido pelo tamanho do grupo, que
inventaria um rendimento que ninguém teve.

### Chefia: custo do período

Horas planejadas × realizadas, custo total de mão de obra e quanto disso foi para cada
espécie e cada lote.

## Do planejamento ao custo

O ponto que faltava no custeio (P1):

```
horas apontadas (fim − início)          quando houve apontamento
turnos planejados × duração do turno    quando não houve, marcado como não confirmado
                    ↓
horas  ×  valor-hora médio da equipe  =  custo de mão de obra
custo  →  rateado sobre a espécie e o lote da tarefa
```

**O valor-hora é médio da equipe, não individual.** Vem da folha do mês (financeiro)
dividida pelas horas trabalhadas no mês: um número só, atualizado mensalmente.

> **Por que médio, mesmo com apontamento.** O apontamento diz **quanto tempo** a tarefa levou, e
> essa é a informação que varia entre espécies e é a que o custeio precisa. Guardar valor-hora
> **por pessoa** transformaria a agenda num instrumento de avaliação de desempenho, o que muda a
> relação da equipe com o app e derruba o preenchimento. Medir o tempo da tarefa e não o
> rendimento da pessoa é o que mantém a ferramenta sendo de planejamento.

Tarefa **sem espécie e sem lote** (limpeza de canteiro, manutenção) é custo indireto: entra no
rateio geral, junto dos custos fixos. Tarefa **com lote** vira custo direto daquele lote.

## Modelo de dados (esboço)

| Entidade | Papel |
|---|---|
| `task_types` | catálogo de tipos de tarefa: nome, categoria, quantitativa por unidade?, lote específico?, exige espécie?, exige recipiente?. Vive nos [Cadastros](../1-cadastros/00-visao-geral.md) |
| `work_shifts` | o período de trabalho: hora de início e fim de cada turno |
| `week_plans` | a semana: `week_start`, `status` (rascunho · publicada · fechada) |
| `assignments` | a célula da grade: data, turno, tipo de tarefa, espécie?, recipiente?, lote?, área?, canteiro?, quantidade planejada, hora de início e fim quando a declara |
| `task_recurrences` | a regra da rotina fixa: tipo de tarefa, dias da semana, hora de início e fim, vigência |
| `task_recurrence_members` | o grupo que a recorrência escala |
| `assignment_members` | o grupo escalado na atribuição |
| `task_executions` | o apontamento: uma linha por pessoa, com início e fim |
| `labor_rates` | valor-hora médio por período (mês) |

Funcionário é `cadastro.parties` com papel `funcionario`: **não** `users`. Amélia e Jaison
existem na agenda mesmo sem nunca terem feito login.

## Regras invioláveis

1. **Semana fechada não muda.** Depois de fechada, correção só por lançamento de ajuste, o
   custo do mês já foi calculado em cima dela.
2. **Toda tarefa tem ao menos um responsável.** Não existe tarefa sem pessoa; existe pessoa sem
   tarefa.
3. **Tipo de tarefa vem do catálogo.** Nunca texto livre.
4. **Só a tarefa recorrente declara hora no planejamento.** O resto é turno.
5. **A regra da recorrência e o dia gerado por ela são coisas separadas.** Mexer num não mexe no
   outro.
6. **Uma pessoa faz uma tarefa por vez.** Começar outra encerra a anterior, sem perguntar.
7. **Funcionário inativo some da grade, mas não do histórico.**
8. **Colaborador só vê e edita as próprias tarefas**: a grade da semana inteira é de
   gerência e chefia (matriz RBAC, D4).

## O que isso destrava

| Destrava | Como |
|---|---|
| **P1 Custeio** | fecha a última peça: mão de obra por espécie e por lote |
| **P3 Precificação** | preço com custo real, não estimado |
| **Estoque** | produção registrada com regularidade alimenta o saldo |
| **Perdas (P2)** | perda registrada no mesmo gesto da tarefa, já ligada ao lote |
| **Indicadores (G2)** | horas por espécie, planejado × realizado, tarefas não confirmadas |

## Engenharia

| Artefato | O que esta rotina acrescentou |
|---|---|
| [`A2`](../../engenharia/A-fundacao/A2-glossario-dominio.md) | §6 nova: Turno, Tipo de tarefa, Atribuição, Apontamento |
| [`B3`](../../engenharia/B-requisitos/B3-regras-de-negocio.md) | RN-80 a RN-86; RN-48 e RN-51 emendadas; ressalvas §2.4 de três para cinco |
| [`B2`](../../engenharia/B-requisitos/B2-especificacao-requisitos.md) | §2.2.4 nova (RF-70 movido, RF-82, RF-83); RF-92 a RF-100; RF-108, RF-114 a RF-116 e RF-94 emendado em 26/08/2026 |
| [`C1`](../../engenharia/C-modelagem/C1-diagrama-casos-de-uso.md) / [`C2`](../../engenharia/C-modelagem/C2-especificacao-casos-de-uso.md) | UC-50, UC-51, UC-52 e UC-54; os dois primeiros detalhados |
| [`C6`](../../engenharia/C-modelagem/C6-modelo-entidade-relacionamento.md) / [`C8`](../../engenharia/C-modelagem/C8-dicionario-de-dados.md) | `work_shifts`, `assignment_members`, `task_expenses`; `production_activities` virou `task_executions`; `assignments` perdeu `party_id` e ganhou `shift_id` |
| [`D4`](../../engenharia/D-arquitetura/D4-matriz-rbac.md) | recursos **Apontamento**, **Período de trabalho** e **Gastos de tarefa**; §3.14 |
| [`E2`](../../engenharia/E-qualidade/E2-casos-de-teste-de-aceite.md) | TA-60 a TA-62 e TA-69 a TA-84, que fecham a lacuna declarada em `B5` §5.5 |
