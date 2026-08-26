# C2: Especificação de casos de uso

> **Artefato:** Especificação de casos de uso · **Bloco:** C, Modelagem
> **Destino no TCC:** Capítulo 4, seção 4.4 (amostra) e Apêndice (integral)
> **Fundamentação:** Pressman e Maxim (2016, p. 149) definem que "um caso de uso conta uma jornada
> estilizada sobre como um usuário [...] interage com o sistema sob um conjunto de circunstâncias
> específicas". Sommerville (2011) complementa que a descrição textual detalha o que o diagrama
> apenas indica.

---

## Como ler

Quinze casos de uso, dos cinquenta e nove catalogados em [`C1`](C1-diagrama-casos-de-uso.md), estão
especificados aqui. O critério de seleção foi duplo: **concentração de fluxos alternativos** e
**custo operacional do erro**. Cadastrar um insumo errado corrige-se em segundos; separar a carga
errada põe um caminhão na estrada com a muda errada.

**Os três últimos, UC-57 a UC-59, entraram em 26/08/2026 e esticam o critério.** Dois deles são
manutenção de cadastro, e pela regra acima ficariam de fora. Entram porque o **custo do erro é
diferido**: âncora escolhida errada no protocolo não produz sintoma nenhum na hora, e aparece
semanas depois no lote que foi classificado cedo demais. Erro que não se manifesta quando é
cometido precisa de fluxo de exceção escrito, e não de tela de cadastro genérica.

Todos têm como pré-condição comum uma **sessão autenticada** cujo perfil autoriza a operação, a
verificação ocorre a cada ação, e não apenas na entrada da tela (RF-06).

Notação dos fluxos: **FP** fluxo principal, **FA** fluxo alternativo, **FE** fluxo de exceção.

---

## UC-24 · Cadastrar pedido

| | |
|---|---|
| **Ator principal** | Chefia |
| **Objetivo** | Registrar no sistema um pedido já negociado por WhatsApp, antes que o detalhe se perca |
| **Requisitos** | RF-41, RF-66, RF-67, RF-36 |
| **Frequência** | Diária |
| **Pré-condições** | Existe ao menos uma espécie e um recipiente cadastrados |
| **Pós-condições** | Pedido criado no estado *cadastrado*, com ao menos um item; gerência notificada |

### FP: Fluxo principal

1. A chefia inicia o cadastro de um novo pedido.
2. O sistema solicita o cliente.
3. A chefia seleciona um cliente existente.
4. O sistema solicita o canal de venda e apresenta *atacado* como opção padrão.
5. A chefia confirma ou altera o canal.
6. A chefia adiciona um item informando espécie, recipiente e quantidade.
7. O sistema valida que a quantidade é positiva e acrescenta o item ao pedido.
8. A chefia repete os passos 6 e 7 para os demais itens.
9. A chefia informa, opcionalmente, a data prevista de entrega e observações.
10. A chefia conclui o cadastro.
11. O sistema registra o pedido no estado *cadastrado*, atribui-lhe número sequencial e notifica a gerência de que há disponibilidade a verificar.

### FA-1: Cliente ainda não cadastrado

No passo 3, a chefia não localiza o cliente.

1. A chefia aciona o cadastro rápido sem sair da tela de pedido.
2. O sistema solicita apenas **nome e telefone**.
3. O sistema cria o cliente e o seleciona no pedido, retornando ao passo 4.

> O cadastro fiscal completo não é exigido aqui. Exigi-lo interromperia a única
> etapa do processo que compete com uma conversa de WhatsApp em andamento: a complementação ocorre
> no fechamento, e apenas se houver nota fiscal a emitir (UC-26, FA-1).

### FA-2: Item genérico

No passo 6, o cliente não especificou as espécies, pediu quantidade e porte.

1. A chefia marca o item como **genérico** e informa recipiente e quantidade, sem espécie.
2. O sistema, opcionalmente, aceita a lista de espécies que o cliente admite.
3. O sistema, opcionalmente, aceita a especificação de qualidade em texto livre.
4. O sistema registra o item genérico e retorna ao passo 8.

> Item genérico sem lista de espécies significa **aberto**: qualquer espécie o atende. É o caso
> corrente em compensação ambiental, onde a exigência é de quantidade e diversidade, não de espécies
> nomeadas.

### FE-1: Quantidade inválida

No passo 7, a quantidade informada é zero ou negativa. O sistema recusa o item, informa o motivo e
mantém o pedido em edição, sem perder os itens já lançados.

---

## UC-25 · Verificar disponibilidade

| | |
|---|---|
| **Ator principal** | Gerência |
| **Objetivo** | Conferir, contra o estoque físico, se o pedido pode ser atendido |
| **Requisitos** | RF-42, RF-43, RF-68 |
| **Frequência** | Diária |
| **Pré-condições** | Pedido no estado *cadastrado* |
| **Pós-condições** | Cada item classificado como disponível, parcial ou indisponível; pedido em *verificado*; chefia notificada |

