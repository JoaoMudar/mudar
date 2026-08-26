# Subrotina: Protocolo de atividades por lote

> **O que o lote tem de receber, lembre alguém ou não.** É a peça que faltava entre o lote
> ([`04-lotes-e-canteiros.md`](04-lotes-e-canteiros.md)), o catálogo de tarefas e a agenda
> ([`01-agenda-de-pessoal.md`](01-agenda-de-pessoal.md)). O apontamento, que é a execução,
> continua em [`05-apontamento-de-tarefas.md`](05-apontamento-de-tarefas.md).

**Status: especificado em 26/08/2026. Nada implementado.** Não há migration, Server Action nem
tela. O roteiro de implementação é o [`P15`](../../../plans/P15-protocolo-de-atividades.md).

## A ideia em 1 frase

**Cada lote passa a seguir sozinho uma receita de manejo**, definida por tipo de embalagem, que
gera as tarefas na agenda nas datas certas e cobra quando elas não são feitas.

## O problema

A [`01-agenda-de-pessoal.md`](01-agenda-de-pessoal.md) nomeia três consequências de distribuir
tarefa verbalmente. A segunda continua inteira mesmo depois de a agenda ficar pronta:

> **Esquecimento é invisível**: se a irrigação do canteiro 4 não foi feita, só se descobre pela
> muda morta.

A agenda registra **o que a Débora lembrou de lançar**. Se ela não lançou, o sistema não sabe que
faltou. Pior: a situação do lote (RN-93) deriva do atraso das tarefas **já lançadas**, então o lote
esquecido por completo aparece **verde**, porque não há nenhuma tarefa atrasada nele. A tela que
existe para mostrar o problema mostra o contrário do problema.

Três perguntas que hoje ninguém no viveiro consegue responder:

1. **"Este lote já foi classificado?"** Depende de alguém lembrar, e a resposta não está em lugar nenhum.
2. **"Quando é a próxima limpeza do A-3?"** Não existe "próxima": existe quando alguém olhar e achar que está na hora.
3. **"Que lotes estão atrasados agora?"** Só os que já tinham tarefa lançada e não confirmada. Os esquecidos não contam.

## Por que a tarefa recorrente que já existe não resolve

O sistema já tem `task_recurrences`, e ela **não serve para isto**. São duas coisas diferentes com
o mesmo apelido:

| | Recorrência de calendário (existe) | Protocolo do lote (esta rotina) |
|---|---|---|
| Sujeito | a equipe | **o lote** |
| Quando repete | dias da semana, hora fixa | **X dias depois da última execução real** |
| Exemplo | "irrigar de segunda a sábado, das 7h às 8h" | "limpar 90 dias depois da última limpeza deste lote" |
| Avança fase do lote | não | **as etapas sequenciais sim** |
| Se atrasar | o dia seguinte vem do mesmo jeito | **não vem ocorrência nova até a atrasada ser feita** |

As duas continuam existindo, e é certo que continuem: a irrigação da equipe é de calendário, e a
classificação do lote é de protocolo. Forçar uma na outra quebraria as duas.

## Conceitos importantes

### Protocolo

A receita de manejo de um **tipo de embalagem**. Saco e tubete têm manejos diferentes, e é isso
que separa um protocolo do outro. Os quatro sacos (10x18, 17x22, 20x26, 28x32) seguem **o mesmo**
protocolo: o que muda o manejo é ser saco, não a medida do saco.

"Outros tipos a criar" é requisito, então tipo de embalagem é **cadastro**, e não lista fechada no
código: o dia em que o viveiro adotar bandeja, a gerência cria a bandeja e monta o protocolo dela.

### Etapa

Uma linha do protocolo. Aponta para uma tarefa do catálogo (`task_types`, o mesmo de sempre) e diz
**quando** ela ocorre. Dois tipos de agendamento:

- **Sequencial**: ocorre **uma vez**, X dias depois da âncora. Ao ser concluída, **avança a fase do lote**.
- **Recorrente**: **repete para sempre**. A primeira conta da âncora; cada seguinte conta da **data real** da anterior. **Não avança fase nenhuma**.

### Âncora

O evento a partir do qual a etapa conta. **Não é sempre o mesmo ponto, e não é a etapa anterior
por padrão.** São dois casos:

- **a criação do lote**: é a âncora de "Plantar no tubete", por exemplo.
- **a conclusão de uma etapa específica**, que não precisa ser a imediatamente anterior.

**É aqui que mora o erro fácil**, e é por isso que a âncora é declarada em vez de inferida:

> "Classificar pós-germinação" conta **40 dias depois de o plantio ser concluído**, não 40 dias
> depois de o lote ser criado. A semente pode ficar dias no viveiro esperando plantio, e nesse
> intervalo ela não está germinando: está esperando. Ancorar na criação mandaria classificar mudas
> que ainda não nasceram.

### As duas datas do lote

Consequência direta da âncora, e a razão de o lote passar a ter **duas** datas onde tinha uma:

| Data | O que é | Quando é gravada |
|---|---|---|
| **Data de criação** | quando o recipiente é enchido ou encanteirado | na criação do lote. É quando ele passa a **ocupar canteiro** |
| **Data de plantio** | quando a etapa "Plantar no saco/tubete" é **concluída de fato** | pelo próprio protocolo, ao concluir a etapa |

A segunda é o **relógio real** de tudo o que depende de germinação. Enquanto o plantio não ocorre,
ela fica **vazia**, e as etapas ancoradas nela simplesmente não vencem nada. Vazio é informação:
significa "ainda não germinou", que é diferente de "germinou hoje".

### Ordem

A ocorrência de uma etapa, materializada na agenda. **É atribuição comum**, do mesmo tipo que a
Débora lança à mão, e vive na mesma grade: quem executa não precisa saber de onde ela veio. A
diferença é que ela sabe de que etapa nasceu e que ocorrência é.

### O caso "Classificar", que é duas etapas

Mesma tarefa do catálogo, duas manifestações no protocolo, e o catálogo já as separava desde
24/08/2026 justamente por isso:

| Etapa | Agendamento | Âncora |
|---|---|---|
| **Classificar pós-germinação** | sequencial, uma vez | conclusão de "Plantar no saco/tubete" |
| **Classificar seleção** | recorrente, para sempre | conclusão de "Classificar pós-germinação" |

A primeira separa o que germinou do que não germinou. A segunda separa as maiores das menores,
toda vez que trocam de bandeja. As duas produzem perda no mesmo gesto (RN-90).

## As 6 decisões de desenho

### 1. A contagem é da execução real, nunca de calendário fixo

É a decisão que define o módulo inteiro. Um protocolo de calendário diria "limpeza em janeiro,
abril, julho e outubro". O do viveiro diz "limpeza 90 dias depois da última".

A diferença aparece no atraso, que é o caso comum:

> Lote criado em janeiro, limpeza a cada 3 meses. Vence em abril e ninguém faz: fica **vermelho**.
> Continua vermelho em maio, junho, julho e agosto. Foi limpo em **15 de setembro**.
> A próxima é **14 de dezembro**, e não julho, e não outubro.

Calendário fixo produziria três limpezas vencidas acumuladas em setembro, mais uma quarta em
outubro, quinze dias depois de o canteiro ter sido limpo. Ninguém limparia, e a lista de pendências
viraria ruído que se aprende a ignorar.

### 2. Enquanto está vermelho, a contagem não reinicia sozinha

Corolário da decisão 1, e precisa ser dito à parte porque é o que impede o acúmulo: **uma etapa
tem no máximo uma ocorrência em aberto**. A ocorrência seguinte só nasce quando a atual for
executada.

Vermelho de três dias e vermelho de cinco meses são a **mesma** pendência, mais velha. Não são
duas, nem seis.

### 3. O aviso é proporcional ao intervalo, e nem toda etapa avisa

Um aviso fixo de três dias é cedo demais para o trimestral e tarde demais para o semanal. Então a
janela amarela é **percentual do intervalo da etapa**, com padrão em Configurações e possibilidade
de sobrescrever por etapa:

| Intervalo da etapa | Janela de 20% | Avisa |
|---|---|---|
| trimestral (90 dias) | 18 dias | ~18 dias antes |
| mensal (30 dias) | 6 dias | ~6 dias antes |
| semanal (7 dias) | 2 dias | 1 a 2 dias antes |

