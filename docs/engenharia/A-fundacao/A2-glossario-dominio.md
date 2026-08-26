# A2: Glossário do domínio

> **Artefato:** Glossário do domínio · **Bloco:** A, Fundação e escopo
> **Destino no TCC:** Apêndice
> **Fundamentação:** Sommerville (2011) aponta que requisitos mal compreendidos decorrem, em boa
> parte, da dificuldade dos *stakeholders* em articular suas necessidades e da ambiguidade da
> linguagem natural. Fixar um vocabulário único antes da especificação é a medida preventiva contra
> essa ambiguidade.

## Propósito

Este glossário estabelece o vocabulário único do projeto. Cada termo tem **uma** definição, e todos
os demais artefatos: especificação de requisitos, casos de uso, modelo de dados, dicionário de
dados: devem usá-la sem variação.

O viveiro opera há mais de três décadas com um vocabulário oral próprio, no qual o mesmo objeto
recebe nomes diferentes conforme quem fala, e nomes iguais designam coisas diferentes conforme o
contexto. A coluna **"Como a empresa chama"** registra essas variações observadas, e a coluna
**"Forma canônica"** define o termo adotado no sistema e na documentação.

Convenção adotada: o texto e a documentação usam a forma canônica em **português**; o código e o
banco de dados usam o equivalente em **inglês**, indicado entre parênteses quando relevante.

---

## 1. Produção e domínio florestal

| Termo | Definição | Como a empresa chama | Forma canônica |
|---|---|---|---|
| **Espécie** | Entidade central do sistema. Tipo botânico de árvore produzido pelo viveiro, identificado por nome científico e um ou mais nomes populares. Tudo no sistema (custo, preço, estoque, perda, pedido) se refere a uma espécie. | "planta", "muda", pelo nome popular | **Espécie** (`species`) |
| **Nome popular** | Denominação regional da espécie. Uma mesma espécie admite vários; a busca do sistema deve encontrá-la por qualquer um deles. | o nome usado no dia a dia | **Nome popular** |
| **Nome científico** | Denominação binomial da espécie. Identificador não ambíguo, usado em documentos oficiais e projetos de compensação ambiental. | "nome de fora", "nome técnico" | **Nome científico** |
| **Muda** | Exemplar individual de uma espécie, em produção ou pronto para venda. É a unidade de contagem, de custo e de venda. | "pé", "planta", "unidade" | **Muda** |
| **Característica da espécie** | Classificação de uso e origem, em catálogo fixo: **nativa, exótica, frutífera, ornamental, madeireira, forrageira**. Uma espécie admite **várias** simultaneamente, uma nativa pode ser ao mesmo tempo frutífera e madeireira, e forçar escolha única falsearia o catálogo. | "tipo", "pra que serve" | **Característica** (`tag`) |
| **Semeadura** | Atividade de deposição da semente no substrato, marco inicial do ciclo produtivo. | "plantar a semente", "semear" | **Semeadura** |
| **Germinação** | Período entre a semeadura e a emergência da plântula. Varia por espécie e é um dos determinantes do tempo total de produção. | "nascer" | **Germinação** |
| **Repicagem** | Transferência da plântula para recipiente individual definitivo. Segunda etapa do ciclo e ponto de maior consumo de mão de obra e substrato. | "repicar", "passar pro saco" | **Repicagem** |
| **Rustificação** | Fase final, em que a muda é exposta a condições próximas às do campo para ganhar resistência antes da expedição. | "endurecer", "botar no sol" | **Rustificação** |
| **Muda pronta** | Muda que concluiu o ciclo produtivo e está apta à venda. Só a muda pronta compõe estoque comercializável. | "muda boa", "pronta pra sair" | **Muda pronta** |
| **Tempo de produção** | Intervalo entre a semeadura e a muda pronta, medido em meses e específico de cada combinação de espécie e recipiente. | "tempo que leva" | **Tempo de produção** |
| **Perda** | Muda que não chegará à venda, por qualquer causa. Registrada com espécie, recipiente, quantidade e causa. | "morreu", "perdeu" | **Perda** (`loss`) |
| **Causa da perda** | Motivo da perda, em lista fechada: seca, praga, geada, manuseio, outro. Lista fechada é requisito, campo livre inviabiliza a análise por causa. | - | **Causa** |
| **Mortalidade** | Razão entre mudas perdidas e mudas produzidas, por espécie e período. Acima de **20%** dispara alerta, é regra de negócio, não convenção de interface. | "perda", "quanto morreu" | **Taxa de mortalidade** |
| **Coleta de sementes** | Atividade de obtenção de sementes em campo, com custo próprio de deslocamento e mão de obra que compõe o custo da espécie. Nem toda espécie tem semente comprada. | "buscar semente" | **Coleta de sementes** |
| **Lote** | **Leva de mudas da mesma espécie, no mesmo recipiente, plantada junta e ocupando um canteiro.** É a unidade de rastreamento da produção: onde a muda está, de onde veio e quanto sobrou dela. Um lote ocupa **um** canteiro; leva que não cabe em um canteiro é outro lote. | "a leva", "aquele canteiro de ipê" | **Lote** (`batch`) |
| **Situação do lote** | Como o lote está indo, em três estados: **saudável**, **atenção** e **crítico**. Não é digitada: sai do atraso das tarefas que estavam planejadas para aquele lote e ninguém executou. Apontar o lote no mapa mostra qual tarefa falta. | "tá atrasado", "esse aí tá bom" | **Situação do lote** (`batch_health`) |
| **Lote de origem** | Lote do qual outro nasceu. A repicagem para recipiente maior **não move** o lote: encerra parte do lote de origem e cria um lote novo que aponta para ele. É o que permite saber quanto de uma leva sobreviveu até a venda. | "veio daquele tubete" | **Lote de origem** (`parent_batch`) |
| **Área** | Divisão física do viveiro, identificada por **letra** (A, B, C…). Contém canteiros. | "área A", "lá em cima" | **Área** (`area`) |
| **Canteiro** | Subdivisão da área, identificada por **número** dentro dela, de 1 até o máximo daquela área. O endereço de uma muda no viveiro é o par letra da área + número do canteiro, escrito **`A-3`**: letra, hífen, número. | "canteiro 4", "o quatro da B" | **Canteiro** (`bed`) |
| **Classificação** | Atividade de separar, dentro de um lote, as mudas mortas das vivas e as maiores das menores. Ocorre em dois momentos: **pós-germinação** e **seleção**, esta quando a muda troca de bandeja. A parte morta vira perda do lote no mesmo registro. | "classificar", "escolher" | **Classificação** |