### FP: Fluxo principal

1. A gerência abre um pedido pendente de verificação.
2. O sistema apresenta os itens em formato de lista de conferência, com espécie, recipiente e quantidade pedida.
3. O sistema registra o pedido como *verificando disponibilidade*.
4. Para cada item, a gerência confirma que há quantidade suficiente.
5. O sistema marca o item como **disponível**.
6. Concluídos todos os itens, a gerência encerra a verificação.
7. O sistema registra o pedido como *verificado* e notifica a chefia.

### FA-1: Disponibilidade parcial

No passo 4, existe menos do que o pedido.

1. A gerência informa a **quantidade efetivamente disponível**.
2. O sistema valida que o valor está entre 1 e a quantidade pedida.
3. O sistema marca o item como **parcial**, preservando as duas quantidades, e retorna ao passo 4.

### FA-2: Disponível em outro recipiente

No passo 4, a espécie existe, mas em recipiente diferente do pedido.

1. A gerência informa a quantidade disponível e **qual recipiente** de fato existe.
2. O sistema registra ambos e retorna ao passo 4.

> Trata-se de negociação, não de erro: um cliente que pediu saco 17x22 frequentemente aceita 20x26
> por outro preço. Reduzir esse caso a "indisponível" descartaria uma venda que ocorreria.

### FA-3: Item indisponível

No passo 4, não há nenhuma unidade. A gerência informa quantidade zero, o sistema marca o item como
**indisponível** e retorna ao passo 4. O pedido segue: a decisão de cancelar, substituir ou cotar com
fornecedor cabe à chefia (UC-26) ou origina uma cotação (UC-32).

### FA-4: Item genérico

No passo 4, o item não tem espécie definida. A gerência indica as espécies com que pretende atendê-lo,
respeitada a lista de espécies aceitas quando houver. O sistema valida a restrição e retorna ao passo 4.

### FE-1: Espécie fora da lista aceita

Em FA-4, a espécie escolhida não consta da lista definida pelo cliente. O sistema recusa a escolha e
informa quais espécies são aceitas.

---

## UC-26 · Fechar pedido

| | |
|---|---|
| **Ator principal** | Chefia |
| **Objetivo** | Decidir sobre o pedido verificado, aprovar preço e liberá-lo para separação |
| **Requisitos** | RF-44, RF-45, RF-46, RF-40, RF-33 |
| **Frequência** | Diária |
| **Pré-condições** | Pedido no estado *verificado* |
| **Pós-condições** | Pedido *aprovado*, carga de separação criada, colaboradores notificados |

### FP: Fluxo principal

1. A chefia abre um pedido verificado.
2. O sistema apresenta a análise: itens disponíveis, parciais e indisponíveis, com as quantidades de cada caso.
3. O sistema apresenta, por item, o preço sugerido do canal de venda do pedido.
4. A chefia confirma ou ajusta o preço de cada item.
5. O sistema valida que nenhum preço está abaixo do piso mínimo.
6. A chefia informa se o pedido exige nota fiscal.
7. A chefia aprova o pedido.
8. O sistema registra o pedido como *aprovado*, gera a carga de separação com os itens e quantidades aprovados, e notifica os colaboradores.

### FA-1: Nota fiscal exigida e cliente com cadastro incompleto

No passo 6, a chefia indica que há nota a emitir, mas o cliente possui apenas nome e telefone.

1. O sistema sinaliza a pendência e solicita os dados fiscais, tipo de pessoa, documento, razão social quando pessoa jurídica, endereço.
2. A chefia completa os dados **na própria tela de fechamento**.
3. O sistema valida o documento informado e retorna ao passo 7.

### FA-2: Atendimento parcial aceito

No passo 4, há itens parciais e a chefia decide faturar o que existe.

1. A chefia confirma as quantidades disponíveis como quantidades aprovadas.
2. O sistema registra a diferença e retorna ao passo 7.

### FA-3: Complementação por fornecedor

No passo 2, há itens indisponíveis que a chefia decide comprar de terceiro. O caso de uso é suspenso
e origina uma cotação (UC-32). O pedido permanece *verificado* até que a cotação se resolva.

### FE-1: Preço abaixo do piso mínimo

No passo 5, o preço informado é inferior ao piso. O sistema **recusa** a aprovação, indica o piso
aplicável e mantém o pedido em edição.

> O piso é bloqueio, não alerta. A regra existe justamente porque a venda com prejuízo hoje ocorre
> sem que ninguém perceba: um aviso que pode ser ignorado não altera esse quadro.

### FE-2: Documento fiscal inválido

Em FA-1, o CPF ou CNPJ informado não é válido. O sistema recusa o dado no momento da digitação e
indica o erro, sem descartar os demais campos já preenchidos.

---

## UC-27 · Separar carga

| | |
|---|---|
| **Ator principal** | Colaborador |
| **Objetivo** | Recolher fisicamente as mudas da carga e registrar o que foi separado |
| **Requisitos** | RF-47 |
| **Frequência** | Diária |
| **Pré-condições** | Existe carga no estado *pendente* |
| **Pós-condições** | Carga *pronta*; pedido em *pronto para envio*; chefia notificada |