**E a etapa pode não avisar nada.** Adubo e irrigação são diários: colori-los deixaria o viveiro
inteiro vermelho toda manhã, e o mapa deixaria de ser olhado dentro de uma semana. Essas ficam com
o alerta **desligado**, e só registram feito ou não feito no dia.

Amarelo é "está chegando a hora". Vermelho é "passou". Sem cor é "isto é rotina, não é cobrança".

### 4. A ordem gerada é atribuição comum, e alterar o dia não altera a regra

Mesma decisão que a recorrência de calendário já tomou (RN-96), e pelo mesmo motivo. A ordem cai na
agenda como qualquer outra tarefa: aparece na grade da semana, no Gantt do dia, na tela do
colaborador e no apontamento. **Nenhuma tela precisa aprender um conceito novo.**

Débora pode mudar o dia, mudar o turno, excluir a ordem daquele dia. Nada disso mexe na etapa. E
mexer na etapa não reescreve ordem já emitida nem dia já trabalhado: **o passado não se reescreve.**

### 5. O tempo da espécie manda no tempo do protocolo

O protocolo do tubete diz 40 dias para classificar pós-germinação. Isso é a média. Uma espécie de
germinação lenta precisa de 70, e obrigar o viveiro a criar um protocolo inteiro só para ela seria
duplicar quinze etapas para mudar um número.

Então o cadastro da espécie permite **sobrescrever o tempo de uma etapa específica**. Preencheu,
vale o da espécie. Não preencheu, vale o do tipo de embalagem. É override pontual, não protocolo
paralelo.

### 6. Dividir o lote não recomeça o protocolo

Ao dividir um lote em dois, cada resultante **continua de onde o original estava**: mesma fase,
mesma data de última execução de cada etapa. Os dois seguem daí em diante de forma **independente**,
e podem divergir: um é limpo em outubro e o outro em dezembro, e cada um conta a partir do seu.

Recomeçar do zero mandaria classificar de novo mudas já classificadas, e plantar de novo mudas já
plantadas. Herdar é a única leitura que corresponde ao que aconteceu no canteiro: a leva é a mesma,
só passou a ocupar dois lugares.

## Como o motor funciona

Não é um serviço que roda de madrugada. **O viveiro não tem cron, e a decisão de não criar um está
registrada** na migration `20260826000003`: infraestrutura de agendamento para uma regra que a
própria tela resolve é custo sem retorno. O motor roda em dois momentos.

### Nos eventos que mudam o que ele precisa saber

| Acontece | O motor faz |
|---|---|
| **Lote é criado** | monta o acompanhamento do lote, uma linha por etapa do protocolo; resolve as âncoras que já são conhecidas; emite as ordens do horizonte |
| **Tarefa do protocolo é concluída** | grava a **data real** da execução; se sequencial, encerra a etapa, avança a fase do lote e libera as etapas que ancoravam nela; se recorrente, a próxima passa a contar dali |
| **Lote é dividido** | copia o acompanhamento para os dois filhos e encerra o original |
| **Lote encerra** (saldo zero, expedição total, divisão) | cancela as ordens em aberto e para de emitir |
| **Protocolo é editado em Configurações** | **nada.** A alteração vale só para o que ainda vai ser emitido |

### Na varredura de recuperação, quando a tela abre

Ao abrir a agenda do dia ou o mapa de produção, o motor confere todos os lotes abertos e emite o
que está faltando. **É a rede de segurança**, e é o mesmo caminho que a recorrência de calendário
já usa hoje: sem ela, um evento perdido deixaria um lote sem ordem para sempre, em silêncio.

### O que ele emite, e o que ele não emite

Emite **até 14 dias à frente** (parâmetro de Configurações). O que vence depois disso aparece na
ficha do lote como "próxima: 14/12", **sem virar linha de agenda**: emitir um ano de limpezas
trimestrais encheria a grade de tarefas que ninguém vai olhar por nove meses.

Ordem cujo vencimento **já passou** nasce com a data no passado mesmo, e nasce vermelha. É a
informação que se quer: esconder o atraso seria o mesmo que não ter o módulo.

### Em que semana a ordem cai, e com quem

