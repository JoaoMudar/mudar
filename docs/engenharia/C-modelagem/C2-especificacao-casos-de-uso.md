# C2 — Especificação de casos de uso

> **Artefato:** Especificação de casos de uso · **Bloco:** C — Modelagem
> **Destino no TCC:** Capítulo 4, seção 4.4 (amostra) e Apêndice (integral)
> **Fundamentação:** Pressman e Maxim (2016, p. 149) definem que "um caso de uso conta uma jornada
> estilizada sobre como um usuário [...] interage com o sistema sob um conjunto de circunstâncias
> específicas". Sommerville (2011) complementa que a descrição textual detalha o que o diagrama
> apenas indica.

---

## Como ler

Oito casos de uso, dos quarenta catalogados em [`C1`](C1-diagrama-casos-de-uso.md), estão
especificados aqui. O critério de seleção foi duplo: **concentração de fluxos alternativos** e
**custo operacional do erro**. Cadastrar um insumo errado corrige-se em segundos; separar a carga
errada põe um caminhão na estrada com a muda errada.

Todos têm como pré-condição comum uma **sessão autenticada** cujo perfil autoriza a operação — a
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

### FP — Fluxo principal

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

### FA-1 — Cliente ainda não cadastrado

No passo 3, a chefia não localiza o cliente.

1. A chefia aciona o cadastro rápido sem sair da tela de pedido.
2. O sistema solicita apenas **nome e telefone**.
3. O sistema cria o cliente e o seleciona no pedido, retornando ao passo 4.

> O cadastro fiscal completo não é exigido aqui. Exigi-lo interromperia a única
> etapa do processo que compete com uma conversa de WhatsApp em andamento — a complementação ocorre
> no fechamento, e apenas se houver nota fiscal a emitir (UC-26, FA-1).

### FA-2 — Item genérico

No passo 6, o cliente não especificou as espécies — pediu quantidade e porte.

1. A chefia marca o item como **genérico** e informa recipiente e quantidade, sem espécie.
2. O sistema, opcionalmente, aceita a lista de espécies que o cliente admite.
3. O sistema, opcionalmente, aceita a especificação de qualidade em texto livre.
4. O sistema registra o item genérico e retorna ao passo 8.

> Item genérico sem lista de espécies significa **aberto**: qualquer espécie o atende. É o caso
> corrente em compensação ambiental, onde a exigência é de quantidade e diversidade, não de espécies
> nomeadas.

### FE-1 — Quantidade inválida

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

### FP — Fluxo principal

1. A gerência abre um pedido pendente de verificação.
2. O sistema apresenta os itens em formato de lista de conferência, com espécie, recipiente e quantidade pedida.
3. O sistema registra o pedido como *verificando disponibilidade*.
4. Para cada item, a gerência confirma que há quantidade suficiente.
5. O sistema marca o item como **disponível**.
6. Concluídos todos os itens, a gerência encerra a verificação.
7. O sistema registra o pedido como *verificado* e notifica a chefia.

### FA-1 — Disponibilidade parcial

No passo 4, existe menos do que o pedido.

1. A gerência informa a **quantidade efetivamente disponível**.
2. O sistema valida que o valor está entre 1 e a quantidade pedida.
3. O sistema marca o item como **parcial**, preservando as duas quantidades, e retorna ao passo 4.

### FA-2 — Disponível em outro recipiente

No passo 4, a espécie existe, mas em recipiente diferente do pedido.

1. A gerência informa a quantidade disponível e **qual recipiente** de fato existe.
2. O sistema registra ambos e retorna ao passo 4.

> Trata-se de negociação, não de erro: um cliente que pediu saco 17x22 frequentemente aceita 20x26
> por outro preço. Reduzir esse caso a "indisponível" descartaria uma venda que ocorreria.

### FA-3 — Item indisponível

No passo 4, não há nenhuma unidade. A gerência informa quantidade zero, o sistema marca o item como
**indisponível** e retorna ao passo 4. O pedido segue: a decisão de cancelar, substituir ou cotar com
fornecedor cabe à chefia (UC-26) ou origina uma cotação (UC-32).

### FA-4 — Item genérico

No passo 4, o item não tem espécie definida. A gerência indica as espécies com que pretende atendê-lo,
respeitada a lista de espécies aceitas quando houver. O sistema valida a restrição e retorna ao passo 4.

### FE-1 — Espécie fora da lista aceita

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

### FP — Fluxo principal