### FP: Fluxo principal

1. O colaborador abre a lista de cargas a separar.
2. O sistema apresenta os itens da carga com espécie, recipiente e quantidade, em lista de conferência.
3. O sistema registra a carga como *separando*.
4. O colaborador separa fisicamente um item e o marca como separado.
5. O sistema registra a marcação e apresenta confirmação visual imediata.
6. O colaborador repete os passos 4 e 5 até o último item.
7. O sistema registra a carga como *pronta*, atualiza o pedido para *pronto para envio* e notifica a chefia.

### FA-1: Sem conexão

Nos passos 4 e 5, o dispositivo está sem rede.

1. O sistema registra a marcação localmente e confirma ao colaborador.
2. O sistema envia os registros pendentes assim que a conexão se restabelece.

> Este fluxo alternativo é o mais executado de todos os aqui descritos, e não a exceção: a área de
> separação é onde a conexão falha com mais frequência. Um sistema que exija rede nesse ponto será
> substituído por papel no primeiro dia.

### FA-2: Divergência entre carga e estoque físico

No passo 4, o item não existe na quantidade indicada. O colaborador registra a quantidade
efetivamente separada, e o sistema notifica a gerência da divergência para nova verificação.

---

## UC-17 · Registrar perda

| | |
|---|---|
| **Ator principal** | Colaborador |
| **Objetivo** | Registrar mudas perdidas no momento e no local em que a perda é constatada |
| **Requisitos** | RF-26, RF-28, RF-29, RF-91 |
| **Frequência** | Diária |
| **Pré-condições** | Nenhuma além da sessão autenticada |
| **Pós-condições** | Perda registrada; mortalidade da espécie recalculada; alerta emitido se ultrapassar o limite |

### FP: Fluxo principal

1. O colaborador aciona o registro de perda.
2. O sistema apresenta um formulário de **quatro campos**: lote, quantidade, causa e observação.
3. O colaborador seleciona o lote, de uma lista dos canteiros ocupados.
4. O sistema exibe a espécie, o recipiente e o canteiro do lote escolhido, sem pedi-los.
5. O colaborador informa a quantidade perdida.
6. O colaborador seleciona a causa em lista fechada, seca, praga, geada, manuseio ou outro.
7. O colaborador confirma.
8. O sistema grava a perda, exibe confirmação visual e retorna ao formulário vazio, pronto para o próximo registro.
9. O sistema baixa a quantidade do saldo do lote e recalcula a taxa de mortalidade da espécie no período.

### FA-1: Mortalidade acima do limite

No passo 9, a taxa recalculada ultrapassa 20%. O sistema emite alerta à gerência identificando
espécie, taxa e causa predominante. **O colaborador não é interrompido**: o alerta é dirigido a quem
pode agir sobre ele.

### FA-2: Sem conexão

Nos passos 7 e 8, não há rede. O sistema grava localmente, confirma ao colaborador e envia ao
restabelecer a conexão. O recálculo do passo 9 ocorre na sincronização.

### FE-1: Quantidade inválida

No passo 5, a quantidade é zero, negativa ou não numérica. O sistema recusa, indica o campo e
preserva os demais já preenchidos.

### FE-2: Quantidade maior que o saldo do lote

No passo 7, a perda informada excede o que o lote ainda tem. O sistema recusa e apresenta o saldo
(RN-78): perda maior que o saldo significa que a contagem está errada, e gravar o negativo
propagaria o erro para o estoque. A correção é uma contagem física (UC-16), não uma perda maior.

> **Nota de projeto: como o quinto campo entrou sem virar campo.** Até 24/08/2026 este caso
> registrava que localizar a perda dentro do viveiro melhoraria a análise e **foi descartado**, por
> ser o campo que faria o colaborador deixar de registrar. Com o lote, a decisão **não foi
> revertida, foi resolvida**: o formulário continua com quatro campos, e um deles deixou de ser
> "espécie" e "recipiente" para ser "lote", que carrega os dois **e mais o canteiro**. O
> colaborador passou a informar **menos**, e o sistema a saber mais. Ver
> [`B2`, seção 5](../B-requisitos/B2-especificacao-requisitos.md) e o achado L de
> [`auditoria-divergencias.md`](../../auditoria-divergencias.md).

---

## UC-47 · Criar lote

| | |
|---|---|
| **Ator principal** | Gerência |
| **Objetivo** | Registrar uma leva de mudas plantada junta e o canteiro que ela passa a ocupar |
| **Requisitos** | RF-84, RF-90 |
| **Frequência** | Semanal |
| **Pré-condições** | Existem espécie, recipiente e ao menos um canteiro livre cadastrados |
| **Pós-condições** | Lote aberto ocupando o canteiro, com saldo igual à quantidade inicial e um movimento de entrada |

### FP: Fluxo principal

