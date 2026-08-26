# Subrotina: Apontamento de tarefas

> Onde se registra **o que cada funcionário está fazendo agora e quanto tempo levou**. É a metade
> de execução da [agenda de pessoal](01-agenda-de-pessoal.md), que cuida do planejamento. Ver
> [`00-visao-geral.md`](00-visao-geral.md).

## A ideia em 1 frase

**Uma pessoa coordena a equipe inteira de um aparelho só**, tocando no cartão de quem trocou de
serviço.

## Situação atual

O dia começa com o plano da manhã e termina diferente dele. Chega uma carga de terra e três
pessoas param o que estavam fazendo para descarregar; o irrigador quebra e a irrigação vira
conserto; a repicagem termina antes da hora e sobra meio turno.

Nada disso fica registrado. No fim do mês existe o que foi **planejado**, e a diferença entre
isso e o que aconteceu é exatamente o que ninguém sabe medir.

## As 4 decisões de desenho

### 1. Quem aponta é quem coordena, não quem executa

O funcionário **não** registra a própria entrada e saída. Quem toca no botão é a Débora, ou quem
estiver coordenando, no cartão da pessoa.

> **Por que não o próprio funcionário.** Seria controle de ponto, e o
> [`B2` §4](../../engenharia/B-requisitos/B2-especificacao-requisitos.md) descartou isso ao
> resolver o conflito entre precisão do custo e esforço de apuração. Nove pessoas registrando a
> própria hora muda a relação da equipe com o app: ele deixa de ser onde se vê a tarefa do dia e
> vira onde se é vigiado. Um aparelho coordenando o dia é a mesma informação sem esse custo.

### 2. Começar uma tarefa encerra a anterior

Uma pessoa faz uma tarefa por vez. Tocar em "começar" numa tarefa nova **fecha a que estava
aberta**, na hora, sem perguntar nada.

> **Por que sem confirmação.** O gesto de começar outra tarefa já declara que saiu da anterior.
> Perguntar "deseja encerrar a tarefa atual?" acrescentaria um toque a algo que se repete dezenas
> de vezes por dia, para confirmar o que o próprio gesto disse. A alternativa oposta, exigir que
> se encerre antes de começar, produziria tarefas eternamente abertas justamente nos dias corridos,
> que são os dias em que a troca acontece.

**O banco garante isso, não a tela.** Duas telas abertas ao mesmo tempo burlariam uma validação de
interface, e dois apontamentos abertos contariam a mesma hora duas vezes, inflando o custo de mão
de obra: que é o número que o sistema existe para apurar.

### 3. Toda tarefa mede tempo; algumas medem também quantidade

O relógio corre em toda tarefa, porque início e fim existem sempre. O que muda é se, **além**
disso, se pergunta quanto foi feito:

| Tipo de tarefa | O encerramento pergunta | Exemplos |
|---|---|---|
| **não quantitativa** | nada | irrigação, adubação, fazer substrato, carregar |
| **quantitativa por unidade** | quantos cada um fez | encher saquinho, plantar no tubete, repicar, classificar |

É a pergunta que o viveiro já faz: **"quantos você fez hoje?"**, que só tem sentido junto com
"em quanto tempo". Quem declara isso é o catálogo de tipos de tarefa, nos Cadastros, com um
booleano só: "é quantitativa por unidade".

**Qual unidade se conta não precisa ser declarada.** Antes o catálogo distinguia "por saco" de
"por tubete", mas o recipiente já vem do lote e do próprio nome da tarefa: "Encher tubete" não
conta sacos. Duas listas dizendo a mesma coisa acabam divergindo.

**A contagem é de cada pessoa.** Quatro pessoas na mesma tarefa produzem quatro números, e não um
total dividido por quatro: o que liga a tarefa ao custo é quanto se faz por hora, e um total
rateado inventaria um rendimento que ninguém teve.

**Deixar em branco é aceito**, com o apontamento marcado como sem contagem. Hora sem contagem vale
mais do que nenhum registro.

### 4. O dia termina explicitamente

Há um botão "encerrar o dia" no cartão. Sem ele, um apontamento esquecido aberto produziria
jornada de dezoito horas e custo de mão de obra falso: por isso apontamento aberto **não conta
hora além do fim do turno**.

Encerrar por engano é comum, e reabrir o dia é um toque: recusar seria garantir que o resto do
dia não fosse registrado.

## As telas