## 2. Recipientes e medidas

| Termo | Definição | Como a empresa chama | Forma canônica |
|---|---|---|---|
| **Recipiente** | Vasilhame em que a muda é produzida. **Determina o porte da muda e, por consequência, o custo e o preço.** Espécie e recipiente formam o par que identifica um produto comercializável: a mesma espécie em dois recipientes é, comercialmente, dois produtos. | "saco", "embalagem", "tubete" | **Recipiente** (`container`) |
| **Tubete** | Recipiente cônico rígido e reutilizável, de menor volume. Usado na fase inicial e em produção de larga escala para restauração. | "tubete" | **Tubete** |
| **Saco** | Recipiente plástico flexível, identificado pelas medidas em centímetros: **10x18, 17x22, 20x26, 28x32**. O número maior indica muda de maior porte, mais cara e de ciclo mais longo. | pelo tamanho: "dez por dezoito" | **Saco 10x18**, **Saco 17x22**, **Saco 20x26**, **Saco 28x32** |
| **Balde** | Recipiente de maior volume, para mudas de grande porte destinadas a paisagismo. | "balde", "vaso grande" | **Balde** |
| **Tipo de embalagem** | Agrupamento de recipientes que **compartilham o mesmo manejo**: saco, tubete, e outros que a gerência criar. Os quatro sacos são **um** tipo, porque o que muda o manejo é ser saco, não a medida do saco. É por ele, e não pelo recipiente, que o protocolo de atividades chega ao lote. | "é saco ou é tubete" | **Tipo de embalagem** (`container_type`) |
| **Substrato** | Meio de cultivo que preenche o recipiente. Principal insumo por volume, e o consumo por recipiente é dado essencial do custeio. | "terra" | **Substrato** |
| **Insumo** | Todo material consumível aplicado na produção. Lista fechada de categorias: substrato, adubo, defensivo, recipiente, outros. | "material" | **Insumo** (`input`) |

## 3. Comercial