1. A gerência inicia a criação de um lote.
2. A gerência seleciona a espécie e o recipiente.
3. A gerência informa a quantidade de mudas.
4. O sistema apresenta as áreas e, dentro da escolhida, apenas os canteiros **livres**.
5. A gerência seleciona a área e o canteiro.
6. A gerência informa a data de plantio, que assume o dia corrente.
7. A gerência confirma.
8. O sistema cria o lote, gera o código, grava o movimento de entrada e calcula a previsão de disponibilidade a partir do tempo de produção da espécie.

### FA-1: A leva não cabe em um canteiro

No passo 3, a quantidade excede o que o canteiro ainda comporta, contando os lotes já abertos nele.
O sistema **avisa e não recusa** (RN-92), e a gerência escolhe: apertar mais, ou criar **dois
lotes**, um por canteiro, em vez de um lote em dois lugares (RN-76).

> **Por que não um lote em dois canteiros.** Seria uma entidade a mais e um campo a mais em toda
> tela que pede lote, para representar o que dois lotes já representam. E a pergunta que a
> operação faz é "o que tem neste canteiro", que o lote inteiro num canteiro só responde direto.
> **O canteiro comporta vários lotes** desde 26/08/2026: o que não existe é o lote espalhado.

### FA-2: Espécie sem tempo de produção cadastrado

No passo 8, a espécie não tem tempo de produção. O lote é criado normalmente e a previsão fica
**em branco**, não em zero: previsão ausente é informação, previsão zerada é erro disfarçado de
dado.

### FE-1: Canteiro já ocupado

No passo 7, o canteiro escolhido recebeu outro lote enquanto a tela estava aberta. O sistema recusa
e recarrega a lista de canteiros livres.

---

## UC-48 · Repicar lote

| | |
|---|---|
| **Ator principal** | Colaborador |
| **Objetivo** | Passar mudas de um lote para recipiente maior, preservando a ligação com a leva de origem |
| **Requisitos** | RF-86, RF-87, RF-88 |
| **Frequência** | Semanal |
| **Pré-condições** | Existe lote aberto com saldo, e há canteiro livre para o lote de destino |
| **Pós-condições** | Lote novo aberto apontando para o de origem; saldo do de origem reduzido; dois movimentos gravados |

### FP: Fluxo principal

1. O colaborador encerra a tarefa de repicagem (UC-51) e o sistema pede o destino das mudas.
2. O sistema exibe o lote de origem, com espécie, recipiente e saldo.
3. O colaborador informa a quantidade repicada e o recipiente de destino.
4. O colaborador seleciona a área e o canteiro de destino, entre os livres.
5. O colaborador confirma.
6. O sistema grava um movimento de saída no lote de origem e cria o lote de destino com o movimento de entrada correspondente, apontando para a origem.
7. O sistema encerra o lote de origem se o saldo dele chegar a zero, liberando o canteiro.

### FA-1: Repicagem parcial

No passo 3, a quantidade é menor que o saldo. O lote de origem **permanece aberto** com o saldo
restante, e passa a ter um lote filho. É o caso normal: repica-se o que está no ponto.

### FA-2: Parte das mudas morreu na repicagem

No passo 3, entram menos mudas do que saíram. O sistema apresenta a diferença e pede a causa, em
lista fechada, gravando-a como **perda do lote de origem** no mesmo gesto (RN-90). A soma
"repicadas mais perdidas" tem de igualar a quantidade que saiu.

> Sem esta alternativa, a diferença viraria evaporação silenciosa: o saldo do lote de origem
> cairia sem que nada explicasse para onde a muda foi, e a mortalidade da espécie ficaria
> subestimada exatamente na etapa que mais mata.

### FA-3: Repica para o mesmo canteiro

No passo 4, o destino é o próprio canteiro do lote de origem, que se esvaziou por inteiro. O
sistema aceita, porque o passo 7 o liberou antes.

### FE-1: Quantidade maior que o saldo

No passo 5, a quantidade repicada somada à perdida excede o saldo do lote de origem. O sistema
recusa e apresenta o saldo disponível (RN-78).

---

## UC-50 · Apontar início de tarefa

| | |
|---|---|
| **Ator principal** | Gerência |
| **Objetivo** | Marcar que um funcionário começou uma tarefa, a partir do cartão dele na agenda do dia |
| **Requisitos** | RF-94, RF-95, RF-97, RF-99 |
| **Frequência** | Várias vezes ao dia |
| **Pré-condições** | O funcionário está ativo e o dia dele não foi encerrado |
| **Pós-condições** | Um apontamento aberto para o funcionário; o anterior, se havia, fechado no mesmo instante |

### FP: Fluxo principal