### Gerência: agenda do dia (tela principal)

```
Segunda, 10 de agosto                              ⏱ 09:42

PLANEJADO PARA HOJE
  MANHÃ   Repicagem · Ipê-amarelo · lote 2026-0147 (A-3)   Rogério, Amélia
  MANHÃ   Irrigação                                        Jaison
  TARDE   Encher saquinho                                  Rogério, Amélia, Mathias

─────────────────────────────────────────────────────────

  ┌─ Rogério ──────────────────────────┐  ┌─ Amélia ───────────────────────────┐
  │ Repicagem · lote 2026-0147 (A-3)   │  │ Repicagem · lote 2026-0147 (A-3)   │
  │ desde 07:15   ·   2h27             │  │ desde 07:15   ·   2h27             │
  │                                    │  │                                    │
  │ [outra tarefa]      [encerrar dia] │  │ [outra tarefa]      [encerrar dia] │
  └────────────────────────────────────┘  └────────────────────────────────────┘

  ┌─ Jaison ───────────────────────────┐  ┌─ Mathias ──────────────────────────┐
  │ Carregar · Ped. #124               │  │ sem tarefa                         │
  │ desde 08:50   ·   0h52             │  │                                    │
  │ ⚠ fora do planejado                │  │                                    │
  │ [outra tarefa]      [encerrar dia] │  │ [começar tarefa]                   │
  └────────────────────────────────────┘  └────────────────────────────────────┘
```

Jaison estava escalado para irrigação e está carregando: o cartão mostra o que ele **faz**, e
sinaliza que não é o planejado. **O planejado não é alterado**: a comparação entre um e outro é
justamente o que se quer enxergar no fim do mês.

### Começar uma tarefa: o que a tela pergunta

```
Rogério · começar tarefa

  Tipo de tarefa      [ Repicar                    ▾ ]   ← planejadas para o turno vêm primeiro

  Lote                [ A-3 · Ipê-amarelo · tubete ▾ ]   ← só aparece porque "Repicar" exige lote

  [ Começar ]
```

Se o tipo de tarefa fosse "Irrigação", a segunda linha não existiria. **O catálogo comanda o
formulário**, e a tela não sabe nada por conta própria.

### Encerrar: o que a tela pergunta

```
Repicar · manhã · 3 pessoas
07:15 → 11:30   ·   4h15

  Lote                [ A-3 · ipê-amarelo · tubete ▾ ]   ← só porque "Repicar" tem lote específico

  Quantos cada um fez?                                   ← só porque "Repicar" é quantitativa
     Rogério         [  420  ]
     Débora          [  380  ]
     Marcos          [  355  ]

  Para onde foram as mudas?              ← só porque "Repicar" movimenta lote
     Recipiente  [ saco 10x18 ▾ ]
     Canteiro    [ B-1 (livre) ▾ ]
     Morreram    [  20  ]  causa [ manuseio ▾ ]

  ▸ Insumos usados        (opcional)
  ▸ Gasto extra           (opcional)

  [ Encerrar ]
```

Encerrar uma repicagem é o caso mais pesado da tela, e mesmo ele cabe numa página: os dois
últimos blocos vêm fechados, e a maioria das tarefas não abre nenhum.

**O lote é pedido uma vez, e a quantidade uma vez por pessoa.** É a diferença entre o que pertence
à tarefa e o que pertence a quem a executou. O canteiro não é perguntado: vem do lote escolhido.

**Há dois encerramentos, e este é o do grupo.** O outro é o do cartão individual, quando alguém
sai de um serviço e começa outro no meio do turno: ali fecha-se uma pessoa só. O do grupo fecha
todos de uma vez, que é como a manhã inteira de uma equipe normalmente termina.

## Insumos e gastos

**O insumo sai do estoque no mesmo gesto do apontamento.** Baixa em momento separado é baixa que
não acontece, e foi assim que o consumo deixou de ser conhecido até aqui.

**O saldo de insumo é derivado**: entradas menos consumo. Não existe campo de saldo, pelo mesmo
motivo que não existe para muda.

**Saldo negativo é gravado e sinalizado, não recusado.**

> **Por que aqui o sistema não recusa, e no lote recusa.** O saldo do lote é apurado pelo próprio
> sistema desde a entrada: negativo ali é contradição interna. O saldo de insumo depende de toda
> compra ter sido lançada, e o histórico do viveiro diz que nem toda foi. Recusar o consumo real
> por causa de uma compra não lançada faria o campo parar de registrar consumo, que é o dado mais
> caro de obter. **O negativo aqui é o alerta** de que falta lançar compra.

