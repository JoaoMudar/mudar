# Subrotina: Lotes e canteiros

> Onde se responde **onde cada leva de mudas está e de onde ela veio**. É a terceira subrotina da
> produção, listada em [`00-visao-geral.md`](00-visao-geral.md) desde o começo e escrita em
> 24/08/2026, quando o lote entrou no escopo do sistema.

## A ideia em 1 frase

**O viveiro tem endereço: área A, canteiro 3.** O que ocupa aquele canteiro é um lote, e o lote
sabe de que leva veio e quanto ainda tem vivo.

## Situação atual

O Gilberto sabe de cabeça o que tem em cada canteiro. Aponta com o dedo e diz "aquele ali é ipê
de março". Ninguém escreve isso em lugar nenhum, e três coisas decorrem daí:

1. **A tarefa de campo é dada apontando.** "Vai limpar o mato lá do quatro." Quem não estava na
   conversa não sabe qual é o quatro, e o que foi feito não fica registrado em canto nenhum.
2. **A mortalidade só se mede sobre a espécie inteira.** Se o ipê perdeu 30%, não se sabe se foi
   uma leva que deu errado ou se a espécie inteira vai mal. São problemas diferentes, com causas
   e providências diferentes.
3. **Ninguém sabe quanto de uma semeadura chega à venda.** Semeia-se mil, repica-se uma parte,
   morre outra, vende-se o resto: as três quantidades existem, mas soltas, e não há como ligá-las.

## O problema de escopo, e por que ele mudou

**"Lote" esteve fora do escopo até 24/08/2026.** O [`A1` §7](../../engenharia/A-fundacao/A1-documento-de-visao.md)
o excluía por dois motivos, e o [`A2`](../../engenharia/A-fundacao/A2-glossario-dominio.md) o
tinha entre os termos deliberadamente não adotados, por ambiguidade. Os dois motivos caíram:

| Motivo original | Por que caiu |
|---|---|
| "Exigiria disciplina de registro incompatível com a operação" | A disciplina já existe fora do sistema: o viveiro planta por leva e sabe dizer o que está em cada canteiro. Falta o registro escrito. E o lote é **escolhido de uma lista**, não digitado |
| "O agregado por espécie e recipiente basta" | Não basta. Sem lote não se diz onde a muda está, a mortalidade só se mede sobre a espécie inteira, e a repicagem vira uma soma que entra e outra que sai, sem ligação |
| "A palavra designa coisas distintas" (glossário) | A ambiguidade era entre leva de semeadura, conjunto à venda e carga. Amarrando o termo a **um canteiro e uma leva plantada junta**, sobra um sentido só. Os outros dois continuam sendo *item de pedido* e *carga* |

**O limite não sumiu, subiu de altura**: o rastreamento vai até o lote, **nunca até a muda**. Muda
com identidade própria exigiria etiqueta e leitura unitária, e isso continua fora de escopo.

## Conceitos importantes

### Área e canteiro

O viveiro é dividido em **áreas** identificadas por letra (A, B, C). Cada área tem **canteiros**
numerados de 1 até o máximo dela.

**A numeração recomeça em cada área.** Existe o canteiro 4 da área A e o canteiro 4 da área B, e
são dois lugares diferentes. É como a equipe já fala, e o sistema não inventa nomenclatura nova.

### Lote

Uma leva de mudas da **mesma espécie**, no **mesmo recipiente**, plantada junta, ocupando **um**
canteiro. Guarda a quantidade que entrou, quanto ainda tem vivo, em que fase está e desde quando.

**Um lote ocupa um canteiro.** Leva que não cabe em um canteiro é **outro lote**.

> **Por que não um lote espalhado por vários canteiros.** Custaria um nível de indireção em toda
> tela que pede lote, para representar o que dois lotes já representam. E a pergunta que a
> operação faz é "o que tem neste canteiro", que um lote por canteiro responde direto.

### Lote de origem

Quando a muda passa do tubete para o saco, ela muda de recipiente. E recipiente define porte,
custo e preço: comercialmente, virou outra coisa.

Por isso **a repicagem não move o lote**. Ela baixa parte do lote de origem e cria um lote novo
que aponta para ele.

```
Lote 2026-0147 · A-3 · Ipê · tubete · 500 mudas
        │
        ├── repica 300 ──→  Lote 2026-0182 · B-1 · Ipê · saco 10x18 · 300 mudas
        ├── morrem 20   ──→  perda registrada no lote 2026-0147
        └── restam 180 em 2026-0147, que continua no A-3
```

**É essa cadeia que responde a pergunta que o viveiro nunca pôde responder**: de cada mil
sementes semeadas, quantas mudas chegaram à venda. Basta percorrer os `lote de origem` e comparar
as pontas.

### Movimento

Toda mudança no saldo do lote deixa uma linha, com motivo: entrada, perda, saída de repicagem,
entrada de repicagem, venda, ajuste de contagem, transferência de canteiro.

**O saldo é a soma dos movimentos.** Ninguém digita saldo, nem a gerência: corrigir um lote errado
se faz com uma **contagem física**, que gera o movimento de ajuste.

## As telas

### Gerência: ocupação do viveiro (tela principal)

