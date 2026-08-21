# B4: Quadros de regras de negócio e requisitos

> **Artefato:** Quadros formatados para o texto do TCC · **Bloco:** B, Engenharia de requisitos
> **Destino no TCC:** Apêndice D, Quadros de regras de negócio e requisitos
> **Fonte do conteúdo:** transcrito de [`B3`](B3-regras-de-negocio.md) §3, §4, §5 e §6.2 e de
> [`B2`](B2-especificacao-requisitos.md). Em qualquer divergência, **`B3` e `B2` mandam**.
> **Saída em Word:** `npm run docs:quadros` gera `quadros-regras-de-negocio-e-requisitos.docx`
> a partir deste arquivo, já formatado (Arial, bordas, cabeçalho sombreado, A4 com margens ABNT).

---

## Como usar

Este arquivo existe por uma razão de formato, não de conteúdo: os artefatos `B2` e `B3` são
documentos de engenharia, com colunas de tipo, origem, prioridade e verificação que não cabem
no corpo do trabalho. Os quadros abaixo são a **redução desses artefatos ao que vai impresso**.
duas ou quatro colunas, prontos para colar no Word como tabela.

Nada aqui se edita por conta própria. Alterou uma regra? Altere em `B3` e transcreva para cá.
A numeração dos quadros é a que já está no texto do TCC e **não muda**, mesmo quando um quadro
cresce: o Quadro 3, por exemplo, foi de 6 para 12 linhas sem virar dois.

**Para levar ao Word**, não copie daqui à mão:

```bash
npm run docs:quadros
```

O comando lê este arquivo e escreve `quadros-regras-de-negocio-e-requisitos.docx` na raiz do
repositório, com os 13 quadros já formatados, é só abrir e colar cada tabela no lugar. O `.docx`
é **saída descartável**: some e volta a cada execução, e editar dentro dele é a mesma armadilha de
editar dentro de `word/`.

O parser é literal: ele espera `## Quadro N – Título`, a tabela markdown logo abaixo e a linha
`Fonte: …` em seguida. Mudar esse formato quebra a geração em silêncio, então confira a contagem
de linhas que o comando imprime.

---

# Quadros: regras de negócio

## Quadro 1 – Regras de negócio da área de domínio e produto

| Código | Descrição |
|---|---|
| RN-01 | Toda informação do viveiro (custo, preço, estoque, perda, pedido) refere-se a uma espécie. A espécie é a unidade em torno da qual a operação se organiza. |
| RN-02 | A espécie possui um nome científico e vários nomes populares regionais. |
| RN-03 | Uma espécie admite várias características simultâneas, nativa, exótica, frutífera, ornamental, madeireira, forrageira. |
| RN-04 | O recipiente determina o porte da muda e, por consequência, seu custo e seu preço. Espécie e recipiente formam o par que identifica um produto comercializável. |
| RN-05 | O ciclo produtivo (semeadura, germinação, repicagem, rustificação) tem duração conhecida por espécie e recipiente. A data de disponibilidade decorre da data de semeadura somada a essa duração. |
| RN-06 | Só a muda pronta compõe estoque comercializável. Muda em produção não é estoque de venda. |

Fonte: Elaborado pelo autor (2026).

## Quadro 2 – Regras de negócio da área de custeio

| Código | Descrição |
|---|---|
| RN-07 | O custo unitário de uma muda é o custo variável (substrato, semente, recipiente, demais insumos e mão de obra) somado ao custo fixo do período rateado sobre a produção, sempre específico por espécie e recipiente. |
| RN-08 | O preço do insumo varia ao longo do tempo, e o custo apurado em um período permanece válido para aquele período. O valor anterior não é descartado. |
| RN-09 | Alteração em insumo, custo fixo ou consumo invalida o custo unitário anterior das espécies afetadas. |
| RN-10 | A mão de obra compõe o custo por tempo médio estimado por atividade, e não por apontamento individual de horas. |
| RN-11 | A semente coletada em campo tem custo próprio (deslocamento, combustível e horas), rateado pela quantidade obtida. |
| RN-12 | O gasto pertence ao mês de competência, não ao mês em que o dinheiro saiu. |
| RN-53 | A mão de obra entra no custo por um valor-hora médio da equipe, e não pelo salário de cada um. |
| RN-56 | A tarefa que não se refere a uma espécie é custo indireto e entra no rateio geral, junto dos custos fixos. |

