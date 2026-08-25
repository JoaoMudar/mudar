# B3: Regras de negócio e vínculo com os requisitos

> **Artefato:** Catálogo de regras de negócio · **Bloco:** B, Engenharia de requisitos
> **Destino no TCC:** Capítulo 4, seção 4.3, Regras de negócio (os quadros formatados estão em [`B4`](B4-quadros-tcc.md))
> **Fundamentação:** Sommerville (2011) distingue os **requisitos de domínio**, os que derivam do
> domínio de aplicação e não da vontade do usuário, dos requisitos de usuário e de sistema. As
> regras aqui catalogadas são a expressão desse domínio: valem no viveiro independentemente da
> existência do software. Elmasri e Navathe (2011) sustentam a parte final, em que a regra se
> materializa como restrição de integridade no modelo de dados.

---

## 1. Como usar este documento

O documento tem uma finalidade dupla:

1. **Fonte do capítulo de regras de negócio** do TCC.
2. **Arquivo de alimentação** para geração automatizada das tabelas do trabalho. As seções 3, 4, 5 e
   6 são estruturadas para consumo direto: identificadores estáveis, uma regra por linha, sem
   informação implícita.

### Instruções para quem for gerar as tabelas a partir deste arquivo

- **Não invente identificadores.** `RN-01` a `RN-91` (regras, das quais RN-36, RN-49, RN-54, RN-60, RN-61, RN-63, RN-64, RN-65 saíram do catálogo
  e cujos números não se reutilizam), `RF-01` a `RF-107` (requisitos
  funcionais), `RNF-01` a `RNF-26` (não funcionais) e `RE-1` a `RE-8` (restrições) são os únicos
  válidos. A numeração de RF/RNF vem de [`B2`](B2-especificacao-requisitos.md) e a de RE de
  [`A1`](../A-fundacao/A1-documento-de-visao.md) §9.
- **Não converta regra em requisito.** Se o texto gerado começar com "O sistema deve", ele pertence
  a `B2`, não a este documento.
- **Um requisito pode servir a mais de uma regra**, e uma regra costuma originar vários requisitos.
  A relação é muitos-para-muitos: não force cardinalidade 1:1 nas tabelas.
- **A seção 6 é parte do resultado, não sobra.** Os requisitos que não decorrem de regra de negócio
  decorrem de restrição do ambiente ou de política do projeto, e isso é um achado a apresentar.
- O texto integral de todos os RF e RNF está no **apêndice (seção 7)**, para que a geração das
  tabelas não dependa de abrir `B2`.

### Tabelas sugeridas para o trabalho

| Tabela | Colunas | Fonte neste arquivo |
|---|---|---|
| Catálogo de regras de negócio | RN · Enunciado · Tipo · Requisitos originados | Seção 3 |
| Regras por área do domínio | Área · Quantidade de regras · Regras | Seção 3 |
| Rastreabilidade regra → requisito | RN · RF · RNF | Seção 3 (colunas 5 e 6) |
| Rastreabilidade inversa | RF · Regra que o origina | Seção 4 |
| Origem dos requisitos não funcionais | RNF · Regra ou restrição de origem | Seção 5 |
| Requisitos sem regra de negócio | RF/RNF · Origem alternativa | Seção 6 |

---

## 2. Convenções

### 2.1 O que é e o que não é regra de negócio

Critério adotado: **apague mentalmente o sistema**. Se o enunciado continua verdadeiro na operação do
viveiro, é regra de negócio. Se ele desaparece junto com o software, é requisito.

| | Regra de negócio (aqui) | Requisito funcional (`B2`) | Requisito não funcional (`B2`) |
|---|---|---|---|
| Formulação | "Nenhuma venda ocorre abaixo do piso mínimo" | "O sistema deve impedir que o preço fique abaixo do piso" | "Formulários de campo devem ter no máximo cinco campos" |
| Origem | O negócio | A regra, traduzida em comportamento | Restrição do ambiente ou política |
| Sobrevive sem o sistema | Sim | Não | Não |

### 2.2 Tipos de regra

Classificação adotada neste catálogo:

| Tipo | Significado | Exemplo |
|---|---|---|
| **Fato** | Afirma uma estrutura do domínio que o sistema precisa representar | RN-04: espécie e recipiente formam o produto |
| **Restrição** | Proíbe ou limita uma ação | RN-21: nenhuma venda abaixo do piso |
| **Derivação** | Define como um valor se obtém a partir de outros | RN-07: composição do custo unitário |
| **Acionamento** | Dispara uma providência quando uma condição se verifica | RN-17: mortalidade acima de 20% |

### 2.3 Notação das colunas

- **Documentada em**: onde a regra já aparece registrada no projeto, antes deste catálogo.
- **RF originados**: requisitos funcionais que existem *porque* a regra existe.
- **RNF vinculados**: requisitos não funcionais que a regra exige ou condiciona. A maioria das
  regras não gera RNF: os não funcionais deste projeto derivam predominantemente das restrições do
  ambiente (ver seção 6). Célula vazia é informação, não omissão.

### 2.4 Cinco regras que são convenção, não fato observado

O critério da seção 2.1 (apague o sistema e veja se o enunciado sobrevive) é limpo para quase
todo o catálogo, e áspero para cinco regras da área C, todas nascidas ao desenhar a agenda de
pessoal e o apontamento:

| RN | Por que merece ressalva |
|---|---|
| **RN-48** | Que o viveiro planeje **por turno** é observação. Que o turno tenha uma **duração única declarada** é convenção: foi fixada para tornar o custo de mão de obra apurável onde não houver apontamento. A versão original dizia "quatro horas" no próprio enunciado; com RN-85 o número saiu da regra e virou parâmetro, mas a convenção continua sendo convenção |
| **RN-50** | "A semana fecha e, fechada, não se altera" descreve uma disciplina que o viveiro **passará a ter**, não uma que já tinha. É pré-requisito de custo estável, e por isso vale como regra, mas é regra imposta pelo projeto ao negócio, não colhida dele |
| **RN-51** | Assumir o planejado como realizado é **escolha metodológica** diante de dado faltante. A alternativa (agenda com buraco) inviabiliza o custo do período; a condição fica registrada justamente para que a suposição não se disfarce de medição. Com o apontamento, a suposição passou a ser o **caso de exceção** em vez do caso único |
| **RN-83** | "Uma pessoa faz uma tarefa por vez" é **verdade da operação** (ninguém repica e irriga ao mesmo tempo), mas o **encerramento automático da anterior** é convenção do sistema. Ela existe para que a troca de serviço custe um toque e não dois, e a alternativa (exigir que se encerre antes de começar) produziria tarefas eternamente abertas |
| **RN-86** | Que o dia termine é fato. Que o **apontamento esquecido aberto seja truncado no fim do turno** é convenção defensiva: sem ela, relógio esquecido ligado produz jornada impossível e custo falso. É arbitragem sobre dado faltante, da mesma família de RN-51 |

Registrar a ressalva é mais defensável do que reclassificá-las como requisito: elas governam a
operação, e não a interface. Mas ao escrever o capítulo, atribuí-las à observação do viveiro seria
inexato: a origem correta das cinco é **ORG**, política do projeto, e é assim que `B2` as marca
(RF-73, RF-75, RF-97 e RF-100).

**As demais regras novas da área C não precisam de ressalva.** Área, canteiro, lote, categoria de
tarefa e forma de medição (RN-74 a RN-82, RN-84, RN-85, RN-87 a RN-91) descrevem o viveiro como
ele funciona hoje, sem sistema nenhum: as áreas têm letra, os canteiros têm número, planta-se por
leva, e já se diz "fiz tantos saquinhos hoje". Apague o sistema e os enunciados sobrevivem. RN-91
é do mesmo tipo: quem diz quantos saquinhos fez é cada um, e não o grupo.

---

## 3. Catálogo de regras de negócio

### 3.1 Área A: Domínio e produto