| Termo | Definição | Como a empresa chama | Forma canônica |
|---|---|---|---|
| **Cliente** | Pessoa física ou jurídica que compra mudas. Distingue-se do **fornecedor**, ainda que a mesma pessoa possa ser ambos. | "comprador", "freguês" | **Cliente** (`customer`) |
| **Canal de venda** | Segmento comercial que determina a margem aplicada sobre o custo. Lista fechada: **atacado** (padrão), **compensação ambiental**, **paisagismo**, **prefeitura**, **varejo**. O mesmo produto tem preços diferentes por canal, e isso é regra, não exceção. | "tipo de venda", "pra quem é" | **Canal de venda** |
| **Atacado** | Canal padrão. Venda em volume, majoritariamente negociada por WhatsApp. | "venda normal" | **Atacado** |
| **Compensação ambiental** | Canal em que a compra atende exigência legal de recuperação de área. Costuma exigir nota fiscal e nome científico das espécies. | "projeto", "compensação" | **Compensação ambiental** |
| **Pedido** | Registro de uma intenção de compra, com um ou mais itens. Percorre um ciclo de estados até a entrega. | "encomenda", "pedido" | **Pedido** (`order`) |
| **Item de pedido** | Linha do pedido: espécie, recipiente, quantidade e preço unitário acordado. | "linha", "item" | **Item de pedido** |
| **Item genérico** | Item de pedido **sem espécie definida**: o cliente pede quantidade e porte, não espécies. Comum em compensação ambiental, onde o que importa é "500 mudas nativas de mata atlântica" e a escolha das espécies cabe ao viveiro. Pode trazer uma lista fechada de espécies aceitas e uma especificação de qualidade. | "pedido aberto", "misto", "o que tiver" | **Item genérico** |
| **Especificação** | Exigência de qualidade declarada pelo cliente sobre o item, em texto livre, por exemplo, altura mínima ou fuste retilíneo. Único campo de texto livre admitido no fluxo de pedido, por não comportar lista fechada. | "o que ele pediu" | **Especificação** |
| **Verificação de disponibilidade** | Conferência, item a item, de que o estoque comporta o pedido. Etapa que antecede a aprovação e pode resultar em atendimento parcial. | "ver se tem" | **Verificação de disponibilidade** |
| **Disponibilidade parcial** | Situação em que só parte da quantidade pedida existe em estoque. O sistema precisa representá-la, tratar como tudo ou nada não corresponde à operação real. | "só tem um pouco" | **Disponibilidade parcial** |
| **Carga** | Conjunto físico de mudas separado para uma entrega. Um pedido pode gerar mais de uma carga. | "carga", "viagem" | **Carga** (`load`) |
| **Separação** | Atividade de recolher fisicamente as mudas da carga, executada em campo pelo colaborador. | "separar", "juntar as mudas" | **Separação** |
| **Frete** | Custo de transporte até o cliente, calculado por **R$/km** e incorporado ao preço, não cobrado à parte. | "entrega", "frete" | **Frete** |
| **Preço** | Valor de venda unitário. Formado por **custo real + margem do canal**, respeitado um **piso mínimo de segurança** abaixo do qual a venda não é permitida. | "valor", "quanto tá" | **Preço** |
| **Piso mínimo** | Valor abaixo do qual o preço não pode cair, independentemente de negociação. Existe para impedir venda com prejuízo, situação que hoje ocorre sem que ninguém perceba. | "preço mínimo" | **Piso mínimo** |
| **Fornecedor** | Viveiro ou produtor terceiro de quem se compram mudas para completar pedido que a produção própria não atende. | "parceiro", "outro viveiro" | **Fornecedor** (`supplier`) |
| **Cotação** | Consulta de preço e disponibilidade enviada a um ou mais fornecedores, com respostas comparáveis entre si. | "orçamento", "cotar" | **Cotação** (`quote`) |

## 4. Custeio e financeiro