Fonte: Elaborado pelo autor (2026).

## Quadro 3 – Regras de negócio da área de produção, estoque e perdas

| Código | Descrição |
|---|---|
| RN-13 | A quantidade disponível de uma espécie é produção registrada menos perdas menos vendas. |
| RN-14 | A contagem física prevalece sobre a quantidade calculada. |
| RN-15 | Espécie zerada ou abaixo da quantidade mínima precisa ser sinalizada antes que o pedido chegue. |
| RN-16 | A perda é evento normal da produção e exige causa classificada em lista fechada, seca, praga, geada, manuseio, outro. |
| RN-17 | A mortalidade é a razão entre mudas perdidas e mudas produzidas, por espécie e período. Acima de 20% a situação é anormal e exige providência. |
| RN-18 | A muda perdida carrega o custo já incorrido. A perda tem valor financeiro, não apenas quantidade. |
| RN-48 | O trabalho do viveiro é planejado por turno, não por horário. A unidade da agenda é dia × turno (manhã, tarde), e um turno vale quatro horas. |
| RN-50 | A semana fecha e, fechada, não se altera. |
| RN-51 | Tarefa planejada e não confirmada conta como realizada ao fechar a semana, com a condição registrada. |
| RN-52 | O colaborador responde pelas suas tarefas. Vê e conclui as que lhe foram atribuídas, e nenhuma outra. |
| RN-57 | Só semeadura e repicagem somam ao estoque. Irrigação, adubação e rustificação são manejo e não alteram quantidade. |

Fonte: Elaborado pelo autor (2026).

## Quadro 4 – Regras de negócio da área de precificação

| Código | Descrição |
|---|---|
| RN-19 | O preço de venda é custo unitário real mais a margem do canal, nunca estimativa intuitiva. |
| RN-20 | O canal de venda é lista fechada de cinco, atacado (padrão), compensação ambiental, paisagismo, prefeitura, varejo, e determina a margem. O mesmo produto tem preços diferentes por canal. |
| RN-21 | Nenhuma venda ocorre abaixo do piso mínimo de segurança, independentemente da negociação. |
| RN-22 | O piso mínimo varia por canal e por espécie. |
| RN-23 | O frete é calculado por R$/km e incorporado ao preço, não cobrado à parte. |
| RN-24 | Margem negativa é venda com prejuízo e precisa ser detectada e destacada. |
| RN-58 | O preço vale por um período, e a margem de uma venda se afere contra o custo vigente no dia em que ela foi feita. |
| RN-59 | O preço calculado é sugestão. O valor acordado pode diferir dele, desde que não desça abaixo do piso. |

Fonte: Elaborado pelo autor (2026).

## Quadro 5 – Regras de negócio da área de cliente e obrigação fiscal

| Código | Descrição |
|---|---|
| RN-25 | O cliente é pessoa física ou jurídica. A venda com nota fiscal exige o conjunto fiscal completo e documento válido. |
| RN-26 | Nome e telefone bastam para registrar o pedido, sem interromper a venda. |
| RN-27 | Toda contraparte do viveiro é uma identidade única (quem compra, quem vende, quem trabalha, o sócio, o banco, o governo, o contador), e o vínculo com o viveiro é papel acumulável dessa identidade, escolhido em lista fechada. A mesma pessoa pode ser cliente e fornecedor. |
| RN-28 | A nota fiscal é emitida em sistema externo. O viveiro registra a exigência e o número. |
| RN-29 | A venda para compensação ambiental exige o nome científico da espécie e, em geral, nota fiscal. |
| RN-30 | Dado pessoal de cliente é tratado sob a Lei nº 13.709/2018, com finalidade, base legal e prazo de retenção declarados. |
| RN-55 | O tipo de tarefa é vocabulário fechado, e carrega o tempo médio por unidade. |
| RN-62 | Uma pessoa tem mais de um endereço, e o de entrega pode não ser o de cobrança. É o endereço de entrega que responde pela distância, e portanto pelo frete. |

Fonte: Elaborado pelo autor (2026).