| RN | Enunciado | Tipo | Documentada em | RF originados | RNF vinculados |
|---|---|---|---|---|---|
| **RN-01** | Toda informação do viveiro (custo, preço, estoque, perda, pedido) refere-se a uma **espécie**; a espécie é a unidade em torno da qual a operação se organiza | Fato | `A2` §1; `C6` §1; `CLAUDE.md` | RF-08, RF-19, RF-26 | - |
| **RN-02** | A espécie possui **um nome científico e vários nomes populares regionais**; a mesma espécie é chamada por nomes diferentes conforme a região e o interlocutor | Fato | `A2` §1 | RF-08, RF-09 | RNF-08, RNF-25 |
| **RN-03** | Uma espécie admite **várias características simultâneas**, nativa, exótica, frutífera, ornamental, madeireira, forrageira. Uma nativa pode ser ao mesmo tempo frutífera e madeireira | Fato | `A2` §1 | RF-08, RF-09 | RNF-02 |
| **RN-04** | O **recipiente determina o porte da muda** e, por consequência, seu custo e seu preço. Espécie e recipiente formam o par que identifica um produto comercializável: a mesma espécie em dois recipientes são dois produtos | Fato | `A2` §2; `CLAUDE.md` | RF-10, RF-14, RF-15, RF-19, RF-22, RF-26, RF-41, RF-53, RF-68 | - |
| **RN-05** | O ciclo produtivo (semeadura, germinação, repicagem, rustificação) tem **duração conhecida por espécie e recipiente**; a data de disponibilidade decorre da data de semeadura somada a essa duração | Fato | `A2` §1 | RF-08, RF-19, RF-21 | - |
| **RN-06** | **Só a muda pronta compõe estoque comercializável.** Muda em produção não é estoque de venda | Restrição | `A2` §1 | RF-21, RF-22, RF-42 | - |

### 3.2 Área B: Custeio

| RN | Enunciado | Tipo | Documentada em | RF originados | RNF vinculados |
|---|---|---|---|---|---|
| **RN-07** | O **custo unitário** de uma muda é o custo variável (substrato, semente, recipiente, demais insumos e mão de obra) somado ao custo fixo do período rateado sobre a produção, sempre específico por espécie e recipiente | Derivação | `A2` §4; `CLAUDE.md` | RF-10, RF-12, RF-14, RF-15, RF-16, RF-17 | - |
| **RN-08** | O preço do insumo **varia ao longo do tempo**, e o custo apurado em um período permanece válido para aquele período: o valor anterior não é descartado | Fato | `B2` RF-11 | RF-11, RF-18 | - |
| **RN-09** | Alteração em insumo, custo fixo ou consumo **invalida o custo unitário anterior** das espécies afetadas | Acionamento | `B2` RF-18 | RF-18 | - |
| **RN-10** | A mão de obra compõe o custo por **tempo médio estimado por atividade**, e não por apontamento individual de horas, precisão suficiente para revelar margem negativa, sem impor controle de ponto por tarefa | Derivação | `B2` §5 (conflito 3) | RF-15, RF-19, RF-20 | RNF-01 |
| **RN-11** | A semente coletada em campo **tem custo próprio** (deslocamento, combustível e horas), rateado pela quantidade obtida. Nem toda espécie tem semente comprada | Derivação | `A2` §1 | RF-13, RF-15 | - |
| **RN-12** | O gasto pertence ao **mês de competência**, não ao mês em que o dinheiro saiu: o substrato comprado em fevereiro e pago em abril é custo de fevereiro, porque foi em fevereiro que virou muda | Derivação | `A2` §4 | RF-12, RF-16, RF-59 | - |
| **RN-53** | A mão de obra entra no custo por um **valor-hora médio da equipe** (folha do mês dividida pelas horas do mês), e não pelo salário de cada um. O que varia entre espécies é o tempo gasto, não quem o gastou; e o custo fica real sem expor remuneração individual | Derivação | `plans/P13`; `B2` §5 | RF-76 | RNF-12 |
| **RN-56** | A tarefa que **não se refere a uma espécie** é custo indireto e entra no rateio geral, junto dos custos fixos. Limpar canteiro e consertar cerca são trabalho do viveiro inteiro, e atribuí-los a uma espécie qualquer falsearia o custo dela | Derivação | `rotinas/2-producao/01-agenda-de-pessoal.md`; `plans/P13` T13.20 | RF-16, RF-76 | - |

### 3.3 Área C: Produção, estoque e perdas