A ordem entra na **semana do seu vencimento**, e o sistema abre essa semana em rascunho se ela ainda
não existir. Se a semana do vencimento já estiver **fechada**, a ordem entra na semana aberta
corrente, porque semana fechada não se altera. O que continua contando o atraso é o **vencimento**,
e não o dia em que a ordem coube na agenda: sem essa separação, empurrar a ordem para a semana
seguinte apagaria justamente o atraso que ela existe para denunciar.

E ela **nasce sem ninguém escalado**. O protocolo responde *o que* e *quando*; **quem faz continua
sendo decisão de quem monta a agenda**, que é como o viveiro já trabalha. Ela aparece como pendência
do lote até a Débora arrastar as pessoas para ela, e enquanto ninguém estiver escalado **não conta
hora nenhuma**: tarefa que ninguém pegou não consumiu mão de obra, e assumi-la como feita no
fechamento da semana inflaria o custo com trabalho que não houve.

## As telas

### Configurações: montar o protocolo

Uma lista ordenada de etapas por tipo de embalagem. Cada linha: a tarefa (escolhida do catálogo),
o rótulo, sequencial ou recorrente, o tempo em dias, a âncora (a criação do lote ou uma etapa
anterior, escolhida numa lista), o turno, o alerta ligado ou desligado, e a fase resultante quando
sequencial.

**Montar é raro, ler é frequente.** A tela pode ser densa: quem a opera é a gerência, sentada, uma
vez por safra. O que ela não pode é esconder a âncora, que é onde o erro acontece.

### Ficha do lote: o protocolo daquele lote

A mesma lista de etapas, com o que aconteceu neste lote: última execução, próximo vencimento e a
cor. É a resposta para "este lote já foi classificado?" e para "quando é a próxima limpeza".

### Mapa de produção: sem tela nova

O quadradinho do lote já mostra situação (RF-117). O que muda é **de onde a cor vem**: passa a
sair do protocolo, e não do atraso das tarefas que alguém lembrou de lançar. **É a correção do
problema desta rotina**, e não uma tela a mais.

### Agenda: sem tela nova

A ordem do protocolo é atribuição comum e aparece onde as atribuições aparecem.

## Regras invioláveis

1. **A ocorrência seguinte conta da data real da anterior.** Nunca de um slot de calendário perdido.
2. **Uma etapa tem no máximo uma ocorrência em aberto.** Atraso não acumula ocorrências.
3. **A âncora é declarada**, e não é a etapa anterior por padrão.
4. **Sequencial avança a fase, recorrente nunca avança.**
5. **Vencimento não se digita.** É derivado, como o saldo do lote e como a situação.
6. **Alteração no protocolo não retroage.**
7. **Lote encerrado não gera ordem.**
8. **A divisão herda**, e os dois filhos seguem independentes.

## Dependências com outras rotinas

| Rotina | Relação |
|---|---|
| **Cadastros** | consome tarefa (`task_types`), recipiente, espécie e período de trabalho; acrescenta o cadastro de tipo de embalagem |
| **Lotes e canteiros** | o lote ganha protocolo, a segunda data e a divisão; a situação passa a vir daqui |
| **Agenda de pessoal** | recebe as ordens emitidas, como atribuições comuns |
| **Apontamento de tarefas** | concluir a ordem é o que move o protocolo; a data real da execução é o relógio |
| **Perdas** | a classificação continua produzindo perda no mesmo gesto (RN-90); as perdas registradas contra a quantidade original zeram o lote, e o encerramento para o motor. As tarefas em que elas aparecem são as da categoria **pós-morte** do catálogo |

## O que isso destrava

| Destrava | Como |
|---|---|
| **Esquecimento deixa de ser invisível** | o lote cobra sozinho, sem depender de alguém lembrar de lançar a tarefa |
| **A cor do mapa passa a ser confiável** | deriva do que o lote **tem** de receber, e não do que alguém lançou |
| **Agenda que nasce preenchida** | a semana chega com as tarefas de manejo já dentro, e a gerência acrescenta o resto |
| **Manejo por espécie sem duplicar protocolo** | um número na espécie, e não quinze etapas paralelas |
| **Padronização do que é feito** | o manejo deixa de morar na cabeça de quem está há mais tempo no viveiro |

## Engenharia