| Termo | Definição | Como a empresa chama | Forma canônica |
|---|---|---|---|
| **Custo variável** | Parcela do custo que varia com a quantidade produzida: substrato, semente, recipiente, insumos e mão de obra direta. | "o que gasta" | **Custo variável** |
| **Custo fixo** | Despesa mensal que independe do volume produzido: folha, energia, água, manutenção, combustível, depreciação. | "despesa do mês" | **Custo fixo** |
| **Rateio** | Distribuição do custo fixo mensal sobre a produção do período, para compor o custo unitário. | "dividir a despesa" | **Rateio** |
| **Custo unitário** | Custo total de uma muda: custo variável mais custo fixo rateado, específico por espécie e recipiente. É a base do preço e o número que hoje não existe. | "quanto custa a muda" | **Custo unitário** |
| **Margem** | Diferença percentual entre preço e custo unitário. Margem negativa significa venda com prejuízo. | "lucro" | **Margem** |
| **Centro de custo** | Destino a que um gasto pertence. Os cinco iniciais são **viveiro, sítio, clínica, casa, floricultura**, e a lista é **mantida no cadastro**, não fixa: a chefia acrescenta centro novo e inativa o que acabou, sem que a escolha no lançamento deixe de ser fechada. Existe porque a base financeira mistura gasto de negócio e gasto pessoal da família, e separá-los é pré-requisito para qualquer indicador confiável. | "de onde saiu" | **Centro de custo** |
| **Centro inativo** | Centro de custo que saiu das escolhas de lançamento novo e continua válido no lançamento antigo. Não se exclui centro: o lançamento já classificado guarda o seu para sempre. | "o que acabou" | **Centro inativo** |
| **Lançamento** | Movimentação financeira individual, originada da importação do extrato bancário. | "gasto", "movimento" | **Lançamento** |
| **Extrato bancário** | Registro emitido pelo banco. **É a fonte da verdade do financeiro**: gasto que não passou por conta alguma não existe para o sistema. | "extrato" | **Extrato bancário** |
| **Classificação** | Ato de atribuir centro de custo, categoria e contraparte a um lançamento importado. | "marcar", "categorizar" | **Classificação** |
| **Contraparte** | Pessoa ou empresa do outro lado da movimentação: quem recebeu ou de quem se recebeu. | "pra quem foi" | **Contraparte** |
| **Data de competência** | Mês a que o gasto pertence economicamente, que pode diferir do mês em que o dinheiro saiu. O substrato comprado em fevereiro e pago em abril é custo de fevereiro, porque foi em fevereiro que virou muda. | - | **Competência** |
| **Fechamento do mês** | Conferência do saldo calculado contra o saldo do extrato, seguida do travamento do período. Indicador só é calculado sobre mês fechado. | "fechar o mês" | **Fechamento** |
| **Nota fiscal** | Documento fiscal da venda, emitido em sistema externo. O sistema registra o número e a necessidade de emissão; **não emite a nota**. | "nota", "NF" | **Nota fiscal** |

## 5. Usuários, acesso e sistema

| Termo | Definição | Como a empresa chama | Forma canônica |
|---|---|---|---|
| **Perfil** | Papel de acesso atribuído ao usuário, que determina o que ele pode ver e fazer. São três perfis de negócio (chefia, gerência, colaborador) mais um papel técnico de administração. | "permissão", "acesso" | **Perfil** (`role`) |
| **Chefia** | Perfil responsável por vendas, finanças, aprovação de preço, decisões e entregas. Único com acesso à **base bancária**, extrato, lançamento, compra, custo fixo e fechamento; o que dela deriva e não a expõe (custo, preço, margem, indicador) a gerência lê. | "o Gilberto" | **Chefia** |
| **Gerência** | Perfil responsável pela operação: coordenação, estoque, planejamento de produção e distribuição de tarefas. | "quem coordena" | **Gerência** |
| **Colaborador** | Perfil de execução em campo: registro de produção, de perdas, conclusão das tarefas atribuídas a ele e separação de cargas. Não acessa preço, custo nem base bancária. | "funcionário", "o pessoal" | **Colaborador** |
| **Administrador** | Papel técnico de administração do sistema, gestão de usuários e manutenção. Não corresponde a uma função da empresa e não participa das rotinas de negócio. | - | **Administrador** |
| **Rotina** | Processo de negócio recorrente do viveiro, decomposto em etapas com perfil responsável por cada uma. As rotinas se agrupam nos **quatro módulos** do sistema (Cadastros, Produção, Comercial e Financeiro), com Acesso atravessando os quatro. | "o jeito que se faz" | **Rotina** |
| **Formulário de campo** | Tela projetada para uso em ambiente de trabalho, sob as restrições de no máximo cinco campos, listas fechadas em vez de campo aberto, botões grandes e resposta visual imediata. | - | **Formulário de campo** |
| **Uso offline** | Capacidade de registrar dados sem conexão, com envio posterior automático. Necessário porque a conexão no viveiro é instável. | "sem internet" | **Uso offline** |

## 6. Trabalho e agenda