| RN | Enunciado | Tipo | Documentada em | RF originados | RNF vinculados |
|---|---|---|---|---|---|
| **RN-13** | A quantidade disponível de uma espécie é **produção registrada menos perdas menos vendas** | Derivação | `B2` RF-22 | RF-19, RF-22, RF-42, RF-51 | RNF-05 |
| **RN-14** | A **contagem física prevalece** sobre a quantidade calculada: onde os dois divergem, o que vale é o que foi contado no viveiro | Restrição | `B2` RF-23 | RF-23, RF-25 | - |
| **RN-15** | Espécie **zerada ou abaixo da quantidade mínima** compromete o atendimento e precisa ser sinalizada antes que o pedido chegue | Acionamento | `B2` RF-24 | RF-24 | - |
| **RN-16** | A perda é evento **normal** da produção e exige **causa classificada em lista fechada**, seca, praga, geada, manuseio, outro. Campo livre inviabiliza a análise por causa | Restrição | `A2` §1 | RF-26, RF-27 | RNF-01, RNF-02, RNF-05 |
| **RN-17** | A **mortalidade** é a razão entre mudas perdidas e mudas produzidas, por espécie e período. Acima de **20%** a situação é anormal e exige providência | Acionamento | `A2` §1; `G2`; `CLAUDE.md` | RF-27, RF-28, RF-29, RF-65 | - |
| **RN-18** | A muda perdida **carrega o custo já incorrido**: a perda tem valor financeiro, não apenas quantidade | Derivação | `B2` RF-30 | RF-30 | - |
| **RN-48** | O trabalho do viveiro é **planejado** por turno, não por horário: a unidade da agenda é dia × turno (manhã, tarde). Ninguém ali monta agenda de hora em hora, e exigir horário exato no planejamento garantiria agenda não preenchida. **A duração do turno vem do período de trabalho cadastrado** (RN-85), não de constante | Fato | `plans/P13`; `rotinas/2-producao/01` | RF-71, RF-76, RF-83 | RNF-01 |
| **RN-50** | A semana **fecha** e, fechada, não se altera: sem isso o custo do período muda depois de apurado | Restrição | `plans/P13` | RF-73 | - |
| **RN-51** | As horas do período saem do **apontamento quando ele existe**; onde não houve apontamento, a tarefa planejada **conta como realizada** pelo turno, com a condição registrada. Agenda com buraco não serve para calcular custo, e assumir o planejado sinalizando a dúvida é mais honesto do que não ter dado | Derivação | `plans/P13`; `rotinas/2-producao/05` | RF-75, RF-100 | - |
| **RN-52** | O colaborador responde pelas **suas** tarefas: vê e conclui as que lhe foram atribuídas, e nenhuma outra | Restrição | `D4` §3.11 | RF-74 | RNF-01, RNF-02 |
| **RN-57** | Só **semeadura e repicagem somam ao estoque**; irrigação, adubação e rustificação são manejo e não alteram quantidade. É o que define o que conta como produção em RN-13 | Fato | `C8` §`task_types`; `rotinas/2-producao/02-estoque.md` | RF-19, RF-22 | RNF-02 |
| **RN-74** | O viveiro é dividido em **áreas identificadas por letra** (A, B, C…), e cada área tem **canteiros numerados** de 1 até o máximo dela. O endereço de uma muda no viveiro é esse par | Fato | `A2` §1 | RF-80, RF-81, RF-85 | - |
| **RN-75** | **Lote é a leva de mudas da mesma espécie, no mesmo recipiente, plantada junta.** É a unidade de rastreamento da produção: sem ela não se diz onde a muda está nem de que leva veio | Fato | `A2` §1; `A1` §7 | RF-84, RF-87, RF-91 | - |
| **RN-76** | **Um lote ocupa um canteiro.** Leva que não cabe num canteiro é outro lote, e não o mesmo lote espalhado | Restrição | `rotinas/2-producao/04` | RF-84, RF-85 | - |
| **RN-77** | A **repicagem para recipiente maior cria lote novo** ligado ao de origem: a leva muda de identidade quando muda de tamanho, porque tamanho define produto, custo e preço. É o vínculo com a origem que permite saber quanto de uma leva chegou à venda | Derivação | `A2` §1; `rotinas/2-producao/04` | RF-86, RF-87 | - |
| **RN-78** | **Nenhum lote tem saldo negativo.** Movimento que levaria o saldo abaixo de zero é recusado: significa que a contagem está errada, e gravar o negativo propaga o erro para o estoque | Restrição | `rotinas/2-producao/04` | RF-88 | - |
| **RN-79** | **Lote com saldo zero está encerrado**: sai da ocupação do canteiro e permanece no histórico. Canteiro livre é canteiro sem lote aberto | Restrição | `rotinas/2-producao/04` | RF-89, RF-85 | - |
| **RN-80** | Toda tarefa do viveiro pertence a uma de **seis categorias**: semente, terra, plantio, manutenção, pós-morte e expedição. É como a equipe já agrupa o trabalho ao falar dele, e é como as horas se somam no relatório. A categoria **classifica, não comanda formulário** | Fato | `A2` §6 | RF-70 | RNF-02 |
| **RN-81** | **Toda tarefa é medida por tempo.** Parte delas é **também contada por unidade**, e a pergunta do viveiro é "quantos fez em quantas horas", não só quantos fez. Qual unidade se conta não precisa ser declarada: vem do lote e do próprio nome da tarefa | Fato | `A2` §6 | RF-70, RF-98, RF-107 | - |
| **RN-82** | Tarefa que trabalha **mudas já plantadas identifica o lote**, e o lote carrega o canteiro, a espécie e o recipiente. Sem ele a atividade não se liga à leva, e nem a perda nem o custo encontram destino | Restrição | `rotinas/2-producao/05` | RF-82, RF-99 | - |
| **RN-83** | **Uma pessoa faz uma tarefa por vez.** Começar outra encerra a anterior: quem saiu do serviço saiu, e duas tarefas abertas para a mesma pessoa contariam a mesma hora duas vezes | Restrição | `rotinas/2-producao/05` | RF-95, RF-97 | - |
| **RN-84** | Uma **tarefa admite vários executores**, e o mesmo turno admite **várias tarefas em curso** com grupos diferentes. Metade da equipe enchendo saquinho enquanto a outra metade repica é a norma, não exceção | Fato | `rotinas/2-producao/01` | RF-92, RF-94 | - |
| **RN-85** | O **período de trabalho** (hora de início e de fim de cada turno) é **parâmetro mantido**, não constante. Muda com a estação e com a combinação da equipe, e é dele que sai a duração do turno que RN-48 usa | Fato | `rotinas/2-producao/01` | RF-83, RF-100 | - |
| **RN-86** | O **dia do funcionário termina explicitamente**. Apontamento deixado aberto não conta hora além do fim do turno: relógio esquecido ligado produziria jornada de dezoito horas e custo de mão de obra falso | Restrição | `rotinas/2-producao/05` | RF-96, RF-100 | - |
| **RN-87** | **Insumo consumido na tarefa sai do saldo no mesmo gesto do apontamento.** Baixa em momento separado é baixa que não acontece | Derivação | `rotinas/2-producao/05` | RF-101 | RNF-05 |
| **RN-88** | O **saldo de insumo é derivado**: entradas menos consumo. Não há campo de saldo, pelo mesmo motivo que não há para muda (RN-13), guardar o número cria duas verdades sobre ele | Derivação | `A2`, termos não adotados | RF-102, RF-103, RF-106 | - |
| **RN-89** | **Gasto extra da tarefa é custo direto** do lote e da espécie trabalhada, e não custo fixo rateado: quem pagou por ele foi aquela leva | Derivação | `rotinas/2-producao/05` | RF-104 | - |
| **RN-90** | A **classificação separa mortas de vivas**, e a parte morta **vira perda do lote no mesmo registro**. Separar num momento e registrar a perda noutro é como a perda deixa de ser registrada | Derivação | `A2` §1; `rotinas/2-producao/04` | RF-91, RF-99 | RNF-01 |
| **RN-91** | A **quantidade realizada é de cada pessoa, e não da tarefa**. Quatro pessoas enchendo saquinho produzem quatro números, e não um dividido por quatro: o que liga a tarefa ao custo é quanto se faz por hora, e um total rateado inventaria um rendimento que ninguém teve. Deixar em branco continua aceito, hora sem contagem vale mais do que registro nenhum | Restrição | `rotinas/2-producao/05` | RF-98, RF-107 | RNF-01 |

### 3.4 Área D: Precificação

| RN | Enunciado | Tipo | Documentada em | RF originados | RNF vinculados |
|---|---|---|---|---|---|
| **RN-19** | O preço de venda é **custo unitário real mais a margem do canal**, nunca estimativa intuitiva | Derivação | `A2` §3; `CLAUDE.md` | RF-17, RF-31, RF-32 | - |
| **RN-20** | O **canal de venda** é lista fechada de cinco, atacado (padrão), compensação ambiental, paisagismo, prefeitura, varejo, e determina a margem. O mesmo produto tem preços diferentes por canal, e isso é regra, não exceção | Fato | `A2` §3; `CLAUDE.md` | RF-31, RF-41 | RNF-02 |
| **RN-21** | **Nenhuma venda ocorre abaixo do piso mínimo de segurança**, independentemente da negociação | Restrição | `A2` §3; `C2` UC-26 FE-1 | RF-33, RF-44 | - |
| **RN-22** | O **piso mínimo varia por canal e por espécie**: não é constante única do sistema | Fato | `C6` §5 | RF-33 | - |
| **RN-23** | O **frete** é calculado por R$/km e **incorporado ao preço**, não cobrado à parte | Derivação | `A2` §3; `CLAUDE.md` | RF-34, RF-55 | - |
| **RN-24** | **Margem negativa é venda com prejuízo** e precisa ser detectada e destacada: hoje ela ocorre sem que ninguém perceba | Acionamento | `A2` §4; `A1` §2 | RF-35, RF-64 | - |
| **RN-58** | O preço vale por um período, e a **margem de uma venda se afere contra o custo vigente no dia em que ela foi feita**, sobrescrever o custo apagaria a resposta para "qual era a margem quando eu vendi" | Derivação | `C6` §5 | RF-17, RF-35 | - |
| **RN-59** | O preço calculado é **sugestão**: o valor acordado pode diferir dele, desde que não desça abaixo do piso. A negociação por WhatsApp existe, e tratar o preço como imposto falsearia o que de fato se cobrou | Restrição | `C6` §5; `A1` §8 PR-4 | RF-32, RF-33, RF-44 | - |

### 3.5 Área E: Cliente e obrigação fiscal

| RN | Enunciado | Tipo | Documentada em | RF originados | RNF vinculados |
|---|---|---|---|---|---|
| **RN-25** | O cliente é **pessoa física ou jurídica**; a venda com nota fiscal exige o conjunto fiscal completo e documento válido | Restrição | `A2` §3; `C2` UC-26 FA-1 | RF-37, RF-38, RF-40, RF-45 | RNF-24 |
| **RN-26** | A negociação nasce no WhatsApp e o cliente frequentemente é novo: **nome e telefone bastam** para registrar o pedido, sem interromper a venda | Restrição | `A1` §8 PR-4; `B2` RF-36 | RF-36, RF-39 | RNF-01 |
| **RN-27** | **Toda contraparte do viveiro é uma identidade única** (quem compra, quem vende, quem trabalha, o sócio, o banco, o governo, o contador), e o vínculo com o viveiro é **papel acumulável** dessa identidade, escolhido em lista fechada. A mesma pessoa pode ser cliente e fornecedor; a identidade é uma só, os papéis é que são múltiplos | Fato | `A2` §3; [`1-cadastros/00-visao-geral.md`](../../rotinas/1-cadastros/00-visao-geral.md); `rotinas/4-financeiro/01-cadastro-unico.md` | RF-39, RF-52, RF-57, RF-69 | RNF-02 |
| **RN-28** | A **nota fiscal é emitida em sistema externo**. O viveiro registra a exigência e o número; a emissão não pertence a este sistema | Restrição | `A2` §4 | RF-40, RF-45 | RNF-24 |
| **RN-29** | A venda para **compensação ambiental** exige o nome científico da espécie e, em geral, nota fiscal | Restrição | `A2` §3 | RF-08, RF-45 | RNF-25 |
| **RN-30** | Dado pessoal de cliente é tratado sob a **Lei nº 13.709/2018**, com finalidade, base legal e prazo de retenção declarados | Restrição | `E5`; `A1` §9 RE-8 | RF-37 | RNF-23 |
| **RN-55** | O **tipo de tarefa** é vocabulário fechado, e não digitação livre: é ele que declara o que o encerramento pede e é por ele que a atividade de campo se liga ao lote e ao custo | Fato | `plans/P13`; `rotinas/1-cadastros/00-visao-geral.md` | RF-70 | RNF-01 |
| **RN-62** | Uma pessoa tem **mais de um endereço**, e o de entrega pode não ser o de cobrança. É o endereço de entrega que responde pela distância, e portanto pelo frete | Fato | `rotinas/4-financeiro/01-cadastro-unico.md`; `C8` §`addresses` | RF-34, RF-37 | RNF-24 |