## Quadro 6 – Regras de negócio da área de pedido, entrega e fornecedor

| Código | Descrição |
|---|---|
| RN-31 | O pedido percorre uma sequência de estados até a entrega, e cada transição tem um responsável. Quem conclui uma etapa aciona a seguinte. |
| RN-32 | O cliente pode comprar quantidade e porte sem definir espécie (item genérico), e a escolha das espécies cabe ao viveiro. |
| RN-33 | No item genérico, o cliente pode restringir a lista de espécies aceitas e declarar especificação de qualidade. Espécie fora da lista não atende o item. |
| RN-34 | A disponibilidade parcial é atendimento válido. |
| RN-35 | Pode-se ofertar recipiente diferente do solicitado, desde que registrado qual foi efetivamente ofertado. |
| RN-37 | A carga é gerada a partir dos itens aprovados e separada fisicamente em campo. É ela, e não o pedido, a unidade que sai do viveiro. Um pedido pode gerar mais de uma carga. |
| RN-38 | Quando a produção própria não atende o pedido, completa-se com muda de fornecedor, mediante cotação comparável entre propostas. |
| RN-39 | A revenda de muda de terceiro também respeita o piso mínimo. O custo de aquisição substitui o custo de produção. |
| RN-66 | O carregamento acontece no dia útil anterior à entrega. |
| RN-67 | Item ainda não verificado e item indisponível são situações opostas, não a mesma. |

Fonte: Elaborado pelo autor (2026).

## Quadro 7 – Regras de negócio da área financeira

| Código | Descrição |
|---|---|
| RN-40 | O extrato bancário é a fonte da verdade do financeiro. Gasto que não passou por conta alguma não existe para o sistema. |
| RN-41 | O centro de custo separa gasto de negócio de gasto pessoal da família, lista fechada de cinco, viveiro, sítio, clínica, casa, floricultura. |
| RN-42 | Lançamento equivalente a outro já classificado recebe a mesma classificação. |
| RN-43 | O fechamento do mês confere o saldo calculado contra o saldo do extrato e trava o período. Indicador financeiro só se calcula sobre mês fechado. |
| RN-44 | A base bancária é assunto exclusivo da chefia. O que dela deriva e não a expõe (custo, margem, preço, indicador) segue em leitura para a gerência. |
| RN-68 | Transferência entre contas do próprio viveiro não é despesa nem receita. |
| RN-69 | Um mesmo gasto pode servir a mais de um centro de custo e então se reparte entre eles. A soma das partes é o valor total. |
| RN-70 | Pedido entregue não é pedido pago. O recebimento é evento próprio, e só o extrato o comprova. |

Fonte: Elaborado pelo autor (2026).

## Quadro 8 – Regras de negócio das áreas de acesso, responsabilidade e indicadores

| Código | Descrição |
|---|---|
| RN-45 | Cada pessoa tem um perfil (chefia, gerência, colaborador, administrador) que determina o que ela vê e o que pode fazer. |
| RN-46 | Todo registro tem autor identificado. |
| RN-47 | Indicador sem comparação com o período anterior e sem meta não orienta decisão. Cada perfil acompanha os indicadores da sua responsabilidade. |

Fonte: Elaborado pelo autor (2026).

## Quadro 9 – Distribuição das regras de negócio por área do domínio

| Área | Regras | Quantidade |
|---|---|---|
| A: Domínio e produto | RN-01 a RN-06 | 6 |
| B: Custeio | RN-07 a RN-12, RN-53, RN-56 | 8 |
| C: Produção, estoque e perdas | RN-13 a RN-18, RN-48, RN-50 a RN-52, RN-57 | 11 |
| D: Precificação | RN-19 a RN-24, RN-58, RN-59 | 8 |
| E: Cliente e obrigação fiscal | RN-25 a RN-30, RN-55, RN-62 | 8 |
| F: Pedido, entrega e fornecedor | RN-31 a RN-35, RN-37 a RN-39, RN-66, RN-67 | 10 |
| G: Financeiro | RN-40 a RN-44, RN-68 a RN-70 | 8 |
| H: Acesso e responsabilidade | RN-45, RN-46 | 2 |
| I: Indicadores | RN-47 | 1 |
| Total |  | 62 |

Fonte: Elaborado pelo autor (2026).