**Gasto extra é custo direto do lote**, não custo fixo rateado: quem pagou por ele foi aquela
leva. E **não aparece na tela do colaborador**: valor em reais não se mostra a quem executa.

## Do relógio ao custo

```
horas apontadas (fim − início)          quando houve apontamento
turnos planejados × duração do turno    quando não houve, marcado como não confirmado
                    ↓
horas  ×  valor-hora médio da equipe  =  custo de mão de obra
```

**Mede quando há medida, estima quando não há, e diz qual é qual.** O valor-hora continua sendo
médio da equipe: o apontamento mede o tempo da **tarefa**, não o rendimento da **pessoa**, e é
essa distinção que mantém a ferramenta sendo de planejamento e não de avaliação.

## Regras invioláveis

1. **Uma pessoa faz uma tarefa por vez.** Começar outra encerra a anterior, sem perguntar.
2. **Dois apontamentos abertos para a mesma pessoa é impossível**, e a garantia é do banco.
3. **O dia termina explicitamente**; apontamento aberto não conta hora além do fim do turno.
4. **Tarefa com lote específico exige o lote no encerramento**, e o canteiro vem dele.
5. **A quantidade só é pedida quando a tarefa for quantitativa por unidade**, e nunca é obrigatória.
6. **A quantidade é de cada participante**, e não da tarefa: quatro pessoas, quatro números.
7. **O planejado não é reescrito pelo realizado.** Os dois convivem, e a diferença é informação.
8. **Valor em reais não aparece para o colaborador.**

## Dependências com outras rotinas

| Rotina | Relação |
|---|---|
| **Agenda de pessoal** | fornece o planejado do dia e o grupo escalado |
| **Lotes e canteiros** | o lote é escolhido aqui, e a repicagem cria lote de dentro do encerramento |
| **Cadastros** | tipo de tarefa, período de trabalho, insumo, espécie e recipiente |
| **Perdas** | a perda da repicagem é registrada no mesmo gesto |
| **Custeio (P1)** | horas e gastos apontados viram custo de mão de obra por espécie e por lote |
| **Financeiro** | o gasto extra classificado por centro de custo |

## O que isso destrava

| Destrava | Como |
|---|---|
| **Custo de mão de obra real** | hora medida, e não estimada pelo turno, nos dias em que se apontou |
| **Planejado × realizado** | a diferença entre a agenda e o dia vira número, pela primeira vez |
| **Consumo de insumo conhecido** | a baixa acontece no gesto em que já se está registrando algo |
| **Tempo médio por tarefa** | quantos tubetes por hora, por pessoa e por espécie: alimenta o próprio planejamento |

## Engenharia

| Artefato | O que esta rotina acrescentou |
|---|---|
| [`A2`](../../engenharia/A-fundacao/A2-glossario-dominio.md) | §6: Apontamento, Atribuição, Tipo de tarefa, Turno |
| [`B3`](../../engenharia/B-requisitos/B3-regras-de-negocio.md) | RN-81 a RN-83, RN-86 a RN-89; RN-48 e RN-51 emendadas |
| [`B2`](../../engenharia/B-requisitos/B2-especificacao-requisitos.md) | §2.3.5 e §2.3.6 novas: RF-94 a RF-105 |
| [`C1`](../../engenharia/C-modelagem/C1-diagrama-casos-de-uso.md) / [`C2`](../../engenharia/C-modelagem/C2-especificacao-casos-de-uso.md) | UC-50 a UC-53 e UC-55; UC-50 e UC-51 detalhados |
| [`C6`](../../engenharia/C-modelagem/C6-modelo-entidade-relacionamento.md) / [`C8`](../../engenharia/C-modelagem/C8-dicionario-de-dados.md) | `task_executions`, `task_expenses`, `input_stock_entries` e a visão `input_stock_balance`; `input_usages` ganhou `task_execution_id` e `batch_id` |
| [`D4`](../../engenharia/D-arquitetura/D4-matriz-rbac.md) | recursos **Apontamento**, **Estoque de insumo** e **Gastos de tarefa**; §3.11 estendido e §3.14 |
| [`E2`](../../engenharia/E-qualidade/E2-casos-de-teste-de-aceite.md) | TA-74 a TA-84 |