### 3.6 Área F: Pedido, entrega e fornecedor

| RN | Enunciado | Tipo | Documentada em | RF originados | RNF vinculados |
|---|---|---|---|---|---|
| **RN-31** | O pedido percorre uma **sequência de estados** até a entrega, e cada transição tem um responsável: quem conclui uma etapa aciona a seguinte | Fato | `A2` §3; `C1`; `C2` UC-24 a UC-27 | RF-41, RF-48, RF-49, RF-51 | - |
| **RN-32** | O cliente pode comprar **quantidade e porte sem definir espécie** (item genérico): "500 mudas nativas" é pedido válido, e a escolha das espécies cabe ao viveiro | Fato | `A2` §3; `C2` UC-24 FA-2 | RF-66 | - |
| **RN-33** | No item genérico, o cliente pode **restringir a lista de espécies aceitas** e declarar especificação de qualidade; espécie fora da lista não atende o item | Restrição | `A2` §3; `C2` UC-25 FE-1 | RF-67 | - |
| **RN-34** | A **disponibilidade parcial é atendimento válido**: parte da quantidade pedida é resultado real da operação, e tratá-la como indisponibilidade falseia o pedido | Fato | `A2` §3; `C2` UC-25 FA-1 | RF-42, RF-43 | - |
| **RN-35** | Pode-se ofertar **recipiente diferente do solicitado**, desde que registrado qual foi efetivamente ofertado | Restrição | `C2` UC-25 FA-2 | RF-68 | - |
| **RN-37** | A **carga** é gerada a partir dos itens aprovados e separada fisicamente em campo; é ela, e não o pedido, a unidade que sai do viveiro. Um pedido pode gerar mais de uma carga, e a entrega da última não fecha o ciclo por si só, ver RN-70 | Fato | `A2` §3; `C2` UC-27 | RF-46, RF-47, RF-50, RF-51 | RNF-01, RNF-05 |
| **RN-38** | Quando a produção própria não atende o pedido, **completa-se com muda de fornecedor**, mediante cotação comparável entre propostas | Fato | `A2` §3; `C2` UC-32, UC-33 | RF-52, RF-53, RF-54, RF-55 | - |
| **RN-39** | A **revenda de muda de terceiro também respeita o piso mínimo**: o custo de aquisição substitui o custo de produção, a regra do piso permanece | Restrição | `C2` UC-33 FE-1 | RF-33, RF-54 | - |
| **RN-66** | O **carregamento acontece no dia útil anterior** à entrega: o caminhão é carregado na véspera, e é isso que define o prazo real da separação | Fato | `rotinas/3-comercial/pedidos/06-separacao-pedido.md` | RF-46, RF-50 | - |
| **RN-67** | **Item ainda não verificado e item indisponível são situações opostas**, não a mesma: "não tem" e "ninguém olhou ainda" pedem providências diferentes | Fato | `C6` §4; `C8` | RF-42, RF-43 | - |

### 3.7 Área G: Financeiro

| RN | Enunciado | Tipo | Documentada em | RF originados | RNF vinculados |
|---|---|---|---|---|---|
| **RN-40** | O **extrato bancário é a fonte da verdade** do financeiro: gasto que não passou por conta alguma não existe para o sistema | Fato | `A2` §4 | RF-56, RF-57 | - |
| **RN-41** | O **centro de custo** separa gasto de negócio de gasto pessoal da família. Os cinco iniciais são viveiro, sítio, clínica, casa e floricultura, e o conjunto é mantido no cadastro, não fixo (RN-71). A separação é pré-requisito de qualquer indicador confiável | Restrição | `A2` §4; `A1` §9 RE-7 | RF-57, RF-62 | RNF-02 |
| **RN-42** | Lançamento **equivalente a outro já classificado recebe a mesma classificação**: o gasto recorrente não se reclassifica todo mês | Derivação | `B2` RF-58 | RF-58 | - |
| **RN-43** | O **fechamento do mês** confere o saldo calculado contra o saldo do extrato e trava o período; **indicador financeiro só se calcula sobre mês fechado** | Restrição | `A2` §4 | RF-60, RF-61, RF-64 | - |
| **RN-44** | A **base bancária é assunto exclusivo da chefia**, decorrência direta de ela misturar gasto de negócio e gasto pessoal. O que dela deriva e não a expõe (custo, margem, preço, indicador) segue em leitura para a gerência | Restrição | `A1` §9 RE-7; `C1` §2; `D4` §3.2 | RF-62 | RNF-12 |
| **RN-68** | **Transferência entre contas do próprio viveiro não é despesa nem receita**: sem pareá-las, o mesmo dinheiro conta duas vezes | Restrição | `rotinas/4-financeiro/02-schema-financeiro.md` | RF-57 *(parcial)* | - |
| **RN-69** | Um mesmo gasto pode servir a **mais de um centro de custo** e então se reparte entre eles; a soma das partes é o valor total. A energia do imóvel que abriga casa e clínica não pertence a um centro só | Derivação | `rotinas/4-financeiro/00-visao-geral.md`; `C6` §7 | RF-57 *(parcial)* | - |
| **RN-70** | **Pedido entregue não é pedido pago**: o recebimento é evento próprio, e só o extrato o comprova. O ciclo comercial e o ciclo do dinheiro fecham em momentos diferentes | Fato | `rotinas/4-financeiro/03-relacao-com-rotinas.md` | RF-51, RF-56 *(parcial)* | - |
| **RN-71** | Os **destinos de gasto da família mudam com o tempo**: negócio que se encerra, imóvel que se arrenda, atividade que nasce. O conjunto de centros de custo é mantido, não fixo | Fato | `rotinas/1-cadastros/centros-de-custo.md` | RF-77 | - |
| **RN-72** | **Centro de custo não se exclui, inativa-se**: o lançamento já classificado guarda o seu centro para sempre, e o centro extinto continua válido no passado enquanto some das escolhas de lançamento novo | Restrição | `rotinas/1-cadastros/centros-de-custo.md` | RF-78 | - |
| **RN-73** | A **natureza do centro é escolhida uma vez**: alterá-la depois de existir lançamento reescreveria o passado, movendo gasto entre negócio e pessoal em indicador já apurado | Restrição | `rotinas/1-cadastros/centros-de-custo.md`; `C8` | RF-79 | - |

### 3.8 Área H: Acesso e responsabilidade

| RN | Enunciado | Tipo | Documentada em | RF originados | RNF vinculados |
|---|---|---|---|---|---|
| **RN-45** | Cada pessoa tem um **perfil** (chefia, gerência, colaborador, administrador) que determina o que ela vê e o que pode fazer | Fato | `A2` §5; `D4` | RF-01, RF-05, RF-06, RF-62, RF-63 | RNF-12 |
| **RN-46** | **Todo registro tem autor identificado**: quem registrou a produção, a perda, a separação ou a mudança de estado responde pelo registro | Fato | `A2` §5; `B2` RF-48 | RF-01, RF-04, RF-20, RF-48 | - |

### 3.9 Área I: Indicadores

| RN | Enunciado | Tipo | Documentada em | RF originados | RNF vinculados |
|---|---|---|---|---|---|
| **RN-47** | Indicador **sem comparação com o período anterior e sem meta não orienta decisão**, e cada perfil acompanha os indicadores da sua responsabilidade | Restrição | `G2`; `B2` §2.5.4 | RF-63, RF-64, RF-65 | - |