```
Ocupação do viveiro                                    [+ Novo lote]

ÁREA A
  A-1   Aroeira · tubete · 1.200      semeado em 12/06   pronto ~ 12/12
  A-2   Aroeira · tubete · 800        semeado em 12/06   pronto ~ 12/12
  A-3   Ipê-amarelo · tubete · 180    semeado em 03/03   ⚠ 64% repicado
  A-4   livre

ÁREA B
  B-1   Ipê-amarelo · saco 10x18 · 300   repicado de A-3 em 20/08
  B-2   livre
  B-3   Canela · saco 17x22 · 450        repicado de A-7 em 02/07   pronto ~ 02/01
```

Canteiro livre é canteiro **sem lote aberto**. Lote que zera encerra sozinho e libera o canteiro.

### Gerência: ficha do lote

```
Lote 2026-0147 · Ipê-amarelo · tubete
Canteiro A-3 · plantado em 03/03/2026 · previsão 03/11/2026

Saldo: 180 mudas          (entrou com 500)

MOVIMENTOS
  03/03   entrada             +500
  18/05   perda (geada)        −40    Rogério
  20/08   saída p/ repicagem  −300    → lote 2026-0182
  20/08   perda (manuseio)     −20    na repicagem
  ────────────────────────────────
                               180
```

O histórico **explica o saldo**: a soma da coluna reproduz o número de cima. Divergência entre os
dois é defeito detectável, não ambiguidade.

### Colaborador: escolher o lote

O colaborador nunca abre uma tela de lote. Ele **escolhe** um lote nos formulários em que o tipo
de tarefa exige, de uma lista dos canteiros ocupados, e o único lote que chega a criar é o que
nasce da repicagem, dentro do gesto de encerrar a tarefa.

## Regras invioláveis

1. **Um lote ocupa um canteiro.** Leva que não cabe é outro lote.
2. **Nenhum lote tem saldo negativo.** Baixa maior que o saldo é recusada: significa que a
   contagem está errada, e gravar o negativo propaga o erro para o estoque.
3. **Lote com saldo zero está encerrado**, sai da ocupação e permanece no histórico.
4. **O saldo não se digita.** É a soma dos movimentos, e corrige-se por contagem física.
5. **A repicagem cria lote novo ligado ao de origem.** Nunca move o lote existente.
6. **Toda diferença na repicagem tem causa.** Se saíram 300 e entraram 280, os 20 viram perda no
   mesmo registro: diferença sem explicação seria evaporação silenciosa.

## Dependências com outras rotinas

| Rotina | Relação |
|---|---|
| **Cadastros** | consome espécie, recipiente, área e canteiro |
| **Agenda de pessoal** | a tarefa que exige lote o recebe daqui; a repicagem cria lote de dentro do apontamento |
| **Perdas** | a perda passa a ser **do lote**, e com isso ganha lugar sem ganhar campo |
| **Estoque** | o estoque da espécie é a soma dos lotes abertos dela, menos o que saiu |
| **Custeio (P1)** | gasto e hora de tarefa com lote viram custo direto daquele lote |

## O que isso destrava

| Destrava | Como |
|---|---|
| **Mortalidade por leva** | a regra dos 20% passa a apontar **qual plantio** deu errado, não só qual espécie |
| **Aproveitamento da semeadura** | percorrer a cadeia de lote de origem responde quantas mudas saíram de mil sementes |
| **Tarefa de campo executável** | "limpar o mato do A-3" deixa de depender de quem estava na conversa |
| **Perda com lugar** | o formulário continua com quatro campos, e o local vem de graça |
| **Previsão de disponibilidade** | por lote, e não por espécie: dois lotes da mesma espécie ficam prontos em datas diferentes |

## Engenharia

| Artefato | O que esta rotina acrescentou |
|---|---|
| [`A1`](../../engenharia/A-fundacao/A1-documento-de-visao.md) | §7: lote saiu do fora-de-escopo, com a justificativa da revisão declarada; entrou "rastreamento individual da muda" |
| [`A2`](../../engenharia/A-fundacao/A2-glossario-dominio.md) | verbetes Lote, Lote de origem, Área, Canteiro e Classificação; "Lote" saiu dos termos não adotados |
| [`B3`](../../engenharia/B-requisitos/B3-regras-de-negocio.md) | RN-74 a RN-79 e RN-90 |
| [`B2`](../../engenharia/B-requisitos/B2-especificacao-requisitos.md) | §2.3.4 nova (RF-84 a RF-91); RF-80 e RF-81 em §2.2.1 |
| [`C1`](../../engenharia/C-modelagem/C1-diagrama-casos-de-uso.md) / [`C2`](../../engenharia/C-modelagem/C2-especificacao-casos-de-uso.md) | UC-46, UC-47, UC-48 e UC-49; UC-47 e UC-48 detalhados; UC-17 emendado |
| [`C6`](../../engenharia/C-modelagem/C6-modelo-entidade-relacionamento.md) / [`C8`](../../engenharia/C-modelagem/C8-dicionario-de-dados.md) | `areas`, `beds`, `batches`, `batch_movements`; `loss_events` e `stock_counts` ganharam `batch_id` |
| [`D4`](../../engenharia/D-arquitetura/D4-matriz-rbac.md) | recursos **Áreas e canteiros** e **Lotes**; §3.13 |
| [`E2`](../../engenharia/E-qualidade/E2-casos-de-teste-de-aceite.md) | TA-59 e TA-63 a TA-68 |
| [`auditoria-divergencias.md`](../../auditoria-divergencias.md) | achado L: o conflito entre `A1`/`A2`/`C2` e o `P2`, e a decisão que o resolveu |