1. A chefia abre um pedido verificado.
2. O sistema apresenta a análise: itens disponíveis, parciais e indisponíveis, com as quantidades de cada caso.
3. O sistema apresenta, por item, o preço sugerido do canal de venda do pedido.
4. A chefia confirma ou ajusta o preço de cada item.
5. O sistema valida que nenhum preço está abaixo do piso mínimo.
6. A chefia informa se o pedido exige nota fiscal.
7. A chefia aprova o pedido.
8. O sistema registra o pedido como *aprovado*, gera a carga de separação com os itens e quantidades aprovados, e notifica os colaboradores.

### FA-1 — Nota fiscal exigida e cliente com cadastro incompleto

No passo 6, a chefia indica que há nota a emitir, mas o cliente possui apenas nome e telefone.

1. O sistema sinaliza a pendência e solicita os dados fiscais — tipo de pessoa, documento, razão social quando pessoa jurídica, endereço.
2. A chefia completa os dados **na própria tela de fechamento**.
3. O sistema valida o documento informado e retorna ao passo 7.

### FA-2 — Atendimento parcial aceito

No passo 4, há itens parciais e a chefia decide faturar o que existe.

1. A chefia confirma as quantidades disponíveis como quantidades aprovadas.
2. O sistema registra a diferença e retorna ao passo 7.

### FA-3 — Complementação por fornecedor

No passo 2, há itens indisponíveis que a chefia decide comprar de terceiro. O caso de uso é suspenso
e origina uma cotação (UC-32). O pedido permanece *verificado* até que a cotação se resolva.

### FE-1 — Preço abaixo do piso mínimo

No passo 5, o preço informado é inferior ao piso. O sistema **recusa** a aprovação, indica o piso
aplicável e mantém o pedido em edição.

> O piso é bloqueio, não alerta. A regra existe justamente porque a venda com prejuízo hoje ocorre
> sem que ninguém perceba — um aviso que pode ser ignorado não altera esse quadro.

### FE-2 — Documento fiscal inválido

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

### FP — Fluxo principal

1. O colaborador abre a lista de cargas a separar.
2. O sistema apresenta os itens da carga com espécie, recipiente e quantidade, em lista de conferência.
3. O sistema registra a carga como *separando*.
4. O colaborador separa fisicamente um item e o marca como separado.
5. O sistema registra a marcação e apresenta confirmação visual imediata.
6. O colaborador repete os passos 4 e 5 até o último item.
7. O sistema registra a carga como *pronta*, atualiza o pedido para *pronto para envio* e notifica a chefia.

### FA-1 — Sem conexão

Nos passos 4 e 5, o dispositivo está sem rede.

1. O sistema registra a marcação localmente e confirma ao colaborador.
2. O sistema envia os registros pendentes assim que a conexão se restabelece.

> Este fluxo alternativo é o mais executado de todos os aqui descritos, e não a exceção: a área de
> separação é onde a conexão falha com mais frequência. Um sistema que exija rede nesse ponto será
> substituído por papel no primeiro dia.

### FA-2 — Divergência entre carga e estoque físico

No passo 4, o item não existe na quantidade indicada. O colaborador registra a quantidade
efetivamente separada, e o sistema notifica a gerência da divergência para nova verificação.

---

## UC-17 · Registrar perda

| | |
|---|---|
| **Ator principal** | Colaborador |
| **Objetivo** | Registrar mudas perdidas no momento e no local em que a perda é constatada |
| **Requisitos** | RF-26, RF-28, RF-29 |
| **Frequência** | Diária |
| **Pré-condições** | Nenhuma além da sessão autenticada |
| **Pós-condições** | Perda registrada; mortalidade da espécie recalculada; alerta emitido se ultrapassar o limite |

### FP — Fluxo principal

1. O colaborador aciona o registro de perda.
2. O sistema apresenta um formulário de **quatro campos**: espécie, recipiente, quantidade e causa.
3. O colaborador seleciona a espécie.
4. O colaborador seleciona o recipiente.
5. O colaborador informa a quantidade perdida.
6. O colaborador seleciona a causa em lista fechada — seca, praga, geada, manuseio ou outro.
7. O colaborador confirma.
8. O sistema grava a perda, exibe confirmação visual e retorna ao formulário vazio, pronto para o próximo registro.
9. O sistema recalcula a taxa de mortalidade da espécie no período.

### FA-1 — Mortalidade acima do limite

No passo 9, a taxa recalculada ultrapassa 20%. O sistema emite alerta à gerência identificando
espécie, taxa e causa predominante. **O colaborador não é interrompido** — o alerta é dirigido a quem
pode agir sobre ele.

### FA-2 — Sem conexão

Nos passos 7 e 8, não há rede. O sistema grava localmente, confirma ao colaborador e envia ao
restabelecer a conexão. O recálculo do passo 9 ocorre na sincronização.

### FE-1 — Quantidade inválida

No passo 5, a quantidade é zero, negativa ou não numérica. O sistema recusa, indica o campo e
preserva os demais já preenchidos.