| Termo | Definição | Como a empresa chama | Forma canônica |
|---|---|---|---|
| **Turno** | Metade do dia de trabalho, **manhã** ou **tarde**. É a unidade de planejamento da agenda: o viveiro nunca planejou por hora marcada. A hora de início e de fim de cada turno é **parâmetro mantido no sistema**, não constante de código, e é dela que sai a duração do turno. | "de manhã", "de tarde" | **Turno** (`work_shift`) |
| **Tarefa** | Tipo de trabalho do viveiro, em catálogo mantido pela gerência, agrupado em seis categorias: **semente, terra, plantio, manutenção, pós-morte, expedição**. Toda tarefa é medida **por tempo**; parte delas é **também contada por unidade**, e nessas a contagem é de cada pessoa que participou. | "serviço", "função" | **Tipo de tarefa** (`task_type`) |
| **Atribuição** | O que a gerência planejou: uma tarefa, num dia, num turno, para um ou mais funcionários. É a célula da agenda. Planejamento, ainda não trabalho feito. | "o que tá marcado" | **Atribuição** (`assignment`) |
| **Apontamento** | O registro de que um funcionário **começou** e **terminou** uma tarefa, com hora. Uma pessoa faz uma tarefa por vez: começar outra encerra a anterior. É o realizado, contra a atribuição, que é o planejado. | "apontar", "tá fazendo o quê" | **Apontamento** (`task_execution`) |
| **Tarefa recorrente** | A rotina fixa que não se lança todo dia: um tipo de tarefa, um funcionário ou grupo, os dias da semana em que vale e a **hora de início e de fim**. É a única parte do planejamento que declara hora, e declara justamente por já tê-la na vida real. Gera atribuições na agenda; alterar o dia gerado não altera a regra. **Repete por calendário, e o sujeito é a equipe**: é o que a distingue do protocolo de atividades. | "todo dia de manhã", "é fixo" | **Tarefa recorrente** (`task_recurrence`) |
| **Protocolo de atividades** | A **receita de manejo de um tipo de embalagem**: a sequência ordenada de etapas que todo lote daquele tipo passa a seguir sozinho. Diferente da tarefa recorrente, **o sujeito é o lote** e a repetição conta a partir da execução real, e não do calendário. | "o que tem que fazer no tubete" | **Protocolo de atividades** (`protocol`) |
| **Etapa do protocolo** | Uma linha do protocolo: aponta para uma tarefa do catálogo e diz **quando** ela ocorre. **Sequencial** ocorre uma vez e avança a fase do lote; **recorrente** repete indefinidamente e não avança fase nenhuma. | "a classificação", "a limpeza" | **Etapa do protocolo** (`protocol_step`) |
| **Evento de referência** | O acontecimento a partir do qual a etapa conta o prazo: a **criação do lote** ou a **conclusão de uma etapa específica**, que **não é necessariamente a anterior**. "Classificar pós-germinação" conta do plantio, e não da criação do lote, porque a semente pode ficar dias esperando plantio antes de germinar. | "a partir de quando conta" | **Evento de referência**, ou **âncora** (`anchor`) |
| **Ordem do protocolo** | A ocorrência de uma etapa, já materializada na agenda. **É atribuição comum**, do mesmo tipo que a gerência lança à mão, e nasce **sem ninguém escalado**: o protocolo diz o que e quando, quem faz continua sendo de quem monta a agenda. | "apareceu na agenda" | **Ordem do protocolo** (`assignment` com etapa) |

---

## Termos deliberadamente não adotados

Registrar o que **não** entra no vocabulário evita que reapareça em revisões futuras.

| Termo evitado | Motivo |
|---|---|
| **Produto** | Ambíguo entre a espécie e o par espécie + recipiente. Usar sempre o termo específico. |
| **Estoque** (como entidade) | Estoque é uma **quantidade derivada** de produção menos perdas menos vendas, não uma entidade própria. Tratá-lo como entidade cria duas verdades sobre o mesmo número. |
| **Usuário** (como sinônimo de perfil) | Usuário é a pessoa; perfil é o papel. Um não substitui o outro. |
| **Cadastro** | Genérico demais. Usar o nome da entidade: cadastro de cliente, de espécie, de fornecedor. |

> **"Lote" saiu desta lista.** Ficou fora do vocabulário até 24/08/2026 justamente pela ambiguidade
> registrada aqui: a mesma palavra designava uma leva de semeadura, um conjunto à venda e uma
> carga. O levantamento da rotina de produção desfez a ambiguidade ao amarrar o termo a um
> canteiro e a uma leva plantada junta, e a partir daí ele passou a ter definição única, na
> seção 1. O conjunto à venda continua sendo **item de pedido**, e a carga continua sendo
> **carga**: são os dois sentidos que a palavra deixou de carregar.

---

## Manutenção

Termo novo que apareça em qualquer artefato entra primeiro aqui. Se um termo do glossário for
alterado, os artefatos que o utilizam precisam ser revistos: a matriz de rastreabilidade
([`B5`](../B-requisitos/B5-matriz-rastreabilidade.md)) permite localizar onde.