### 3.10 Síntese por área

| Área | Regras | Quantidade |
|---|---|---:|
| A: Domínio e produto | RN-01 a RN-06 | 6 |
| B: Custeio | RN-07 a RN-12, RN-53, RN-56 | 8 |
| C: Produção, estoque e perdas | RN-13 a RN-18, RN-48, RN-50 a RN-52, RN-57, RN-74 a RN-91 | 29 |
| D: Precificação | RN-19 a RN-24, RN-58, RN-59 | 8 |
| E: Cliente e obrigação fiscal | RN-25 a RN-30, RN-55, RN-62 | 8 |
| F: Pedido, entrega e fornecedor | RN-31 a RN-35, RN-37 a RN-39, RN-66, RN-67 | 10 |
| G: Financeiro | RN-40 a RN-44, RN-68 a RN-73 | 11 |
| H: Acesso e responsabilidade | RN-45, RN-46 | 2 |
| I: Indicadores | RN-47 | 1 |
| **Total** | | **83** |

| Tipo | Quantidade |
|---|---:|
| Fato | 31 |
| Restrição | 29 |
| Derivação | 19 |
| Acionamento | 4 |

---

## 4. Rastreabilidade inversa: requisito funcional → regra que o origina

Os 107 requisitos funcionais de `B2`. Quatro não decorrem de regra de negócio e estão justificados
na seção 6.

| RF | Regras que o originam |
|---|---|
| RF-01 | RN-45, RN-46 |
| RF-02 | - |
| RF-03 | - |
| RF-04 | RN-46 |
| RF-05 | RN-45 |
| RF-06 | RN-45 |
| RF-07 | - |
| RF-08 | RN-01, RN-02, RN-03, RN-05, RN-29 |
| RF-09 | RN-02, RN-03 |
| RF-10 | RN-04, RN-07 |
| RF-11 | RN-08 |
| RF-12 | RN-07, RN-12 |
| RF-13 | RN-11 |
| RF-14 | RN-04, RN-07 |
| RF-15 | RN-04, RN-07, RN-10, RN-11 |
| RF-16 | RN-07, RN-12, RN-56 |
| RF-17 | RN-07, RN-19, RN-58 |
| RF-18 | RN-08, RN-09 |
| RF-19 | RN-01, RN-04, RN-05, RN-10, RN-13, RN-57 |
| RF-20 | RN-10, RN-46 |
| RF-21 | RN-05, RN-06 |
| RF-22 | RN-04, RN-06, RN-13, RN-57 |
| RF-23 | RN-14 |
| RF-24 | RN-15 |
| RF-25 | RN-14 |
| RF-26 | RN-01, RN-04, RN-16 |
| RF-27 | RN-16, RN-17 |
| RF-28 | RN-17 |
| RF-29 | RN-17 |
| RF-30 | RN-18 |
| RF-31 | RN-19, RN-20 |
| RF-32 | RN-19, RN-59 |
| RF-33 | RN-21, RN-22, RN-39, RN-59 |
| RF-34 | RN-23, RN-62 |
| RF-35 | RN-24, RN-58 |
| RF-36 | RN-26 |
| RF-37 | RN-25, RN-30, RN-62 |
| RF-38 | RN-25 |
| RF-39 | RN-26, RN-27 |
| RF-40 | RN-25, RN-28 |
| RF-41 | RN-04, RN-20, RN-31 |
| RF-42 | RN-06, RN-13, RN-34, RN-67 |
| RF-43 | RN-34, RN-67 |
| RF-44 | RN-21, RN-59 |
| RF-45 | RN-25, RN-28, RN-29 |
| RF-46 | RN-37, RN-66 |
| RF-47 | RN-37 |
| RF-48 | RN-31, RN-46 |
| RF-49 | RN-31 |
| RF-50 | RN-37, RN-66 |
| RF-51 | RN-13, RN-31, RN-37, RN-70 |
| RF-52 | RN-27, RN-38 |
| RF-53 | RN-04, RN-38 |
| RF-54 | RN-38, RN-39 |
| RF-55 | RN-23, RN-38 |
| RF-56 | RN-40, RN-70 |
| RF-57 | RN-27, RN-40, RN-41, RN-68, RN-69 |
| RF-58 | RN-42 |
| RF-59 | RN-12 |
| RF-60 | RN-43 |
| RF-61 | RN-43 |
| RF-62 | RN-41, RN-44, RN-45 |
| RF-63 | RN-45, RN-47 |
| RF-64 | RN-24, RN-43, RN-47 |
| RF-65 | RN-17, RN-47 |
| RF-66 | RN-32 |
| RF-67 | RN-33 |
| RF-68 | RN-04, RN-35 |
| RF-69 | RN-27 |
| RF-70 | RN-55, RN-80, RN-81, RN-82 |
| RF-71 | RN-48 |
| RF-72 | - |
| RF-73 | RN-50 |
| RF-74 | RN-52 |
| RF-75 | RN-51 |
| RF-76 | RN-48, RN-53, RN-56 |
| RF-77 | RN-71 |
| RF-78 | RN-72 |
| RF-79 | RN-73 |
| RF-80 | RN-74 |
| RF-81 | RN-74 |
| RF-82 | RN-81, RN-82 |
| RF-83 | RN-48, RN-85 |
| RF-84 | RN-75, RN-76 |
| RF-85 | RN-74, RN-76, RN-79 |
| RF-86 | RN-77 |
| RF-87 | RN-75, RN-77 |
| RF-88 | RN-78 |
| RF-89 | RN-79 |
| RF-90 | RN-05, RN-06, RN-75 |
| RF-91 | RN-13, RN-16, RN-75, RN-90 |
| RF-92 | RN-84 |
| RF-93 | RN-48, RN-84 |
| RF-94 | RN-84 |
| RF-95 | RN-83 |
| RF-96 | RN-86 |
| RF-97 | RN-83 |
| RF-98 | RN-81, RN-91 |
| RF-99 | RN-82, RN-90 |
| RF-100 | RN-48, RN-51, RN-85, RN-86 |
| RF-101 | RN-87 |
| RF-102 | RN-88 |
| RF-103 | RN-15, RN-88 |
| RF-104 | RN-89 |
| RF-105 | RN-78, RN-88 |
| RF-106 | RN-88 |
| RF-107 | RN-81, RN-84, RN-91 |

---

## 5. Rastreabilidade inversa: requisito não funcional → origem

Os 26 requisitos não funcionais de `B2`. **A maioria não decorre de regra de negócio**: decorre das
restrições `RE-1` a `RE-8` de `A1` §9 ou de política do projeto. A coluna "Regra relacionada"
registra, quando existe, a regra que o requisito serve, vínculo mais fraco que o de origem, e
assinalado como tal.

| RNF | Origem primária | Regra relacionada |
|---|---|---|
| RNF-01 | RE-1: usuários sem formação técnica | RN-10, RN-16, RN-26, RN-37, RN-48, RN-52, RN-55 |
| RNF-02 | RE-1: usuários sem formação técnica | RN-03, RN-16, RN-20, RN-27, RN-41, RN-52, RN-57 |
| RNF-03 | RE-4: uso com mãos sujas, sol e chuva | - |
| RNF-04 | RE-4: uso com mãos sujas, sol e chuva | - |
| RNF-05 | RE-3: conexão instável no viveiro | RN-13, RN-16, RN-37 |
| RNF-06 | RE-2: celular como dispositivo principal | - |
| RNF-07 | RE-3: conexão instável no viveiro | - |
| RNF-08 | RE-1: usuários sem formação técnica | RN-02 |
| RNF-09 | Política do projeto | - |
| RNF-10 | Política do projeto | - |
| RNF-11 | Política do projeto | - |
| RNF-12 | Política do projeto | RN-44, RN-45, RN-53 |
| RNF-13 | Política do projeto | - |
| RNF-14 | RE-5: orçamento de microempresa | - |
| RNF-15 | Política do projeto | - |
| RNF-16 | Política do projeto | - |
| RNF-17 | Política do projeto | - |
| RNF-18 | Política do projeto | - |
| RNF-19 | Política do projeto | - |
| RNF-20 | Política do projeto | - |
| RNF-21 | Política do projeto | - |
| RNF-22 | Política do projeto | - |
| RNF-23 | **Regra de negócio** | **RN-30** (Lei nº 13.709/2018) |
| RNF-24 | **Regra de negócio** | **RN-25, RN-28, RN-62** (emissão de nota fiscal) |
| RNF-25 | **Regra de negócio** | **RN-02, RN-29** (nome científico em compensação ambiental) |
| RNF-26 | RE-2 e RE-5 | - |