---

# Quadros: requisitos e vínculo com as regras de negócio

## Quadro 10 – Requisitos funcionais e as regras de negócio que os originam

| Código | Nome | Descrição | Código RN |
|---|---|---|---|
| RF-01 | Autenticação de usuário | O sistema deve autenticar o usuário por identificador e senha antes de conceder qualquer acesso. | RN-45, RN-46 |
| RF-02 | Troca de senha no primeiro acesso | O sistema deve exigir troca de senha no primeiro acesso do usuário. | – |
| RF-03 | Encerramento de sessão | O sistema deve permitir ao usuário encerrar sua sessão. | – |
| RF-04 | Registro de tentativas de acesso | O sistema deve registrar cada tentativa de autenticação com data, origem e dispositivo. | RN-46 |
| RF-05 | Gestão de usuários e perfis | O sistema deve permitir ao administrador criar usuários e atribuir perfil. | RN-45 |
| RF-06 | Verificação de permissão por operação | O sistema deve verificar a permissão do perfil a cada operação, e não apenas ocultar elementos da interface. | RN-45 |
| RF-07 | Gestão de sessões ativas | O sistema deveria permitir ao usuário visualizar e encerrar suas sessões ativas. | – |
| RF-08 | Cadastro de espécie | O sistema deve permitir cadastrar espécie com nome científico, nomes populares, características, tempo de germinação, tempo de produção e fotografia. | RN-01, RN-02, RN-03, RN-05, RN-29 |
| RF-09 | Busca de espécie por nome | O sistema deve localizar a espécie por qualquer um de seus nomes populares ou pelo nome científico. | RN-02, RN-03 |
| RF-10 | Cadastro de recipiente | O sistema deve permitir cadastrar recipientes com volume e consumo de substrato por unidade. | RN-04, RN-07 |
| RF-11 | Cadastro de insumo com histórico de preços | O sistema deve permitir cadastrar insumos com unidade de medida e custo, preservando o histórico de preços. | RN-08 |
| RF-12 | Registro de custo fixo mensal | O sistema deve permitir registrar custos fixos mensais por categoria e mês de referência. | RN-07, RN-12 |
| RF-13 | Registro de coleta de sementes | O sistema deve permitir registrar coleta de sementes com região, distância, combustível, horas e quantidade obtida. | RN-11 |
| RF-14 | Registro de consumo de insumo | O sistema deve permitir registrar, em campo, o consumo de insumo indicando insumo, espécie, recipiente e quantidade. | RN-04, RN-07 |
| RF-15 | Cálculo do custo variável | O sistema deve calcular o custo variável de cada combinação de espécie e recipiente, somando substrato, semente, recipiente, demais insumos e mão de obra. | RN-04, RN-07, RN-10, RN-11 |
| RF-16 | Rateio do custo fixo | O sistema deve ratear o custo fixo mensal sobre a produção do período. | RN-07, RN-12, RN-56 |
| RF-17 | Consulta do custo unitário | O sistema deve apresentar o custo unitário por espécie e recipiente. | RN-07, RN-19, RN-58 |
| RF-18 | Recálculo do custo unitário | O sistema deve recalcular o custo unitário quando houver alteração em insumo, custo fixo ou consumo. | RN-08, RN-09 |
| RF-19 | Registro de atividade de produção | O sistema deve permitir registrar atividade de produção (semeadura, repicagem, irrigação, adubação) com espécie, recipiente e quantidade. | RN-01, RN-04, RN-05, RN-10, RN-13, RN-57 |
| RF-20 | Atribuição de atividades | O sistema deve permitir à gerência atribuir atividades de produção a colaboradores. | RN-10, RN-46 |
| RF-21 | Acompanhamento do ciclo produtivo | O sistema deveria apresentar o acompanhamento do ciclo produtivo por espécie, com previsão de disponibilidade a partir do tempo de produção. | RN-05, RN-06 |
| RF-22 | Consulta de estoque disponível | O sistema deve apresentar a quantidade disponível por espécie e recipiente. | RN-04, RN-06, RN-13, RN-57 |
| RF-23 | Registro de contagem física | O sistema deve permitir registrar contagem física de estoque, com a quantidade contada substituindo a calculada. | RN-14 |
| RF-24 | Alerta de estoque mínimo | O sistema deve sinalizar espécies zeradas ou abaixo da quantidade mínima definida. | RN-15 |
| RF-25 | Histórico de contagens | O sistema deveria manter o histórico de contagens por espécie. | RN-14 |
| RF-26 | Registro de perda | O sistema deve permitir registrar perda com espécie, recipiente, quantidade e causa selecionada em lista fechada. | RN-01, RN-04, RN-16 |
| RF-27 | Consulta de perdas por período | O sistema deve listar as perdas registradas com filtro por período. | RN-16, RN-17 |
| RF-28 | Cálculo da taxa de mortalidade | O sistema deve calcular a taxa de mortalidade por espécie e período. | RN-17 |
| RF-29 | Alerta de mortalidade | O sistema deve emitir alerta para espécie cuja mortalidade ultrapasse 20%. | RN-17 |
| RF-30 | Relatório de perdas | O sistema deveria apresentar relatório consolidado de perdas com estimativa de impacto financeiro. | RN-18 |
| RF-31 | Definição de margem por canal | O sistema deve permitir definir a margem aplicada a cada canal de venda. | RN-19, RN-20 |
| RF-32 | Cálculo do preço sugerido | O sistema deve calcular o preço sugerido somando ao custo unitário a margem do canal. | RN-19, RN-59 |
| RF-33 | Bloqueio de preço abaixo do piso | O sistema deve impedir que o preço praticado fique abaixo do piso mínimo de segurança. | RN-21, RN-22, RN-39, RN-59 |
| RF-34 | Incorporação do frete ao preço | O sistema deve incorporar o frete ao preço, calculado por valor por quilômetro. | RN-23, RN-62 |
| RF-35 | Relatório de custo e preço praticado | O sistema deve apresentar relatório comparando custo e preço praticado, destacando margens negativas. | RN-24, RN-58 |
| RF-36 | Cadastro rápido de cliente | O sistema deve permitir cadastro rápido de cliente com nome e telefone, sem sair da tela de pedido. | RN-26 |
| RF-37 | Cadastro fiscal de cliente | O sistema deve permitir cadastro completo de cliente com dados fiscais de pessoa física ou jurídica. | RN-25, RN-30, RN-62 |
| RF-38 | Validação de CPF e CNPJ | O sistema deve validar CPF e CNPJ informados. | RN-25 |
| RF-39 | Busca de cliente | O sistema deve permitir localizar cliente por nome, telefone ou documento. | RN-26, RN-27 |
| RF-40 | Sinalização de cadastro fiscal incompleto | O sistema deve sinalizar cadastro fiscal incompleto quando o pedido exigir nota fiscal, permitindo completá-lo no próprio fluxo. | RN-25, RN-28 |
| RF-41 | Registro de pedido | O sistema deve permitir registrar pedido com cliente, canal de venda e itens compostos por espécie, recipiente e quantidade. | RN-04, RN-20, RN-31 |
| RF-42 | Verificação de disponibilidade do pedido | O sistema deve permitir verificar a disponibilidade de cada item do pedido contra o estoque. | RN-06, RN-13, RN-34, RN-67 |
| RF-43 | Registro de disponibilidade parcial | O sistema deve representar disponibilidade parcial, registrando a quantidade efetivamente disponível quando menor que a pedida. | RN-34, RN-67 |
| RF-44 | Aprovação de preço pela chefia | O sistema deve exigir aprovação da chefia sobre o preço antes do fechamento do pedido. | RN-21, RN-59 |
| RF-45 | Registro de exigência de nota fiscal | O sistema deve registrar se o pedido exige nota fiscal e, quando emitida em sistema externo, o número correspondente. | RN-25, RN-28, RN-29 |
| RF-46 | Geração da carga de separação | O sistema deve gerar a carga de separação a partir dos itens aprovados do pedido. | RN-37, RN-66 |
| RF-47 | Registro de separação física | O sistema deve permitir ao colaborador registrar a separação física item a item. | RN-37 |
| RF-48 | Histórico de estados do pedido | O sistema deve manter o histórico das mudanças de estado do pedido, com autor e momento. | RN-31, RN-46 |
| RF-49 | Notificação de transição do pedido | O sistema deve notificar o responsável pela etapa seguinte a cada transição relevante do pedido. | RN-31 |
| RF-50 | Agenda de entregas | O sistema deveria apresentar a agenda de entregas com as cargas prontas e seus destinos. | RN-37, RN-66 |
| RF-51 | Confirmação de entrega | O sistema deve permitir confirmar a entrega da carga. | RN-13, RN-31, RN-37, RN-70 |
| RF-52 | Cadastro de fornecedor | O sistema deve permitir cadastrar fornecedor com contato, localização e espécies que fornece. | RN-27, RN-38 |
| RF-53 | Registro de cotação | O sistema deve permitir registrar cotação dirigida a um ou mais fornecedores, com espécie, recipiente e quantidade por item. | RN-04, RN-38 |
| RF-54 | Comparação de propostas | O sistema deve permitir comparar as propostas recebidas e registrar a escolhida por item. | RN-38, RN-39 |
| RF-55 | Mapa de fornecedores | O sistema poderia apresentar os fornecedores em mapa, com a distância até o viveiro. | RN-23, RN-38 |
| RF-56 | Importação de extrato bancário | O sistema deve permitir importar o extrato bancário de cada conta, sem digitação de lançamentos. | RN-40, RN-70 |
| RF-57 | Classificação de lançamento | O sistema deve permitir classificar cada lançamento indicando centro de custo, categoria e contraparte, todos em lista fechada. | RN-27, RN-40, RN-41, RN-68, RN-69 |
| RF-58 | Classificação automática recorrente | O sistema deve aplicar automaticamente a classificação já atribuída anteriormente a lançamentos equivalentes. | RN-42 |
| RF-59 | Registro de data de competência | O sistema deve permitir informar data de competência distinta da data de movimentação. | RN-12 |
| RF-60 | Fechamento mensal | O sistema deve permitir fechar o mês após conferência do saldo calculado contra o saldo do extrato, travando o período. | RN-43 |
| RF-61 | Restrição de indicador a mês fechado | O sistema não deve apresentar indicador financeiro calculado sobre mês ainda não fechado. | RN-43 |
| RF-62 | Restrição de acesso ao financeiro | O sistema deve restringir a base bancária (extratos, lançamentos, compras, custos fixos e fechamento) aos perfis chefia e administrador. | RN-41, RN-44, RN-45 |
| RF-63 | Painel de indicadores por perfil | O sistema deve apresentar painel de indicadores com o conteúdo correspondente ao perfil do usuário. | RN-45, RN-47 |
| RF-64 | Comparação do indicador com período anterior e meta | O sistema deve apresentar cada indicador comparado ao período anterior e à meta definida. | RN-24, RN-43, RN-47 |
| RF-65 | Sinalização visual do indicador | O sistema deve sinalizar visualmente se o valor do indicador é favorável ou desfavorável. | RN-17, RN-47 |
| RF-66 | Registro de item genérico | O sistema deve permitir registrar item genérico (quantidade e recipiente sem espécie definida), atendido posteriormente por uma ou mais espécies. | RN-32 |
| RF-67 | Delimitação de espécies aceitas | O sistema deve permitir delimitar, no item genérico, a lista de espécies aceitas pelo cliente e a especificação de qualidade exigida. | RN-33 |
| RF-68 | Oferta de recipiente alternativo | O sistema deve permitir, na verificação de disponibilidade, oferecer recipiente diferente do solicitado, registrando qual. | RN-04, RN-35 |
| RF-69 | Cadastro de funcionário | O sistema deve permitir cadastrar funcionário com contato e vínculo (fixo ou diarista), inclusive quando ele não tem acesso ao sistema. | RN-27 |
| RF-70 | Catálogo de tipos de tarefa | O sistema deve permitir manter o catálogo de tipos de tarefa, com unidade de medida, tempo médio por unidade e quais tipos exigem espécie e recipiente. | RN-55 |
| RF-71 | Montagem da agenda da semana | O sistema deve permitir montar a agenda da semana atribuindo, por funcionário e por dia, o tipo de tarefa e o turno, manhã ou tarde. | RN-48 |
| RF-72 | Cópia da semana e tarefas recorrentes | O sistema deve permitir copiar a agenda da semana anterior e marcar tarefas como recorrentes, que passam a nascer preenchidas. | – |
| RF-73 | Situação da semana | O sistema deve controlar a situação da semana (rascunho, publicada e fechada) e impedir alteração depois do fechamento. | RN-50 |
| RF-74 | Conclusão de tarefa pelo colaborador | O sistema deve apresentar ao colaborador apenas as tarefas atribuídas a ele no dia, e permitir concluí-las informando somente a quantidade realizada. | RN-52 |
| RF-75 | Fechamento de tarefa não confirmada | O sistema deve assumir como realizada, ao fechar a semana, a tarefa planejada que não foi confirmada, registrando essa condição. | RN-51 |
| RF-76 | Apuração do custo de mão de obra | O sistema deve apurar o custo de mão de obra por espécie e período, a partir das horas da agenda e de um valor-hora médio do período, e incorporá-lo ao custo unitário. | RN-48, RN-53, RN-56 |