1. A gerência abre a agenda do dia e vê as tarefas planejadas e um cartão por funcionário.
2. A gerência aciona "começar tarefa" no cartão de um funcionário.
3. O sistema apresenta os tipos de tarefa, com os planejados para aquele turno em primeiro lugar.
4. A gerência escolhe o tipo de tarefa.
5. O sistema pede **apenas** o que aquele tipo de tarefa declara exigir: espécie, recipiente, lote e canteiro (RF-82).
6. A gerência informa o que foi pedido.
7. A gerência confirma.
8. O sistema fecha o apontamento que estiver aberto para aquele funcionário, registrando o instante como fim, e abre o novo.
9. O cartão do funcionário passa a exibir a tarefa em curso e desde quando.

### FA-1: Tarefa fora do planejado

No passo 4, a tarefa escolhida não estava na agenda daquele turno. O sistema aceita e registra o
apontamento **sem atribuição vinculada**, marcando-o como avulso. O planejado não é alterado: a
comparação entre planejado e realizado é justamente o que se quer enxergar.

### FA-2: Vários funcionários na mesma tarefa

No passo 2, a gerência seleciona mais de um cartão antes de acionar. O sistema abre **um
apontamento por pessoa**, todos ligados à mesma atribuição, porque cada um pode sair dela em
momento diferente (RN-83, RN-84).

### FA-3: O funcionário já estava em outra tarefa

No passo 8, havia apontamento aberto. É o **caso normal**, e não exceção: o gesto de começar
outra tarefa é o gesto de dizer que saiu da anterior. O sistema não pergunta nada e não pede
confirmação.

> **Por que sem confirmação.** Perguntar "deseja encerrar a tarefa atual?" a cada troca
> acrescentaria um toque a um gesto que se repete dezenas de vezes por dia, para confirmar o que o
> próprio gesto já declarou. A alternativa, exigir encerrar antes de começar, produziria tarefas
> eternamente abertas nos dias corridos, que são justamente os dias em que a troca ocorre.

### FE-1: Tipo de tarefa exige lote e nenhum foi informado

No passo 7, o tipo exige lote e o campo está vazio. O sistema recusa e indica o campo (RN-82).

### FE-2: Dia do funcionário já encerrado

No passo 2, o dia daquele funcionário foi encerrado (UC-52). O sistema informa e oferece
**reabrir o dia**, em vez de recusar em silêncio: encerramento por engano é comum, e recusar faria
a gerência deixar de registrar o resto do dia.

---

## UC-51 · Encerrar tarefa

| | |
|---|---|
| **Ator principal** | Gerência |
| **Objetivo** | Fechar o apontamento e registrar o que a tarefa produziu e consumiu |
| **Requisitos** | RF-98, RF-99, RF-100, RF-101, RF-107 |
| **Frequência** | Várias vezes ao dia |
| **Pré-condições** | Existe apontamento aberto para o funcionário |
| **Pós-condições** | Apontamento fechado com hora de fim; horas calculadas; consumo de insumo abatido do saldo |

### FP: Fluxo principal

1. A gerência aciona "encerrar" na tarefa, ou no cartão de um funcionário, ou inicia outra tarefa (UC-50 FA-3), ou encerra o dia (UC-52).
2. O sistema grava a hora de fim e calcula o intervalo trabalhado de cada participante.
3. Se o tipo de tarefa declarar **lote específico**, o sistema pede o lote, uma vez para a tarefa, e não pede canteiro, que vem do lote (RF-99).
4. Se o tipo de tarefa for **quantitativo por unidade**, o sistema pede **um número por participante**: quanto cada um fez (RF-98, RF-107).
5. Se o tipo de tarefa não for quantitativo, o passo 4 não ocorre e o sistema não pede número algum.
6. O sistema oferece, de forma opcional, registrar insumos consumidos e gasto extra (UC-53).
7. O sistema fecha o apontamento de todos os participantes e abate do saldo os insumos informados.
8. Se a tarefa movimentou mudas, o sistema grava o movimento no lote correspondente.

### FA-1: Tarefa de repicagem

No passo 8, a tarefa é repicagem. O sistema encaminha para UC-48, porque o destino das mudas
precisa ser informado antes que o movimento possa ser gravado.

### FA-2: Sem conexão

Nos passos 7 e 8, não há rede. O sistema grava localmente com a chave gerada no aparelho, confirma
e envia ao restabelecer a conexão (RNF-05). O reenvio não duplica o apontamento nem o consumo.

### FA-3: Encerramento sem quantidade

No passo 4, a gerência não sabe quantos um dos participantes fez e deixa o campo dele em branco. O
sistema aceita e marca **aquele** apontamento como sem contagem, sem afetar os demais: as horas
ficam registradas de qualquer modo, e hora sem contagem vale mais do que nenhum registro.

### FA-4: Encerramento de uma pessoa só

No passo 1, quem encerra é o cartão individual, e não a tarefa: alguém saiu do serviço no meio do
turno. O fluxo é o mesmo, com um único participante, e a tarefa continua aberta para os demais.

### FE-1: Quantidade inválida

No passo 4, um dos números é negativo ou não numérico. O sistema recusa e mantém o apontamento
aberto, sem gravar os demais participantes: ou encerra a tarefa inteira, ou não encerra nenhuma
parte dela.

### FE-2: Lote não informado