**Leitura para o texto do trabalho:** de 26 requisitos não funcionais, apenas **3 decorrem
diretamente de regra de negócio** (RNF-23, RNF-24, RNF-25: todos de origem legal); **10 derivam das
restrições do ambiente** de operação (RE-1 a RE-5) e **13 de política do projeto**. É o oposto do
que ocorre nos funcionais, em que 72 dos 76 nascem de regra de negócio. A conclusão defensável:
**as regras de negócio determinam o que o sistema faz; o ambiente de operação determina como ele
precisa ser.**

---

## 6. Requisitos que não decorrem de regra de negócio

Nem toda exigência do sistema vem do domínio. Registrar isso explicitamente evita a distorção de
apresentar política de projeto como se fosse imposição do negócio.

### 6.1 Requisitos funcionais sem regra de negócio

| RF | Requisito | Por que não é regra de negócio |
|---|---|---|
| RF-02 | Troca de senha no primeiro acesso | Política de segurança do projeto. O viveiro não impõe essa exigência; ela existe porque o sistema cria usuários com senha provisória |
| RF-03 | Encerrar sessão | Decorre da existência de sessão, que é construto do software |
| RF-07 | Visualizar e encerrar sessões ativas | Idem |
| RF-72 | Copiar a agenda da semana anterior e marcar tarefas recorrentes | Conveniência de operação. Ficou sem regra que o origine quando a RN-49 saiu do catálogo |

RF-04 (registro de tentativas de autenticação) foi mantido vinculado a **RN-46**: todo registro tem
autor, embora a auditoria de acesso em si seja prática de segurança, não exigência do viveiro.

### 6.2 As restrições que originam os requisitos não funcionais

Reproduzidas de [`A1`](../A-fundacao/A1-documento-de-visao.md) §9, para que a geração das tabelas não
dependa de outro arquivo.

| RE | Restrição | Origem | RNF que origina |
|---|---|---|---|
| **RE-1** | Usuários sem formação técnica | Perfil da equipe | RNF-01, RNF-02, RNF-08 |
| **RE-2** | Celular como dispositivo principal | Contexto de campo | RNF-06, RNF-26 |
| **RE-3** | Conexão instável no viveiro | Ambiente físico | RNF-05, RNF-07 |
| **RE-4** | Uso com as mãos sujas, sob sol e chuva | Ambiente físico | RNF-03, RNF-04 |
| **RE-5** | Orçamento de microempresa | Porte da organização | RNF-14, RNF-26 |
| **RE-6** | Prazo até novembro de 2026 | Calendário acadêmico | - (afeta escopo, não requisito) |
| **RE-7** | Base financeira mistura gasto de negócio e gasto pessoal | Histórico da empresa | - (origina **RN-41** e **RN-44**) |
| **RE-8** | Dados pessoais sujeitos à legislação de proteção de dados | Legal | - (origina **RN-30**) |

Note que **RE-7 e RE-8 não originam requisitos não funcionais: originam regras de negócio.** São
restrições que o domínio absorveu.

### 6.3 Regras sem requisito que as realize por inteiro

A seção 8 impõe que regra nova venha antes do requisito. O inverso, regra catalogada sem
requisito correspondente: **não é erro de catálogo: é lacuna de especificação**, e é assim que
[`B5`](B5-matriz-rastreabilidade.md) §5 tratou as 25 que encontrou. Cinco das regras acrescentadas
nesta revisão estão nessa situação: existem no viveiro, têm um requisito que as tangencia, e
nenhum que as cumpra.

| RN | RF que tangencia | O que nenhum requisito cobre |
|---|---|---|
| **RN-58** | RF-17, RF-35 | Nada preserva o **custo unitário histórico**. RF-11 guarda o preço do insumo, não o custo apurado da muda: sem isso, a margem de uma venda antiga é recalculada com o custo de hoje |
| **RN-62** | RF-34, RF-37 | Mais de um endereço por pessoa, com o de entrega distinto do de cobrança, e a distância medida a partir do primeiro |
| **RN-68** | RF-57 | **Parear** as duas pontas de uma transferência entre contas próprias e retirá-las de despesa e receita |
| **RN-69** | RF-57 | **Repartir** um lançamento entre centros de custo, com a soma das partes travada no total |
| **RN-70** | RF-51, RF-56 | Reconhecer o **recebimento** de um pedido e distingui-lo da entrega |

Nenhuma delas vira requisito nesta revisão. Convertê-las exigiria ator, prioridade, critério de
verificação, caso de uso, entidade e caso de teste, uma passada de especificação, não de
catalogação. Quando forem especificadas, entram como **RF-106 em diante**: nenhum identificador se
reutiliza (seção 8).

---

## 7. Apêndice: texto integral dos requisitos

Reproduzido de [`B2`](B2-especificacao-requisitos.md) para tornar este arquivo autossuficiente.
Prioridade: **D** deve ter · **DV** deveria ter · **P** poderia ter.
Origem: **OP** observação participante · **EN** entrevista · **AD** análise documental ·
**DOM** estudo do domínio · **LEG** exigência legal · **ORG** política do projeto.

### 7.1 Requisitos funcionais