Fonte: Elaborado pelo autor (2026).

## Quadro 11 – Requisitos não funcionais e as regras de negócio relacionadas

| Código | Nome | Descrição | Código RN |
|---|---|---|---|
| RNF-01 | Limite de campos por tela | Formulários de campo devem apresentar no máximo cinco campos por tela. | RN-10, RN-16, RN-26, RN-37, RN-48, RN-52, RN-55 |
| RNF-02 | Lista fechada em campos de categoria | Campos de categoria devem oferecer lista fechada de opções, nunca entrada livre de texto. | RN-03, RN-16, RN-20, RN-27, RN-41, RN-52, RN-57 |
| RNF-03 | Alvo de toque adequado ao campo | Elementos acionáveis devem ter alvo de toque compatível com uso de dedos sujos e molhados. | – |
| RNF-04 | Confirmação visual de gravação | Toda ação de gravação deve produzir resposta visual imediata de confirmação. | – |
| RNF-05 | Operação sem conexão | O registro de dados em campo deve funcionar sem conexão, com envio automático ao restabelecer a rede. | RN-13, RN-16, RN-37 |
| RNF-06 | Concepção para celular | A interface deve ser concebida para uso em celular, e não adaptada a partir de tela de computador. | – |
| RNF-07 | Desempenho sob conexão lenta | O sistema deve permanecer utilizável sob conexão móvel lenta. | – |
| RNF-08 | Vocabulário da empresa na interface | A interface deve empregar o vocabulário da empresa, conforme o glossário, e não termos técnicos do sistema. | RN-02 |
| RNF-09 | Cifragem de senhas | Senhas devem ser armazenadas de forma cifrada, por técnica que impeça sua recuperação. | – |
| RNF-10 | Proteção do identificador de sessão | Identificadores de sessão devem ser armazenados apenas em formato protegido. | – |
| RNF-11 | Marcações de segurança em cookies | Cookies de sessão devem receber as marcações de segurança que restringem seu uso a comunicação cifrada e impedem leitura por código do navegador. | – |
| RNF-12 | Controle de acesso no servidor | As regras de acesso aos dados devem ser executadas no servidor, nunca no navegador. | RN-44, RN-45, RN-53 |
| RNF-13 | Cifragem em trânsito | Toda comunicação entre cliente e servidor deve ser cifrada em trânsito. | – |
| RNF-14 | Backup e recuperação | O sistema deve dispor de rotina de backup e procedimento de recuperação com objetivos declarados. | – |
| RNF-15 | Idioma de código e documentação | Arquivos, identificadores e estruturas de dados devem ser nomeados em inglês, e a documentação em português. | – |
| RNF-16 | Ramificação por funcionalidade | Cada funcionalidade deve ser desenvolvida em ramificação própria e integrada por solicitação de incorporação. | – |
| RNF-17 | Proteção da versão principal | Alteração direta na versão principal deve ser impedida por controle automático. | – |
| RNF-18 | Padrão de mensagem de alteração | Mensagens de alteração devem seguir padrão fixo. | – |
| RNF-19 | Versionamento do banco de dados | Alterações na estrutura do banco devem ser versionadas em arquivos aplicados de forma controlada, preservando compatibilidade retroativa. | – |
| RNF-20 | Testes automatizados obrigatórios | Toda alteração de código deve incluir testes automatizados cobrindo utilitários, regras de negócio e validações. | – |
| RNF-21 | Verificação automática antes do envio | Verificação automática executada antes de cada alteração deve bloquear o envio em caso de arquivo sensível, falha de teste ou desvio de padronização. | – |
| RNF-22 | Não versionamento de credenciais | Credenciais, chaves e dados sensíveis não devem ser versionados. | – |
| RNF-23 | Conformidade com a proteção de dados pessoais | O tratamento de dados pessoais deve observar a Lei nº 13.709/2018, com finalidade, base legal e prazo de retenção declarados para cada dado coletado. | RN-30 |
| RNF-24 | Dados cadastrais suficientes para nota fiscal | Os dados cadastrais de cliente devem comportar o conjunto exigido para emissão de nota fiscal no sistema externo em uso. | RN-25, RN-28, RN-62 |
| RNF-25 | Disponibilidade do nome científico | O nome científico da espécie deve estar disponível para atender exigências de projetos de compensação ambiental. | RN-02, RN-29 |
| RNF-26 | Acesso por navegador de celular | O sistema deve operar em navegador de celular de uso corrente pela equipe, sem exigir instalação a partir de loja de aplicativos. | – |