| Artefato | O que esta rotina acrescentou |
|---|---|
| [`B2`](../../engenharia/B-requisitos/B2-especificacao-requisitos.md) | RF-121 a RF-125 em §2.2.4; §2.3.8 nova (RF-126 a RF-136) |
| [`B3`](../../engenharia/B-requisitos/B3-regras-de-negocio.md) | RN-98 a RN-111; RN-75 e RN-93 emendadas |
| [`C2`](../../engenharia/C-modelagem/C2-especificacao-casos-de-uso.md) | UC-57, UC-58 e UC-59 |
| [`C6`](../../engenharia/C-modelagem/C6-modelo-entidade-relacionamento.md) / [`C8`](../../engenharia/C-modelagem/C8-dicionario-de-dados.md) | `container_types`, `protocols`, `protocol_steps`, `species_protocol_overrides`, `batch_protocol_steps` e a visão `batch_protocol_due`; `batches`, `assignments`, `containers`, `batch_movements` e `settings` emendadas |
| [`B5`](../../engenharia/B-requisitos/B5-matriz-rastreabilidade.md) | 16 linhas novas |
| [`D4`](../../engenharia/D-arquitetura/D4-matriz-rbac.md) | recursos **Tipos de embalagem** e **Protocolo de atividades** |
| [`E2`](../../engenharia/E-qualidade/E2-casos-de-teste-de-aceite.md) | TA-87 a TA-98 |
| [`P15`](../../../plans/P15-protocolo-de-atividades.md) | o roteiro de implementação |

## Prova de mesa

Um lote de tubete, do começo ao fim, com os números do protocolo padrão. **Serve de teste de
aceite do motor**: qualquer implementação tem de reproduzir estas datas.

Protocolo do tubete, recorte:

| # | Etapa | Agendamento | Âncora | Dias | Alerta |
|---|---|---|---|---|:--:|
| 1 | Plantar no tubete | sequencial | criação do lote | 0 | ligado |
| 2 | Classificar pós-germinação | sequencial | conclusão da 1 | 40 | ligado |
| 3 | Classificar seleção | recorrente | conclusão da 2 | 60 | ligado |
| 4 | Limpar mato | recorrente | criação do lote | 90 | ligado |
| 5 | Irrigação | recorrente | criação do lote | 1 | **desligado** |

O percurso:

| Quando | O que acontece | O que o motor faz |
|---|---|---|
| **10/01** | lote criado, 1.000 tubetes no A-3 | acompanhamento montado. Etapas 1, 4 e 5 ancoram na criação e já vencem: 1 em 10/01, 4 em **10/04**, 5 em 11/01. Etapas 2 e 3 ficam **sem âncora**, e não vencem nada |
| **10/01 a 25/01** | a semente espera plantio | a etapa 2 continua sem vencimento. **Não** vence em 19/02, que é o que sairia se ancorasse na criação |
| **25/01** | plantio concluído | data de plantio do lote gravada. Etapa 1 encerrada, fase avança. Etapa 2 ganha âncora e vence em **06/03** (25/01 mais 40) |
| **27/02** | oito dias antes | a janela de 20% de 40 dias é de 8 dias: a etapa 2 fica **amarela** a partir daqui |
| **08/03** | classificação pós-germinação feita, 2 dias atrasada | etapa 2 encerrada, fase avança. Etapa 3 ganha âncora e vence em **07/05** (08/03 mais 60) |
| **10/04** | limpeza vence e ninguém faz | etapa 4 fica **vermelha**. Nenhuma ocorrência nova de limpeza é emitida |
| **10/07** | três meses de atraso | continua **a mesma** pendência, vermelha, com 91 dias. Não são duas limpezas, nem três |
| **15/09** | limpeza feita | etapa 4 registra 15/09. A próxima vence em **14/12** (15/09 mais 90). **Não** em julho, **não** em outubro |
| **todo dia** | irrigação | etapa 5 emite a ordem do dia e **nunca colore**, feita ou não |
| **20/12** | lote dividido em dois de 500 | os dois filhos herdam: a fase, a etapa 4 com última execução em 15/09 e vencimento em **14/12** (já vermelho, herdado), e a etapa 3 com o vencimento dela. **Não** recomeçam em 20/03. O original encerra com motivo "dividido" |
| **22/12** | o filho A é limpo, o B não | filho A vence a próxima em **22/03**. Filho B continua vermelho desde 14/12. **Os dois divergiram, e é o esperado** |