No passo 3, o tipo de tarefa declara lote específico e o lote não foi informado. O sistema recusa o
encerramento e mantém a tarefa aberta (RF-99): sem lote a atividade não se liga à leva, e nem a
perda nem o custo encontram destino.

### FE-3: Consumo maior que o saldo do insumo

No passo 7, o consumo deixaria o saldo do insumo negativo. O sistema **grava assim mesmo** e
sinaliza o saldo negativo (RF-105).

> **Por que aqui o sistema não recusa, e no lote recusa.** O saldo do lote é apurado pelo próprio
> sistema desde a entrada, e saldo negativo ali é contradição interna. O saldo de insumo depende
> de toda compra ter sido lançada, e o histórico do viveiro diz que nem toda foi: recusar o
> consumo real por causa de uma compra não lançada faria o campo parar de registrar consumo, que
> é o dado mais caro de obter. O negativo aqui **é o alerta** de que falta lançar compra.

---

## UC-32 · Emitir cotação

| | |
|---|---|
| **Ator principal** | Chefia |
| **Objetivo** | Consultar preço e disponibilidade junto a fornecedores para o que a produção própria não atende |
| **Requisitos** | RF-53 |
| **Frequência** | Semanal |
| **Pré-condições** | Existe ao menos um fornecedor cadastrado e apto a ser contatado |
| **Pós-condições** | Uma cotação por fornecedor, agrupadas sob a mesma consulta, no estado *na fila* |

### FP: Fluxo principal

1. A gerência inicia uma cotação, opcionalmente vinculada a um pedido de cliente.
2. A gerência informa os itens: espécie, quantidade e tamanho desejado.
3. O sistema sugere os fornecedores que declaram fornecer aquelas espécies.
4. A gerência seleciona os fornecedores a consultar.
5. O sistema compõe a mensagem de consulta e a apresenta para revisão.
6. A gerência revisa e ajusta o texto.
7. A gerência confirma.
8. O sistema cria uma cotação por fornecedor, todas vinculadas à mesma consulta, e registra o texto enviado.
9. A gerência aciona o envio a cada fornecedor pelo canal escolhido.

### FA-1: Cotação avulsa

No passo 1, a gerência não vincula a cotação a pedido algum, é sondagem de mercado ou reposição de
estoque. O fluxo segue idêntico, sem o vínculo.

### FE-1: Fornecedor que solicitou não ser contatado

No passo 4, um fornecedor selecionado está marcado como *não contatar*. O sistema **o exclui da
seleção** e informa o motivo.

> O envio é sempre ação manual do usuário, nunca disparo automático do sistema. Essa decisão é de
> conformidade, não de conveniência: aliada à marcação de *não contatar*, sustenta o direito de
> oposição previsto na legislação de proteção de dados, ver
> [`E5`](../E-qualidade/E5-mapeamento-lgpd.md).

---

## UC-33 · Escolher proposta

| | |
|---|---|
| **Ator principal** | Chefia |
| **Objetivo** | Comparar as respostas recebidas e definir de quem comprar cada espécie |
| **Requisitos** | RF-54, RF-33 |
| **Frequência** | Semanal |
| **Pré-condições** | Existe consulta com ao menos duas respostas registradas |
| **Pós-condições** | Uma proposta escolhida por espécie; preço de revenda definido |

### FP: Fluxo principal

1. A gerência registra as respostas recebidas, informando preço unitário e observações por item.
2. O sistema marca as cotações respondidas e apresenta o comparativo por espécie, com os fornecedores lado a lado.
3. A chefia escolhe, para cada espécie, a proposta vencedora.
4. O sistema registra a escolha, admitindo **uma única** por espécie dentro da consulta.
5. A chefia define o preço de revenda ao cliente.
6. O sistema valida o preço contra o piso mínimo.
7. O sistema registra o preço de revenda.

### FA-1: Fornecedor sem resposta

No passo 1, decorrido o prazo, um fornecedor não respondeu. A gerência marca a cotação como *sem
retorno*, e ela é excluída do comparativo sem ser apagada: o histórico de quem responde alimenta o
grau de confiabilidade do fornecedor.

### FE-1: Preço de revenda abaixo do piso

No passo 6, o preço informado não cobre o custo de aquisição acrescido da margem mínima. O sistema
recusa e apresenta o piso aplicável.

---

## UC-36 · Classificar lançamentos

| | |
|---|---|
| **Ator principal** | Chefia |
| **Objetivo** | Atribuir significado aos lançamentos importados do extrato, enquanto a memória do gasto ainda existe |
| **Requisitos** | RF-57, RF-58, RF-59 |
| **Frequência** | Semanal |
| **Pré-condições** | Existem lançamentos importados e não classificados |
| **Pós-condições** | Fila reduzida; classificações convertidas em regra para os meses seguintes |

### FP: Fluxo principal