| RF | Texto | Prior. | Origem |
|---|---|---|---|
| RF-01 | O sistema deve autenticar o usuário por identificador e senha antes de conceder qualquer acesso | D | ORG |
| RF-02 | O sistema deve exigir troca de senha no primeiro acesso do usuário | D | ORG |
| RF-03 | O sistema deve permitir ao usuário encerrar sua sessão | D | ORG |
| RF-04 | O sistema deve registrar cada tentativa de autenticação com data, origem e dispositivo | DV | ORG |
| RF-05 | O sistema deve permitir ao administrador criar usuários e atribuir perfil | D | ORG |
| RF-06 | O sistema deve verificar a permissão do perfil a cada operação, e não apenas ocultar elementos da interface | D | ORG |
| RF-07 | O sistema deveria permitir ao usuário visualizar e encerrar suas sessões ativas | DV | ORG |
| RF-08 | O sistema deve permitir cadastrar espécie com nome científico, nomes populares, características, tempo de germinação, tempo de produção e fotografia | D | EN, DOM |
| RF-09 | O sistema deve localizar a espécie por qualquer um de seus nomes populares ou pelo nome científico | D | OP |
| RF-10 | O sistema deve permitir cadastrar recipientes com volume e consumo de substrato por unidade | D | EN |
| RF-11 | O sistema deve permitir cadastrar insumos com unidade de medida e custo, preservando o histórico de preços | D | AD |
| RF-12 | O sistema deve permitir registrar custos fixos mensais por categoria e mês de referência | D | AD |
| RF-13 | O sistema deve permitir registrar coleta de sementes com região, distância, combustível, horas e quantidade obtida | DV | EN |
| RF-14 | O sistema deve permitir registrar, em campo, o consumo de insumo indicando insumo, espécie, recipiente e quantidade | D | OP |
| RF-15 | O sistema deve calcular o custo variável de cada combinação de espécie e recipiente, somando substrato, semente, recipiente, demais insumos e mão de obra | D | EN, AD |
| RF-16 | O sistema deve ratear o custo fixo mensal sobre a produção do período | D | EN |
| RF-17 | O sistema deve apresentar o custo unitário por espécie e recipiente | D | EN |
| RF-18 | O sistema deve recalcular o custo unitário quando houver alteração em insumo, custo fixo ou consumo | D | EN |
| RF-19 | O sistema deve permitir registrar atividade de produção (semeadura, repicagem, irrigação, adubação) com espécie, recipiente e quantidade | D | OP |
| RF-20 | O sistema deve permitir à gerência atribuir atividades de produção a colaboradores | DV | OP |
| RF-21 | O sistema deveria apresentar o acompanhamento do ciclo produtivo por espécie, com previsão de disponibilidade a partir do tempo de produção | DV | EN |
| RF-22 | O sistema deve apresentar a quantidade disponível por espécie e recipiente | D | OP |
| RF-23 | O sistema deve permitir registrar contagem física de estoque, com a quantidade contada substituindo a calculada | D | OP |
| RF-24 | O sistema deve sinalizar espécies zeradas ou abaixo da quantidade mínima definida | DV | EN |
| RF-25 | O sistema deveria manter o histórico de contagens por espécie | P | OP |
| RF-26 | O sistema deve permitir registrar perda com espécie, recipiente, quantidade e causa selecionada em lista fechada | D | OP |
| RF-27 | O sistema deve listar as perdas registradas com filtro por período | D | EN |
| RF-28 | O sistema deve calcular a taxa de mortalidade por espécie e período | D | EN |
| RF-29 | O sistema deve emitir alerta para espécie cuja mortalidade ultrapasse 20% | D | EN |
| RF-30 | O sistema deveria apresentar relatório consolidado de perdas com estimativa de impacto financeiro | DV | EN |
| RF-31 | O sistema deve permitir definir a margem aplicada a cada canal de venda | D | EN |
| RF-32 | O sistema deve calcular o preço sugerido somando ao custo unitário a margem do canal | D | EN |
| RF-33 | O sistema deve impedir que o preço praticado fique abaixo do piso mínimo de segurança | D | EN |
| RF-34 | O sistema deve incorporar o frete ao preço, calculado por valor por quilômetro | DV | EN |
| RF-35 | O sistema deve apresentar relatório comparando custo e preço praticado, destacando margens negativas | D | EN |
| RF-36 | O sistema deve permitir cadastro rápido de cliente com nome e telefone, sem sair da tela de pedido | D | OP |
| RF-37 | O sistema deve permitir cadastro completo de cliente com dados fiscais de pessoa física ou jurídica | D | LEG, AD |
| RF-38 | O sistema deve validar CPF e CNPJ informados | D | LEG |
| RF-39 | O sistema deve permitir localizar cliente por nome, telefone ou documento | D | OP |
| RF-40 | O sistema deve sinalizar cadastro fiscal incompleto quando o pedido exigir nota fiscal, permitindo completá-lo no próprio fluxo | D | LEG, OP |
| RF-41 | O sistema deve permitir registrar pedido com cliente, canal de venda e itens compostos por espécie, recipiente e quantidade | D | OP |
| RF-42 | O sistema deve permitir verificar a disponibilidade de cada item do pedido contra o estoque | D | OP |
| RF-43 | O sistema deve representar disponibilidade parcial, registrando a quantidade efetivamente disponível quando menor que a pedida | D | OP |
| RF-44 | O sistema deve exigir aprovação da chefia sobre o preço antes do fechamento do pedido | D | EN |
| RF-45 | O sistema deve registrar se o pedido exige nota fiscal e, quando emitida em sistema externo, o número correspondente | D | LEG |
| RF-46 | O sistema deve gerar a carga de separação a partir dos itens aprovados do pedido | D | OP |
| RF-47 | O sistema deve permitir ao colaborador registrar a separação física item a item | D | OP |
| RF-48 | O sistema deve manter o histórico das mudanças de estado do pedido, com autor e momento | DV | ORG |
| RF-49 | O sistema deve notificar o responsável pela etapa seguinte a cada transição relevante do pedido | DV | OP |
| RF-50 | O sistema deveria apresentar a agenda de entregas com as cargas prontas e seus destinos | DV | OP |
| RF-51 | O sistema deve permitir confirmar a entrega da carga | D | OP |
| RF-52 | O sistema deve permitir cadastrar fornecedor com contato, localização e espécies que fornece | DV | EN |
| RF-53 | O sistema deve permitir registrar cotação dirigida a um ou mais fornecedores, com espécie, recipiente e quantidade por item | DV | EN |
| RF-54 | O sistema deve permitir comparar as propostas recebidas e registrar a escolhida por item | DV | EN |
| RF-55 | O sistema poderia apresentar os fornecedores em mapa, com a distância até o viveiro | P | EN |
| RF-56 | O sistema deve permitir importar o extrato bancário de cada conta, sem digitação de lançamentos | D | AD |
| RF-57 | O sistema deve permitir classificar cada lançamento indicando centro de custo, categoria e contraparte, todos escolhidos de lista mantida no cadastro, sem digitação livre | D | AD |
| RF-58 | O sistema deve aplicar automaticamente a classificação já atribuída anteriormente a lançamentos equivalentes | D | AD |
| RF-59 | O sistema deve permitir informar data de competência distinta da data de movimentação | D | AD |
| RF-60 | O sistema deve permitir fechar o mês após conferência do saldo calculado contra o saldo do extrato, travando o período | D | AD |
| RF-61 | O sistema não deve apresentar indicador financeiro calculado sobre mês ainda não fechado | D | AD |
| RF-62 | O sistema deve restringir a base bancária (extratos, lançamentos, compras, custos fixos e fechamento) aos perfis chefia e administrador | D | EN |
| RF-63 | O sistema deve apresentar painel de indicadores com o conteúdo correspondente ao perfil do usuário | D | EN |
| RF-64 | O sistema deve apresentar cada indicador comparado ao período anterior e à meta definida | D | EN |
| RF-65 | O sistema deve sinalizar visualmente se o valor do indicador é favorável ou desfavorável | D | EN |
| RF-66 | O sistema deve permitir registrar item genérico (quantidade e recipiente sem espécie definida), atendido posteriormente por uma ou mais espécies | D | OP |
| RF-67 | O sistema deve permitir delimitar, no item genérico, a lista de espécies aceitas pelo cliente e a especificação de qualidade exigida | D | OP, EN |
| RF-68 | O sistema deve permitir, na verificação de disponibilidade, oferecer recipiente diferente do solicitado, registrando qual | DV | OP |
| RF-69 | O sistema deve permitir cadastrar funcionário com contato e vínculo (fixo ou diarista), inclusive quando ele não tem acesso ao sistema | D | EN |
| RF-70 | O sistema deve permitir manter o catálogo de tipos de tarefa, com nome, categoria e a declaração de se a tarefa é quantitativa por unidade e de se exige lote específico, espécie e recipiente | D | OP |
| RF-71 | O sistema deve permitir montar a agenda da semana atribuindo, por funcionário e por dia, o tipo de tarefa e o turno, manhã ou tarde | D | EN, OP |
| RF-72 | O sistema deve permitir copiar a agenda da semana anterior e marcar tarefas como recorrentes, que passam a nascer preenchidas | D | OP |
| RF-73 | O sistema deve controlar a situação da semana (rascunho, publicada e fechada) e impedir alteração depois do fechamento | D | ORG |
| RF-74 | O sistema deve apresentar ao colaborador apenas as tarefas atribuídas a ele no dia, e permitir concluí-las informando somente a quantidade realizada | D | OP |
| RF-75 | O sistema deve assumir como realizada, ao fechar a semana, a tarefa planejada que não foi confirmada, registrando essa condição | DV | ORG |
| RF-76 | O sistema deve apurar o custo de mão de obra por espécie e período, a partir das horas da agenda e de um valor-hora médio do período, e incorporá-lo ao custo unitário | D | EN, AD |
| RF-77 | O sistema deve permitir cadastrar centro de custo informando nome e natureza (negócio ou pessoal) | D | AD |
| RF-78 | O sistema deve permitir inativar e reativar centro de custo, retirando-o das escolhas de lançamento novo sem afetar lançamento já classificado nele | D | AD |
| RF-79 | O sistema não deve permitir excluir centro de custo, nem alterar a sua natureza depois de existir lançamento classificado nele | D | AD |
| RF-80 | O sistema deve permitir cadastrar áreas do viveiro identificadas por letra | D | OP |
| RF-81 | O sistema deve permitir cadastrar canteiros numerados dentro de cada área, recusando número repetido na mesma área | D | OP |
| RF-82 | O sistema deve pedir, no planejamento e no encerramento, exatamente os dados que o tipo de tarefa declarar exigir, e nenhum outro | D | ORG |
| RF-83 | O sistema deve permitir manter o período de trabalho, com hora de início e de fim de cada turno, e adotá-lo como jornada padrão da agenda | D | EN |
| RF-84 | O sistema deve permitir criar lote informando espécie, recipiente, quantidade, área e canteiro | D | OP |
| RF-85 | O sistema deve apresentar a ocupação do viveiro por área e canteiro, indicando o lote de cada canteiro ocupado e quais estão livres | D | EN |
| RF-86 | O sistema deve permitir registrar repicagem transferindo parte ou todo o lote para recipiente maior, criando um lote novo que aponta para o de origem | D | DOM |
| RF-87 | O sistema deve apresentar o histórico de movimentos do lote, com a quantidade e o motivo de cada um | D | EN |
| RF-88 | O sistema não deve permitir movimento que deixe o saldo do lote negativo | D | ORG |
| RF-89 | O sistema deve encerrar o lote quando o saldo chegar a zero, liberando o canteiro e preservando o histórico | D | ORG |
| RF-90 | O sistema deveria apresentar, por lote, a previsão de disponibilidade, a partir da data de plantio e do tempo de produção da espécie | DV | EN |
| RF-91 | O sistema deve permitir vincular perda, contagem física e saída de venda ao lote, dispensando informar espécie e recipiente quando o lote os determinar | D | OP |
| RF-92 | O sistema deve permitir atribuir a mesma tarefa a mais de um funcionário, e mais de uma tarefa ao mesmo turno com grupos diferentes | D | OP |
| RF-93 | O sistema deve permitir lançar a mesma atribuição para um intervalo de dias de uma vez | D | OP |
| RF-94 | O sistema deve apresentar a agenda do dia com as tarefas planejadas e um cartão por funcionário, mostrando o que cada um faz naquele momento | D | EN |
| RF-95 | O sistema deve permitir iniciar o apontamento de uma tarefa para um funcionário, encerrando automaticamente o apontamento que estiver aberto para ele | D | EN |
| RF-96 | O sistema deve permitir encerrar o dia do funcionário, fechando o apontamento aberto sem iniciar outro | D | EN |
| RF-97 | O sistema não deve permitir dois apontamentos abertos para o mesmo funcionário | D | ORG |
| RF-98 | O sistema deve solicitar, ao encerrar a tarefa, a quantidade realizada por cada funcionário que participou dela, quando o tipo de tarefa for quantitativo por unidade, e apenas nesse caso | D | OP |
| RF-99 | O sistema deve exigir o lote no encerramento da tarefa quando o tipo de tarefa declarar lote específico, dispensando o canteiro, que vem do próprio lote | D | OP |
| RF-100 | O sistema deve calcular as horas trabalhadas pelo intervalo apontado e, na ausência de apontamento, assumir a jornada do turno planejado, registrando essa condição | D | ORG |
| RF-101 | O sistema deve permitir registrar, no encerramento da tarefa, os insumos consumidos nela, abatendo-os do saldo | D | OP |
| RF-102 | O sistema deve apresentar o saldo de cada insumo, derivado das entradas menos o consumo registrado | D | AD |
| RF-103 | O sistema deve sinalizar insumo zerado ou abaixo da quantidade mínima definida | DV | EN |
| RF-104 | O sistema deve permitir registrar gasto extra da tarefa, com descrição e valor, atribuindo-o ao lote trabalhado | DV | EN |
| RF-105 | O sistema deve sinalizar, sem recusar, o consumo que deixaria o saldo do insumo negativo | DV | ORG |
| RF-106 | O sistema deve permitir registrar entrada de insumo no estoque, informando insumo, motivo (compra, ajuste ou perda), quantidade e, na compra, o custo unitário | D | AD |
| RF-107 | O sistema deve permitir encerrar a tarefa de uma vez para todo o grupo escalado, apresentando os campos que o tipo de tarefa exigir: o lote uma vez para a tarefa, e a quantidade uma vez por participante | D | OP |