Fonte: Elaborado pelo autor (2026).

## Quadro 12 – Restrições do projeto e os requisitos não funcionais que originam

| Código | Descrição | Origem | Requisitos originados |
|---|---|---|---|
| RE-1 | Usuários sem formação técnica | Perfil da equipe | RNF-01, RNF-02, RNF-08 |
| RE-2 | Celular como dispositivo principal | Contexto de campo | RNF-06, RNF-26 |
| RE-3 | Conexão instável no viveiro | Ambiente físico | RNF-05, RNF-07 |
| RE-4 | Uso com as mãos sujas, sob sol e chuva | Ambiente físico | RNF-03, RNF-04 |
| RE-5 | Orçamento de microempresa | Porte da organização | RNF-14, RNF-26 |
| RE-6 | Prazo até novembro de 2026 | Calendário acadêmico | Afeta o escopo, não os requisitos |
| RE-7 | Base financeira mistura gasto de negócio e gasto pessoal | Histórico da empresa | Origina RN-41 e RN-44 |
| RE-8 | Dados pessoais sujeitos à legislação de proteção de dados | Legal | Origina RN-30 |

Fonte: Elaborado pelo autor (2026).

## Quadro 13 – Síntese da origem dos requisitos do sistema

| Origem | Requisitos funcionais: Qtd. | Requisitos funcionais: % | Requisitos não funcionais: Qtd. | Requisitos não funcionais: % |
|---|---|---|---|---|
| Regra de negócio | 72 | 94,7 | 3 | 11,5 |
| Restrição do ambiente (RE-1 a RE-5) | – | – | 10 | 38,5 |
| Política do projeto | 4 | 5,3 | 13 | 50,0 |
| Total | 76 | 100,0 | 26 | 100,0 |

Fonte: Elaborado pelo autor (2026).

---

## Manutenção

- **A ordem é sempre `B3`/`B2` primeiro, este arquivo depois.** Editar um quadro sem editar o
  artefato produz exatamente a divergência que motivou esta revisão.
- **Identificador não se reutiliza**: nem de RN, nem de RF, nem de RNF (`B3` §8, `B2` §1).
- Os totais do Quadro 9 e do Quadro 13 são derivados: ao acrescentar regra ou requisito,
  recontar antes de publicar. `B3` §3.10 e `B2` §4 são as contagens de referência.
- Os **nomes** dos requisitos (coluna *Nome* dos Quadros 10 e 11) só existem aqui, `B2` não
  tem coluna de nome. Nome novo entra junto com o requisito. É por isso que o gerador do `.docx`
  lê este arquivo, e não `B2` e `B3` diretamente.
- O **Quadro 13** tem cabeçalho de dois níveis no Word (*Origem* mesclada na vertical, *Requisitos
  funcionais* e *não funcionais* mescladas na horizontal). Aqui ele aparece achatado em cinco
  colunas, porque markdown não mescla célula, e quem remonta a mescla é
  [`scripts/build-quadros-docx.mjs`](../../../scripts/build-quadros-docx.mjs).