1. A chefia abre a fila de lançamentos pendentes.
2. O sistema apresenta os lançamentos que **não** reconheceu, com data, valor e descrição do banco.
3. Para cada lançamento, a chefia informa centro de custo, categoria e contraparte, escolhendo de
   lista, sem digitação livre. A lista de centros oferece só os **ativos**, mantidos em UC-45.
4. O sistema registra a classificação e a converte em regra para lançamentos equivalentes futuros.
5. O sistema remove o lançamento da fila.
6. A chefia repete até esvaziar a fila.

### FA-1: Competência distinta da movimentação

No passo 3, o gasto pertence economicamente a outro mês, insumo comprado em fevereiro e pago em
abril.

1. A chefia informa a **data de competência**.
2. O sistema registra as duas datas, e o custeio passa a considerar a competência.

> Sem essa distinção, o mês de semeadura pesada aparece barato e o mês do pagamento aparece caro.
> e o custo por muda mente nos dois.

### FA-2: Gasto que serve a mais de um centro de custo

No passo 3, o lançamento é compartilhado: a energia de um imóvel que abriga casa e clínica. A chefia
divide o valor entre centros, e o sistema valida que a soma das partes iguala o total.

### FA-3: Lançamento já reconhecido

No passo 2, o sistema identifica lançamento equivalente a outro já classificado, aplica a
classificação automaticamente e o mantém fora da fila.

### FE-1: Mês já fechado

No passo 3, o lançamento pertence a mês travado. O sistema recusa a alteração e informa que é
necessário reabrir o período.


---

## UC-57 · Manter protocolo de atividades

| | |
|---|---|
| **Ator principal** | Gerência |
| **Objetivo** | Definir, por tipo de embalagem, a sequência de etapas que todo lote daquele tipo passa a seguir sozinho |
| **Requisitos** | RF-121, RF-122, RF-123, RF-124, RF-125 |
| **Frequência** | Raríssima: uma vez por tipo de embalagem, revista por safra |
| **Pré-condições** | Existem tipos de tarefa no catálogo e ao menos um tipo de embalagem |
| **Pós-condições** | Protocolo vigente para o tipo; lotes criados a partir daí passam a segui-lo |

### FP: Fluxo principal

1. A gerência abre Configurações e escolhe o tipo de embalagem, ou cria um novo (RF-121).
2. O sistema apresenta o protocolo vigente do tipo, ou um protocolo vazio quando não há.
3. A gerência acrescenta uma etapa, escolhendo o tipo de tarefa no catálogo e dando-lhe um rótulo.
4. A gerência declara o agendamento: **sequencial**, que ocorre uma vez, ou **recorrente**, que repete (RF-123).
5. A gerência declara o **evento de referência**: a criação do lote, ou a conclusão de uma etapa já existente no protocolo, escolhida numa lista (RF-124).
6. A gerência informa o tempo em dias e, quando recorrente, o intervalo entre ocorrências.
7. A gerência informa o turno e decide se a etapa tem **alerta de atraso** ligado (RF-125).
8. Quando sequencial, a gerência escolhe, de forma opcional, a fase do lote que a conclusão da etapa passa a gravar.
9. O sistema valida a etapa e a acrescenta ao protocolo, na ordem escolhida.
10. A alteração passa a valer **apenas para o que ainda vai ser gerado** (RN-107).

### FA-1: Etapa que não altera a fase

No passo 8, a etapa é sequencial mas não corresponde a nenhuma mudança de fase do lote. A gerência
deixa o campo vazio e o sistema aceita: nem toda etapa sequencial promove o lote, e obrigar a
escolher uma fase faria inventar transições que o ciclo produtivo não tem.

### FA-2: Etapa com janela de aviso própria

No passo 7, a etapa precisa avisar antes ou depois do padrão. A gerência informa a janela própria,
em percentual do intervalo, e ela prevalece sobre o parâmetro geral (RN-104).

### FA-3: Alteração de protocolo com lotes em andamento

No passo 10, existem lotes seguindo o protocolo. O sistema **não** reescreve as ordens já emitidas
nem as datas já cumpridas: a alteração vale para a próxima geração de cada lote (RN-107). É a
mesma garantia que a recorrência de calendário dá em RN-96, e a razão é a mesma: regra que
reescrevesse o passado apagaria dia já trabalhado.

### FE-1: Âncora circular

No passo 5, a etapa é apontada como âncora de outra que já é âncora dela, direta ou indiretamente.
O sistema recusa e indica o ciclo. **É validação de aplicação, e não do banco**: a restrição não
cabe em verificação declarativa, e sem ela as duas etapas nunca ganhariam data de referência, e
nenhuma das duas venceria coisa alguma, em silêncio.

### FE-2: Etapa recorrente sem intervalo

No passo 6, o agendamento é recorrente e o intervalo está vazio. O sistema recusa: recorrente sem
intervalo não tem como produzir a ocorrência seguinte, e aceitá-la criaria uma etapa que ocorre uma
vez e se apresenta como se repetisse.

### FE-3: Segundo protocolo vigente para o mesmo tipo