### 7.2 Requisitos não funcionais

| RNF | Texto | Grupo | Origem |
|---|---|---|---|
| RNF-01 | Formulários de campo devem apresentar no máximo cinco campos por tela | Produto | RE-1 |
| RNF-02 | Campos de categoria devem oferecer lista fechada de opções, nunca entrada livre de texto | Produto | RE-1 |
| RNF-03 | Elementos acionáveis devem ter alvo de toque compatível com uso de dedos sujos e molhados | Produto | RE-4 |
| RNF-04 | Toda ação de gravação deve produzir resposta visual imediata de confirmação | Produto | RE-4 |
| RNF-05 | O registro de dados em campo deve funcionar sem conexão, com envio automático ao restabelecer a rede | Produto | RE-3 |
| RNF-06 | A interface deve ser concebida para uso em celular, e não adaptada a partir de tela de computador | Produto | RE-2 |
| RNF-07 | O sistema deve permanecer utilizável sob conexão móvel lenta | Produto | RE-3 |
| RNF-08 | A interface deve empregar o vocabulário da empresa, conforme o glossário, e não termos técnicos do sistema | Produto | RE-1 |
| RNF-09 | Senhas devem ser armazenadas de forma cifrada, por técnica que impeça sua recuperação | Produto | ORG |
| RNF-10 | Identificadores de sessão devem ser armazenados apenas em formato protegido | Produto | ORG |
| RNF-11 | Cookies de sessão devem receber as marcações de segurança que restringem seu uso a comunicação cifrada e impedem leitura por código do navegador | Produto | ORG |
| RNF-12 | As regras de acesso aos dados devem ser executadas no servidor, nunca no navegador | Produto | ORG |
| RNF-13 | Toda comunicação entre cliente e servidor deve ser cifrada em trânsito | Produto | ORG |
| RNF-14 | O sistema deve dispor de rotina de backup e procedimento de recuperação com objetivos declarados | Produto | RE-5 |
| RNF-15 | Arquivos, identificadores e estruturas de dados devem ser nomeados em inglês; a documentação, em português | Organizacional | ORG |
| RNF-16 | Cada funcionalidade deve ser desenvolvida em ramificação própria e integrada por solicitação de incorporação | Organizacional | ORG |
| RNF-17 | Alteração direta na versão principal deve ser impedida por controle automático | Organizacional | ORG |
| RNF-18 | Mensagens de alteração devem seguir padrão fixo | Organizacional | ORG |
| RNF-19 | Alterações na estrutura do banco devem ser versionadas em arquivos aplicados de forma controlada, preservando compatibilidade retroativa | Organizacional | ORG |
| RNF-20 | Toda alteração de código deve incluir testes automatizados cobrindo utilitários, regras de negócio e validações | Organizacional | ORG |
| RNF-21 | Verificação automática executada antes de cada alteração deve bloquear o envio em caso de arquivo sensível, falha de teste ou desvio de padronização | Organizacional | ORG |
| RNF-22 | Credenciais, chaves e dados sensíveis não devem ser versionados | Organizacional | ORG |
| RNF-23 | O tratamento de dados pessoais deve observar a Lei nº 13.709/2018, com finalidade, base legal e prazo de retenção declarados para cada dado coletado | Externo | LEG |
| RNF-24 | Os dados cadastrais de cliente devem comportar o conjunto exigido para emissão de nota fiscal no sistema externo em uso | Externo | LEG |
| RNF-25 | O nome científico da espécie deve estar disponível para atender exigências de projetos de compensação ambiental | Externo | LEG, DOM |
| RNF-26 | O sistema deve operar em navegador de celular de uso corrente pela equipe, sem exigir instalação a partir de loja de aplicativos | Externo | RE-2, RE-5 |

---

## 8. Manutenção

- **Identificador de regra não se reutiliza.** Regra removida deixa o número vago, como em `B2`.
- **Regra nova entra antes do requisito.** Se um requisito novo não puder apontar para uma regra,
  uma das duas coisas está errada: ou falta a regra, ou o requisito não deveria existir.
- **Termo novo vai primeiro ao glossário** [`A2`](../A-fundacao/A2-glossario-dominio.md).
- Ao alterar `B2`, reconferir as seções 4, 5 e 7 deste documento: elas espelham o conteúdo de lá.
