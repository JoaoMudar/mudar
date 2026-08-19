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

## 2. Recipientes e medidas

| Termo | Definição | Como a empresa chama | Forma canônica |
|---|---|---|---|
| **Recipiente** | Vasilhame em que a muda é produzida. **Determina o porte da muda e, por consequência, o custo e o preço.** Espécie e recipiente formam o par que identifica um produto comercializável: a mesma espécie em dois recipientes é, comercialmente, dois produtos. | "saco", "embalagem", "tubete" | **Recipiente** (`container`) |
| **Tubete** | Recipiente cônico rígido e reutilizável, de menor volume. Usado na fase inicial e em produção de larga escala para restauração. | "tubete" | **Tubete** |
| **Saco** | Recipiente plástico flexível, identificado pelas medidas em centímetros: **10x18, 17x22, 20x26, 28x32**. O número maior indica muda de maior porte, mais cara e de ciclo mais longo. | pelo tamanho: "dez por dezoito" | **Saco 10x18**, **Saco 17x22**, **Saco 20x26**, **Saco 28x32** |
| **Balde** | Recipiente de maior volume, para mudas de grande porte destinadas a paisagismo. | "balde", "vaso grande" | **Balde** |
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
| **Centro de custo** | Destino a que um gasto pertence. Lista fechada de cinco: **viveiro, sítio, clínica, casa, floricultura**. Existe porque a base financeira mistura gasto de negócio e gasto pessoal da família, e separá-los é pré-requisito para qualquer indicador confiável. | "de onde saiu" | **Centro de custo** |
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

---

## Termos deliberadamente não adotados

Registrar o que **não** entra no vocabulário evita que reapareça em revisões futuras.

| Termo evitado | Motivo |
|---|---|
| **Produto** | Ambíguo entre a espécie e o par espécie + recipiente. Usar sempre o termo específico. |
| **Lote** | Usado oralmente para designar coisas distintas, uma leva de semeadura, um conjunto à venda, uma carga. Enquanto não houver rastreamento formal de leva de produção, o termo fica fora da especificação. |
| **Estoque** (como entidade) | Estoque é uma **quantidade derivada** de produção menos perdas menos vendas, não uma entidade própria. Tratá-lo como entidade cria duas verdades sobre o mesmo número. |
| **Usuário** (como sinônimo de perfil) | Usuário é a pessoa; perfil é o papel. Um não substitui o outro. |
| **Cadastro** | Genérico demais. Usar o nome da entidade: cadastro de cliente, de espécie, de fornecedor. |

---

## Manutenção

Termo novo que apareça em qualquer artefato entra primeiro aqui. Se um termo do glossário for
alterado, os artefatos que o utilizam precisam ser revistos: a matriz de rastreabilidade
([`B5`](../B-requisitos/B5-matriz-rastreabilidade.md)) permite localizar onde.