No passo 2, já existe protocolo vigente e a gerência tenta criar outro para o mesmo tipo de
embalagem. O sistema recusa e oferece editar o existente: dois vigentes tornariam indeterminado
qual deles o lote novo segue.

---

## UC-58 · Dividir lote

| | |
|---|---|
| **Ator principal** | Gerência |
| **Objetivo** | Separar uma leva em dois lotes que passam a ser conduzidos de forma independente |
| **Requisitos** | RF-135, RF-134 |
| **Frequência** | Ocasional |
| **Pré-condições** | Lote aberto, com saldo maior que um |
| **Pós-condições** | Dois lotes abertos, cada um com o seu saldo e o seu protocolo; lote original encerrado com motivo `dividido` |

### FP: Fluxo principal

1. A gerência aciona "dividir" na ficha do lote.
2. O sistema apresenta o saldo atual e pede a quantidade que vai para o segundo lote.
3. A gerência informa a quantidade e o canteiro de cada resultante, que podem ser o mesmo.
4. O sistema cria os dois lotes, ambos apontando para o original como lote de origem.
5. O sistema **copia para cada um o acompanhamento do protocolo do original**: a fase e a data da última execução de cada etapa (RN-109).
6. O sistema encerra o original com motivo `dividido`, e **cancela** as ordens dele ainda em aberto (RN-108).
7. O sistema grava os movimentos que explicam o saldo dos três lotes.
8. Daí em diante, os dois resultantes vencem e cumprem etapas de forma independente.

### FA-1: Divisão que mantém os dois no mesmo canteiro

No passo 3, os dois resultantes ficam onde estavam. O sistema aceita: um canteiro comporta vários
lotes (RN-76), e a divisão é frequentemente contábil, e não física.

### FA-2: Etapa já vencida no momento da divisão

No passo 5, o original tem etapa vencida e não executada. Os dois resultantes **herdam o
vencimento vencido**, e nascem os dois em atraso naquela etapa. É o correto: a limpeza que não foi
feita continua não tendo sido feita, em nenhuma das duas metades.

### FE-1: Quantidade igual ou maior que o saldo

No passo 3, a quantidade informada não deixa saldo para o primeiro lote. O sistema recusa: divisão
que esvazia um dos lados não é divisão, é transferência de canteiro, e existe caminho próprio para
ela.

### FE-2: Lote com apontamento em curso

No passo 1, há tarefa aberta sobre o lote. O sistema recusa e indica a tarefa: dividir com
apontamento em curso deixaria a execução apontando para um lote que passou a estar encerrado, e a
hora trabalhada perderia destino.

---

## UC-59 · Customizar tempo de etapa por espécie

| | |
|---|---|
| **Ator principal** | Gerência |
| **Objetivo** | Ajustar, para uma espécie, o tempo de uma etapa específica do protocolo |
| **Requisitos** | RF-133 |
| **Frequência** | Rara, e apenas para as espécies que fogem da média |
| **Pré-condições** | Espécie cadastrada e protocolo montado para o tipo de embalagem em questão |
| **Pós-condições** | A espécie passa a usar o tempo próprio; as demais seguem o do tipo de embalagem |

### FP: Fluxo principal

1. A gerência abre o cadastro da espécie e a seção de tempos do protocolo.
2. O sistema apresenta as etapas dos protocolos, com o tempo padrão de cada uma.
3. A gerência informa o tempo próprio da espécie na etapa que difere.
4. O sistema grava apenas o que foi preenchido, e o que ficou em branco continua vindo do protocolo (RN-106).
5. Lotes daquela espécie criados a partir daí passam a usar o tempo próprio.

### FA-1: Remover a customização

No passo 3, a gerência apaga o valor informado antes. O sistema remove a customização em vez de
gravar zero: zero seria uma etapa que vence no mesmo dia da âncora, e é o oposto do que apagar
significa.

### FE-1: Nenhum dos dois tempos preenchido

No passo 3, a gerência abre a customização de uma etapa e confirma sem informar nada. O sistema não
grava linha alguma: registro sem nenhum valor próprio faz a consulta de tempo efetivo percorrer um
caminho a mais para chegar ao mesmo número.

### FE-2: Alteração com lotes em andamento

No passo 5, existem lotes da espécie em curso. O novo tempo vale para os vencimentos **ainda não
gerados**, e não reescreve ordem já emitida (RN-107). O sistema informa quantos lotes serão
afetados na próxima geração, para que a gerência saiba o alcance antes de confirmar.

---

## Casos de uso não especificados

Os quarenta e quatro casos restantes de [`C1`](C1-diagrama-casos-de-uso.md) são operações de manutenção
de cadastro e de consulta, cujo fluxo se resume a selecionar, preencher e confirmar, sem alternativas
relevantes. Especificá-los produziria repetição sem ganho analítico.

Dois merecem registro por já estarem descritos em linguagem de negócio na documentação de domínio:
**UC-35 (importar extrato)** e **UC-37 (fechar o mês)**, ambos em
[`docs/rotinas/4-financeiro/`](../../rotinas/4-financeiro/).