> **Nota de projeto.** O formulário tem quatro campos, e não cinco, embora o limite permitisse mais
> um. Registrar o local da perda dentro do viveiro melhoraria a análise, e foi descartado: seria o
> campo que faria o colaborador deixar de registrar. Ver o conflito documentado em
> [`B2`, seção 5](../B-requisitos/B2-especificacao-requisitos.md).

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

### FP — Fluxo principal

1. A gerência inicia uma cotação, opcionalmente vinculada a um pedido de cliente.
2. A gerência informa os itens: espécie, quantidade e tamanho desejado.
3. O sistema sugere os fornecedores que declaram fornecer aquelas espécies.
4. A gerência seleciona os fornecedores a consultar.
5. O sistema compõe a mensagem de consulta e a apresenta para revisão.
6. A gerência revisa e ajusta o texto.
7. A gerência confirma.
8. O sistema cria uma cotação por fornecedor, todas vinculadas à mesma consulta, e registra o texto enviado.
9. A gerência aciona o envio a cada fornecedor pelo canal escolhido.

### FA-1 — Cotação avulsa

No passo 1, a gerência não vincula a cotação a pedido algum — é sondagem de mercado ou reposição de
estoque. O fluxo segue idêntico, sem o vínculo.

### FE-1 — Fornecedor que solicitou não ser contatado

No passo 4, um fornecedor selecionado está marcado como *não contatar*. O sistema **o exclui da
seleção** e informa o motivo.

> O envio é sempre ação manual do usuário, nunca disparo automático do sistema. Essa decisão é de
> conformidade, não de conveniência: aliada à marcação de *não contatar*, sustenta o direito de
> oposição previsto na legislação de proteção de dados — ver
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

### FP — Fluxo principal

1. A gerência registra as respostas recebidas, informando preço unitário e observações por item.
2. O sistema marca as cotações respondidas e apresenta o comparativo por espécie, com os fornecedores lado a lado.
3. A chefia escolhe, para cada espécie, a proposta vencedora.
4. O sistema registra a escolha, admitindo **uma única** por espécie dentro da consulta.
5. A chefia define o preço de revenda ao cliente.
6. O sistema valida o preço contra o piso mínimo.
7. O sistema registra o preço de revenda.

### FA-1 — Fornecedor sem resposta

No passo 1, decorrido o prazo, um fornecedor não respondeu. A gerência marca a cotação como *sem
retorno*, e ela é excluída do comparativo sem ser apagada — o histórico de quem responde alimenta o
grau de confiabilidade do fornecedor.

### FE-1 — Preço de revenda abaixo do piso

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

### FP — Fluxo principal

1. A chefia abre a fila de lançamentos pendentes.
2. O sistema apresenta os lançamentos que **não** reconheceu, com data, valor e descrição do banco.
3. Para cada lançamento, a chefia informa centro de custo, categoria e contraparte, todos em lista fechada.
4. O sistema registra a classificação e a converte em regra para lançamentos equivalentes futuros.
5. O sistema remove o lançamento da fila.
6. A chefia repete até esvaziar a fila.

### FA-1 — Competência distinta da movimentação

No passo 3, o gasto pertence economicamente a outro mês — insumo comprado em fevereiro e pago em
abril.

1. A chefia informa a **data de competência**.
2. O sistema registra as duas datas, e o custeio passa a considerar a competência.

> Sem essa distinção, o mês de semeadura pesada aparece barato e o mês do pagamento aparece caro —
> e o custo por muda mente nos dois.

### FA-2 — Gasto que serve a mais de um centro de custo

No passo 3, o lançamento é compartilhado — a energia de um imóvel que abriga casa e clínica. A chefia
divide o valor entre centros, e o sistema valida que a soma das partes iguala o total.

### FA-3 — Lançamento já reconhecido

No passo 2, o sistema identifica lançamento equivalente a outro já classificado, aplica a
classificação automaticamente e o mantém fora da fila.

### FE-1 — Mês já fechado

No passo 3, o lançamento pertence a mês travado. O sistema recusa a alteração e informa que é
necessário reabrir o período.

---

## Casos de uso não especificados

Os trinta e dois casos restantes de [`C1`](C1-diagrama-casos-de-uso.md) são operações de manutenção
de cadastro e de consulta, cujo fluxo se resume a selecionar, preencher e confirmar, sem alternativas
relevantes. Especificá-los produziria repetição sem ganho analítico.

Dois merecem registro por já estarem descritos em linguagem de negócio na documentação de domínio:
**UC-35 (importar extrato)** e **UC-37 (fechar o mês)**, ambos em
[`docs/rotinas/4-financeiro/`](../../rotinas/4-financeiro/).
