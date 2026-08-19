# B2 — Especificação de Requisitos

> **Artefato:** Especificação de Requisitos de Software (ERS) · **Bloco:** B — Engenharia de requisitos
> **Destino no TCC:** Capítulo 4, seção 4.2 — Requisitos do sistema
> **Fundamentação:** Sommerville (2011) define requisitos funcionais como as funcionalidades do
> sistema e o comportamento esperado diante de determinadas entradas, e requisitos não funcionais
> como as diretrizes que regulam o sistema como um todo, classificando-os em **requisitos de
> produto**, **organizacionais** e **externos** — classificação adotada integralmente neste
> documento. A priorização por negociação entre *stakeholders* segue Pressman e Maxim (2016).

---

## 1. Como ler este documento

Todo requisito tem identificador estável. Uma vez atribuído, o identificador **não é reutilizado**,
mesmo que o requisito seja removido — a matriz de rastreabilidade
([`B5`](B5-matriz-rastreabilidade.md)) depende dessa estabilidade.

Os termos empregados são os do [glossário](../A-fundacao/A2-glossario-dominio.md). Onde o texto diz
"espécie", "recipiente", "canal de venda" ou "perfil", entende-se a definição de lá.

### Legenda — origem

| Código | Origem do requisito |
|---|---|
| **OP** | Observação participante das rotinas de produção e venda |
| **EN** | Entrevista com chefia e gerência |
| **AD** | Análise documental — notas de compra, registros de custos fixos, planilhas de notas fiscais, extratos bancários |
| **DOM** | Estudo do domínio de produção de mudas nativas |
| **LEG** | Exigência legal, fiscal ou regulatória |
| **ORG** | Política ou convenção adotada pelo projeto |

### Legenda — prioridade (MoSCoW)

| Código | Significado |
|---|---|
| **D** | *Deve ter* — sem ele o sistema não cumpre seu propósito |
| **DV** | *Deveria ter* — importante, mas o sistema opera sem ele |
| **P** | *Poderia ter* — agrega valor se houver folga |
| **N** | *Não agora* — reconhecido e deliberadamente adiado |

---

## 2. Requisitos funcionais

Os requisitos estão agrupados pelos **quatro módulos** do sistema — Cadastros, Produção,
Comercial e Financeiro —, com Acesso à frente por ser transversal aos quatro. É o mesmo
agrupamento adotado em [`C1`](../C-modelagem/C1-diagrama-casos-de-uso.md),
[`C6`](../C-modelagem/C6-modelo-entidade-relacionamento.md),
[`D1`](../D-arquitetura/D1-arquitetura-c4.md) e [`D4`](../D-arquitetura/D4-matriz-rbac.md), e
descrito em [`docs/rotinas/00-mapa-de-rotinas.md`](../../rotinas/00-mapa-de-rotinas.md).

O identificador de cada requisito é anterior a esse agrupamento e **não foi renumerado** — a
ordem numérica não acompanha a ordem das seções, e isso é deliberado: renumerar quebraria a
rastreabilidade da [`B5`](B5-matriz-rastreabilidade.md).

### 2.1 Acesso — transversal aos quatro módulos

| ID | Requisito | Ator | Prior. | Origem | Verificação |
|---|---|---|---|---|---|
| **RF-01** | O sistema deve autenticar o usuário por identificador e senha antes de conceder qualquer acesso | Todos | D | ORG | Acesso a qualquer tela sem sessão redireciona para autenticação |
| **RF-02** | O sistema deve exigir troca de senha no primeiro acesso do usuário | Todos | D | ORG | Usuário recém-criado é conduzido à troca antes de qualquer outra tela |
| **RF-03** | O sistema deve permitir ao usuário encerrar sua sessão | Todos | D | ORG | Após encerrar, o acesso anterior deixa de ser válido |
| **RF-04** | O sistema deve registrar cada tentativa de autenticação com data, origem e dispositivo | — | DV | ORG | Consulta ao registro exibe as tentativas, bem e malsucedidas |
| **RF-05** | O sistema deve permitir ao administrador criar usuários e atribuir perfil | Administrador | D | ORG | Usuário criado acessa apenas o que seu perfil permite |
| **RF-06** | O sistema deve verificar a permissão do perfil a cada operação, e não apenas ocultar elementos da interface | — | D | ORG | Operação solicitada por perfil sem permissão é recusada mesmo quando acionada diretamente |
| **RF-07** | O sistema deveria permitir ao usuário visualizar e encerrar suas sessões ativas | Todos | DV | ORG | Sessão encerrada à distância deixa de ter acesso |

### 2.2 Módulo 1 · Cadastros

O que é estável e se repete, e alimenta os outros três módulos sem consumir nada.
**Regra de corte:** é cadastro se, ao apagá-lo, um movimento passado ficar sem sentido — o
que exclui custo fixo (valor que muda todo mês, apurado no Financeiro) e coleta de sementes
(atividade de campo, da Produção).

#### 2.2.1 Catálogo de produção — espécie, recipiente, insumo

| ID | Requisito | Ator | Prior. | Origem | Verificação |
|---|---|---|---|---|---|
| **RF-08** | O sistema deve permitir cadastrar espécie com nome científico, nomes populares, características, tempo de germinação, tempo de produção e fotografia | Chefia | D | EN, DOM | Espécie cadastrada aparece nas demais telas do sistema |
| **RF-09** | O sistema deve localizar a espécie por qualquer um de seus nomes populares ou pelo nome científico | Todos | D | OP | Busca por nome regional retorna a espécie correspondente |
| **RF-10** | O sistema deve permitir cadastrar recipientes com volume e consumo de substrato por unidade | Chefia | D | EN | Recipiente cadastrado fica disponível para associação a espécies |
| **RF-11** | O sistema deve permitir cadastrar insumos com unidade de medida e custo, preservando o histórico de preços | Chefia | D | AD | Alteração de preço não apaga o valor anterior |

#### 2.2.2 Pessoas — cliente, fornecedor, funcionário

Cliente, fornecedor e funcionário são **papéis de uma mesma identidade** (`cadastro.parties`):
quem vende muda e às vezes compra é um cadastro só. Os requisitos abaixo tratam do cadastro;
o que se faz com a pessoa depois é do Comercial (RF-53 a RF-55) ou do Financeiro (RF-57).

**Funcionário é vínculo, não acesso.** RF-69 cadastra quem trabalha no viveiro, tenha ou não
usuário — o diarista que aparece duas semanas por ano precisa existir na agenda e no custo sem
nunca abrir o sistema. Quem tem login é assunto de RF-05, no Acesso.

| ID | Requisito | Ator | Prior. | Origem | Verificação |
|---|---|---|---|---|---|
| **RF-36** | O sistema deve permitir cadastro rápido de cliente com nome e telefone, sem sair da tela de pedido | Chefia | D | OP | Pedido conclui-se com cliente novo sem interromper o fluxo |
| **RF-37** | O sistema deve permitir cadastro completo de cliente com dados fiscais de pessoa física ou jurídica | Chefia | D | LEG, AD | Cadastro completo comporta os dados exigidos para emissão de nota |
| **RF-38** | O sistema deve validar CPF e CNPJ informados | — | D | LEG | Documento inválido é recusado no momento da digitação |
| **RF-39** | O sistema deve permitir localizar cliente por nome, telefone ou documento | Chefia | D | OP | Busca retorna o cliente por qualquer dos três |
| **RF-40** | O sistema deve sinalizar cadastro fiscal incompleto quando o pedido exigir nota fiscal, permitindo completá-lo no próprio fluxo | Chefia | D | LEG, OP | Pedido com nota exigida e cliente incompleto solicita a complementação |
| **RF-52** | O sistema deve permitir cadastrar fornecedor com contato, localização e espécies que fornece | Chefia | DV | EN | Fornecedor cadastrado aparece na seleção de cotação |
| **RF-69** | O sistema deve permitir cadastrar funcionário com contato e vínculo — fixo ou diarista —, inclusive quando ele não tem acesso ao sistema | Chefia | D | EN | Funcionário sem usuário aparece na agenda de pessoal e no cadastro |
| **RF-70** | O sistema deve permitir manter o catálogo de tipos de tarefa, com unidade de medida, tempo médio por unidade e quais tipos exigem espécie e recipiente | Gerência | D | OP | Tipo cadastrado fica disponível na agenda e leva consigo as exigências declaradas |

### 2.3 Módulo 2 · Produção

Registro de atividade de campo, e o estoque que dele deriva. É o módulo do colaborador — daí
a severidade dos requisitos de usabilidade (RNF-01 a RNF-05) sobre estas telas.

#### 2.3.1 Registro de campo

| ID | Requisito | Ator | Prior. | Origem | Verificação |
|---|---|---|---|---|---|
| **RF-13** | O sistema deve permitir registrar coleta de sementes com região, distância, combustível, horas e quantidade obtida | Chefia | DV | EN | Custo por semente é derivado do registro |
| **RF-14** | O sistema deve permitir registrar, em campo, o consumo de insumo indicando insumo, espécie, recipiente e quantidade | Colaborador | D | OP | Registro feito no celular aparece no custeio |
| **RF-19** | O sistema deve permitir registrar atividade de produção — semeadura, repicagem, irrigação, adubação — com espécie, recipiente e quantidade | Colaborador | D | OP | Atividade registrada aparece no acompanhamento |
| **RF-20** | O sistema deve permitir à gerência atribuir atividades de produção a colaboradores | Gerência | DV | OP | Colaborador vê as atividades atribuídas a ele |
| **RF-21** | O sistema deveria apresentar o acompanhamento do ciclo produtivo por espécie, com previsão de disponibilidade a partir do tempo de produção | Chefia, Gerência | DV | EN | Previsão exibida corresponde à data de semeadura somada ao tempo de produção |
| **RF-71** | O sistema deve permitir montar a agenda da semana atribuindo, por funcionário e por dia, o tipo de tarefa e o turno — manhã ou tarde | Gerência | D | EN, OP | Semana montada exibe, por pessoa e por dia, as tarefas e os turnos atribuídos |
| **RF-72** | O sistema deve permitir copiar a agenda da semana anterior e marcar tarefas como recorrentes, que passam a nascer preenchidas | Gerência | D | OP | Semana copiada reproduz a anterior; tarefa recorrente aparece sem ser lançada de novo |
| **RF-73** | O sistema deve controlar a situação da semana — rascunho, publicada e fechada — e impedir alteração depois do fechamento | Gerência | D | ORG | Semana fechada recusa alteração de atribuição |
| **RF-74** | O sistema deve apresentar ao colaborador apenas as tarefas atribuídas a ele no dia, e permitir concluí-las informando somente a quantidade realizada | Colaborador | D | OP | Colaborador vê as próprias tarefas e nenhuma outra; a conclusão pede um único número |
| **RF-75** | O sistema deve assumir como realizada, ao fechar a semana, a tarefa planejada que não foi confirmada, registrando essa condição | — | DV | ORG | Tarefa não confirmada entra no realizado com a marca correspondente |

#### 2.3.2 Estoque

Estoque não é tabela digitada: é **produção − perdas − vendas**, com a contagem física
servindo de correção. Por ser derivado da produção, mora aqui e não nos Cadastros.

| ID | Requisito | Ator | Prior. | Origem | Verificação |
|---|---|---|---|---|---|
| **RF-22** | O sistema deve apresentar a quantidade disponível por espécie e recipiente | Chefia, Gerência | D | OP | Quantidade reflete produção registrada menos perdas e vendas |
| **RF-23** | O sistema deve permitir registrar contagem física de estoque, com a quantidade contada substituindo a calculada | Gerência | D | OP | Após a contagem, a quantidade exibida é a contada |
| **RF-24** | O sistema deve sinalizar espécies zeradas ou abaixo da quantidade mínima definida | Gerência | DV | EN | Espécie abaixo do mínimo aparece destacada |
| **RF-25** | O sistema deveria manter o histórico de contagens por espécie | Gerência | P | OP | Consulta exibe a data da última contagem de cada espécie |

#### 2.3.3 Perdas

| ID | Requisito | Ator | Prior. | Origem | Verificação |
|---|---|---|---|---|---|
| **RF-26** | O sistema deve permitir registrar perda com espécie, recipiente, quantidade e causa selecionada em lista fechada | Colaborador | D | OP | Registro conclui-se em campo, sem campo de texto livre para a causa |
| **RF-27** | O sistema deve listar as perdas registradas com filtro por período | Gerência | D | EN | Filtro por período retorna apenas os registros do intervalo |
| **RF-28** | O sistema deve calcular a taxa de mortalidade por espécie e período | — | D | EN | Taxa corresponde a perdas divididas por produção do período |
| **RF-29** | O sistema deve emitir alerta para espécie cuja mortalidade ultrapasse 20% | Gerência | D | EN | Espécie acima do limite gera alerta visível |
| **RF-30** | O sistema deveria apresentar relatório consolidado de perdas com estimativa de impacto financeiro | Chefia | DV | EN | Impacto estimado usa o custo unitário da espécie |

### 2.4 Módulo 3 · Comercial

Tudo aqui é movimento: acontece uma vez e vira histórico.

#### 2.4.1 Pedidos

| ID | Requisito | Ator | Prior. | Origem | Verificação |
|---|---|---|---|---|---|
| **RF-41** | O sistema deve permitir registrar pedido com cliente, canal de venda e itens compostos por espécie, recipiente e quantidade | Chefia | D | OP | Pedido registrado aparece na lista de pedidos |
| **RF-42** | O sistema deve permitir verificar a disponibilidade de cada item do pedido contra o estoque | Gerência | D | OP | Verificação indica, por item, se há quantidade suficiente |
| **RF-43** | O sistema deve representar disponibilidade parcial, registrando a quantidade efetivamente disponível quando menor que a pedida | Gerência | D | OP | Item parcialmente disponível não é tratado como indisponível |
| **RF-44** | O sistema deve exigir aprovação da chefia sobre o preço antes do fechamento do pedido | Chefia | D | EN | Pedido não avança sem a aprovação |
| **RF-45** | O sistema deve registrar se o pedido exige nota fiscal e, quando emitida em sistema externo, o número correspondente | Chefia | D | LEG | Pedido exibe a exigência e o número informado |
| **RF-46** | O sistema deve gerar a carga de separação a partir dos itens aprovados do pedido | Gerência | D | OP | Carga contém os itens e quantidades aprovados |
| **RF-47** | O sistema deve permitir ao colaborador registrar a separação física item a item | Colaborador | D | OP | Separação concluída marca a carga como separada |
| **RF-48** | O sistema deve manter o histórico das mudanças de estado do pedido, com autor e momento | — | DV | ORG | Consulta exibe a sequência de estados percorrida |
| **RF-49** | O sistema deve notificar o responsável pela etapa seguinte a cada transição relevante do pedido | Todos | DV | OP | Transição gera notificação ao perfil responsável |
| **RF-66** | O sistema deve permitir registrar **item genérico** — quantidade e recipiente sem espécie definida —, atendido posteriormente por uma ou mais espécies | Chefia | D | OP | Pedido de "500 mudas nativas" é registrado sem exigir a escolha das espécies |
| **RF-67** | O sistema deve permitir delimitar, no item genérico, a lista de espécies aceitas pelo cliente e a especificação de qualidade exigida | Chefia | D | OP, EN | Item genérico com lista definida não admite espécie fora dela |
| **RF-68** | O sistema deve permitir, na verificação de disponibilidade, oferecer recipiente diferente do solicitado, registrando qual | Gerência | DV | OP | Item verificado registra a quantidade disponível e o recipiente efetivamente ofertado |

#### 2.4.2 Cotação com fornecedores

Complementa a produção própria quando falta muda. O **cadastro** do fornecedor é do módulo 1
(RF-52); aqui está o que se faz com ele.

| ID | Requisito | Ator | Prior. | Origem | Verificação |
|---|---|---|---|---|---|
| **RF-53** | O sistema deve permitir registrar cotação dirigida a um ou mais fornecedores, com espécie, recipiente e quantidade por item | Chefia | DV | EN | Cotação registrada permite lançar as respostas recebidas |
| **RF-54** | O sistema deve permitir comparar as propostas recebidas e registrar a escolhida por item | Chefia | DV | EN | Comparação exibe as propostas lado a lado e registra a escolha |
| **RF-55** | O sistema poderia apresentar os fornecedores em mapa, com a distância até o viveiro | Chefia | P | EN | Fornecedor com endereço aparece posicionado no mapa |

#### 2.4.3 Entregas

Cada carga é uma viagem, com calendário próprio — entrega não é o último estado do pedido.

| ID | Requisito | Ator | Prior. | Origem | Verificação |
|---|---|---|---|---|---|
| **RF-50** | O sistema deveria apresentar a agenda de entregas com as cargas prontas e seus destinos | Chefia | DV | OP | Agenda lista as cargas separadas e não entregues |
| **RF-51** | O sistema deve permitir confirmar a entrega da carga | Chefia | D | OP | Carga confirmada sai da agenda e o pedido é concluído |

### 2.5 Módulo 4 · Financeiro — módulo restrito

Custo e preço são dinheiro: ficam no módulo do dinheiro, junto do extrato que os alimenta.

**A restrição é por recurso, não pela porta do módulo.** A base bancária — extrato,
lançamento, compra, custo fixo, fechamento — é exclusiva de chefia e administrador (RF-62). O
que é **derivado** dela e não a expõe — custo unitário, margem, preço e os indicadores
operacionais — permanece em leitura para a gerência, que precisa desses números para operar.
A regra completa está em [`D4 §3.2`](../D-arquitetura/D4-matriz-rbac.md).

#### 2.5.1 Custos e custeio

| ID | Requisito | Ator | Prior. | Origem | Verificação |
|---|---|---|---|---|---|
| **RF-12** | O sistema deve permitir registrar custos fixos mensais por categoria e mês de referência | Chefia | D | AD | Custos do mês somam o total informado |
| **RF-15** | O sistema deve calcular o custo variável de cada combinação de espécie e recipiente, somando substrato, semente, recipiente, demais insumos e mão de obra | — | D | EN, AD | Valor calculado confere com apuração manual independente |
| **RF-16** | O sistema deve ratear o custo fixo mensal sobre a produção do período | — | D | EN | Soma dos rateios do período iguala o custo fixo do período |
| **RF-17** | O sistema deve apresentar o custo unitário por espécie e recipiente | Chefia, Gerência | D | EN | Consulta exibe o custo de cada combinação cadastrada |
| **RF-18** | O sistema deve recalcular o custo unitário quando houver alteração em insumo, custo fixo ou consumo | — | D | EN | Alteração de preço de insumo altera o custo das espécies que o utilizam |
| **RF-76** | O sistema deve apurar o custo de mão de obra por espécie e período, a partir das horas da agenda e de um valor-hora médio do período, e incorporá-lo ao custo unitário | — | D | EN, AD | Custo unitário de espécie com tarefas registradas na semana difere do custo sem elas |

#### 2.5.2 Precificação

| ID | Requisito | Ator | Prior. | Origem | Verificação |
|---|---|---|---|---|---|
| **RF-31** | O sistema deve permitir definir a margem aplicada a cada canal de venda | Chefia | D | EN | Margem definida é aplicada no cálculo do canal correspondente |
| **RF-32** | O sistema deve calcular o preço sugerido somando ao custo unitário a margem do canal | — | D | EN | Preço sugerido confere com o cálculo manual |
| **RF-33** | O sistema deve impedir que o preço praticado fique abaixo do piso mínimo de segurança | Chefia | D | EN | Tentativa de registrar preço abaixo do piso é recusada com aviso |
| **RF-34** | O sistema deve incorporar o frete ao preço, calculado por valor por quilômetro | — | DV | EN | Preço de pedido com entrega inclui o frete calculado |
| **RF-35** | O sistema deve apresentar relatório comparando custo e preço praticado, destacando margens negativas | Chefia | D | EN | Relatório destaca ao menos um caso real de margem negativa |

#### 2.5.3 Extratos, classificação e fechamento

| ID | Requisito | Ator | Prior. | Origem | Verificação |
|---|---|---|---|---|---|
| **RF-56** | O sistema deve permitir importar o extrato bancário de cada conta, sem digitação de lançamentos | Chefia | D | AD | Arquivo importado gera os lançamentos correspondentes |
| **RF-57** | O sistema deve permitir classificar cada lançamento indicando centro de custo, categoria e contraparte, todos em lista fechada | Chefia | D | AD | Lançamento classificado sai da fila pendente |
| **RF-58** | O sistema deve aplicar automaticamente a classificação já atribuída anteriormente a lançamentos equivalentes | — | D | AD | Lançamento recorrente já reconhecido chega classificado |
| **RF-59** | O sistema deve permitir informar data de competência distinta da data de movimentação | Chefia | D | AD | Gasto pago em abril e competente a fevereiro compõe o custo de fevereiro |
| **RF-60** | O sistema deve permitir fechar o mês após conferência do saldo calculado contra o saldo do extrato, travando o período | Chefia | D | AD | Mês fechado não aceita alteração de lançamento |
| **RF-61** | O sistema não deve apresentar indicador financeiro calculado sobre mês ainda não fechado | — | D | AD | Mês aberto exibe indicação de indisponibilidade, não um número |
| **RF-62** | O sistema deve restringir a base bancária — extratos, lançamentos, compras, custos fixos e fechamento — aos perfis chefia e administrador | — | D | EN | Gerência e colaborador não acessam extrato, lançamento, compra, custo fixo nem fechamento, nem em leitura |

#### 2.5.4 Indicadores de desempenho

Os indicadores estão especificados um a um em
[`G2 — Fichas de indicadores`](../G-gestao/G2-fichas-de-indicadores.md), que define fórmula,
fonte, janela, meta, faixas e **o painel de cada perfil**.

| ID | Requisito | Ator | Prior. | Origem | Verificação |
|---|---|---|---|---|---|
| **RF-63** | O sistema deve apresentar painel de indicadores com o conteúdo correspondente ao perfil do usuário | Chefia, Gerência | D | EN | Perfis distintos veem conjuntos distintos de indicadores |
| **RF-64** | O sistema deve apresentar cada indicador comparado ao período anterior e à meta definida | Chefia | D | EN | Indicador exibe valor, comparação e meta |
| **RF-65** | O sistema deve sinalizar visualmente se o valor do indicador é favorável ou desfavorável | Chefia, Gerência | D | EN | Sinalização acompanha a faixa de desempenho definida para o indicador |

---

## 3. Requisitos não funcionais

Classificados nos três grupos de Sommerville (2011).

### 3.1 Requisitos de produto

Definem o comportamento esperado do sistema em termos de usabilidade, desempenho, disponibilidade e
proteção. Nesta aplicação, os requisitos de usabilidade **não são preferências de projeto** —
decorrem diretamente das restrições de campo registradas em
[`A1`](../A-fundacao/A1-documento-de-visao.md), e um sistema que os viole é inutilizável pela equipe
a que se destina.

| ID | Requisito | Origem | Verificação |
|---|---|---|---|
| **RNF-01** | Formulários de campo devem apresentar no máximo cinco campos por tela | RE-1 | Contagem de campos em cada formulário destinado ao colaborador |
| **RNF-02** | Campos de categoria devem oferecer lista fechada de opções, nunca entrada livre de texto | RE-1 | Inspeção dos formulários; nenhuma categoria admite texto digitado |
| **RNF-03** | Elementos acionáveis devem ter alvo de toque compatível com uso de dedos sujos e molhados | RE-4 | Medição do alvo de toque contra o mínimo definido no projeto de interface |
| **RNF-04** | Toda ação de gravação deve produzir resposta visual imediata de confirmação | RE-4 | Registro em campo exibe confirmação sem exigir conferência posterior |
| **RNF-05** | O registro de dados em campo deve funcionar sem conexão, com envio automático ao restabelecer a rede | RE-3 | Registro feito em modo avião aparece no sistema após reconexão |
| **RNF-06** | A interface deve ser concebida para uso em celular, e não adaptada a partir de tela de computador | RE-2 | Todas as rotinas de campo executáveis em tela de celular sem rolagem horizontal |
| **RNF-07** | O sistema deve permanecer utilizável sob conexão móvel lenta | RE-3 | Execução das rotinas de campo sob rede limitada |
| **RNF-08** | A interface deve empregar o vocabulário da empresa, conforme o glossário, e não termos técnicos do sistema | RE-1 | Revisão dos rótulos contra [`A2`](../A-fundacao/A2-glossario-dominio.md) |
| **RNF-09** | Senhas devem ser armazenadas de forma cifrada, por técnica que impeça sua recuperação | ORG | Inspeção do armazenamento; nenhuma senha legível |
| **RNF-10** | Identificadores de sessão devem ser armazenados apenas em formato protegido | ORG | Inspeção do armazenamento de sessões |
| **RNF-11** | Cookies de sessão devem receber as marcações de segurança que restringem seu uso a comunicação cifrada e impedem leitura por código do navegador | ORG | Inspeção dos atributos do cookie |
| **RNF-12** | As regras de acesso aos dados devem ser executadas no servidor, nunca no navegador | ORG | Nenhuma credencial ou regra de acesso presente no código entregue ao cliente |
| **RNF-13** | Toda comunicação entre cliente e servidor deve ser cifrada em trânsito | ORG | Acesso por canal não cifrado é recusado |
| **RNF-14** | O sistema deve dispor de rotina de backup e procedimento de recuperação com objetivos declarados | RE-5 | Ver [`E6`](../E-qualidade/E6-plano-backup-recuperacao.md) |

### 3.2 Requisitos organizacionais

Derivados das políticas e convenções adotadas pelo projeto.

| ID | Requisito | Origem | Verificação |
|---|---|---|---|
| **RNF-15** | Arquivos, identificadores e estruturas de dados devem ser nomeados em inglês; a documentação, em português | ORG | Revisão de nomenclatura |
| **RNF-16** | Cada funcionalidade deve ser desenvolvida em ramificação própria e integrada por solicitação de incorporação | ORG | Histórico do controle de versão |
| **RNF-17** | Alteração direta na versão principal deve ser impedida por controle automático | ORG | Tentativa de alteração direta é bloqueada |
| **RNF-18** | Mensagens de alteração devem seguir padrão fixo | ORG | Revisão do histórico |
| **RNF-19** | Alterações na estrutura do banco devem ser versionadas em arquivos aplicados de forma controlada, preservando compatibilidade retroativa | ORG | Cada alteração de esquema corresponde a um arquivo versionado |
| **RNF-20** | Toda alteração de código deve incluir testes automatizados cobrindo utilitários, regras de negócio e validações | ORG | Execução da suíte de testes |
| **RNF-21** | Verificação automática executada antes de cada alteração deve bloquear o envio em caso de arquivo sensível, falha de teste ou desvio de padronização | ORG | Tentativa de envio com falha é bloqueada |
| **RNF-22** | Credenciais, chaves e dados sensíveis não devem ser versionados | ORG | Varredura do histórico |

### 3.3 Requisitos externos

Impostos por fatores legais, regulatórios ou pelo ambiente em que o sistema opera.

| ID | Requisito | Origem | Verificação |
|---|---|---|---|
| **RNF-23** | O tratamento de dados pessoais deve observar a Lei nº 13.709/2018, com finalidade, base legal e prazo de retenção declarados para cada dado coletado | LEG | Ver [`E5`](../E-qualidade/E5-mapeamento-lgpd.md) |
| **RNF-24** | Os dados cadastrais de cliente devem comportar o conjunto exigido para emissão de nota fiscal no sistema externo em uso | LEG | Conferência contra os campos exigidos pelo emissor |
| **RNF-25** | O nome científico da espécie deve estar disponível para atender exigências de projetos de compensação ambiental | LEG, DOM | Documentos gerados exibem o nome científico |
| **RNF-26** | O sistema deve operar em navegador de celular de uso corrente pela equipe, sem exigir instalação a partir de loja de aplicativos | RE-2, RE-5 | Execução no ambiente-alvo |

---

## 4. Distribuição por prioridade

| Prioridade | Funcionais | Não funcionais | Total |
|---:|---:|---:|---:|
| **D** — Deve ter | 58 | 26 | 84 |
| **DV** — Deveria ter | 16 | — | 16 |
| **P** — Poderia ter | 2 | — | 2 |
| **N** — Não agora | — | — | — |
| **Total** | **76** | **26** | **102** |

Nenhum requisito não funcional foi classificado abaixo de *deve ter*: todos decorrem de restrição do
ambiente, de política do projeto ou de exigência legal — nenhum é preferência negociável.

Os itens classificados como *não agora* estão registrados como **fora de escopo** em
[`A1`, seção 7](../A-fundacao/A1-documento-de-visao.md), e não como requisitos adiados, para que a
delimitação fique explícita em vez de implícita numa tabela de prioridades.

---

## 5. Conflitos entre requisitos e sua resolução

Sommerville (2011) observa que *stakeholders* distintos produzem requisitos conflitantes, resolvidos
por negociação. Três conflitos se manifestaram e foram resolvidos como segue. O terceiro foi **reaberto e
resolvido de novo** em 10/08/2026, ao desenhar a agenda de pessoal: a tensão continuou a mesma,
a solução ficou melhor.

| Conflito | Partes | Resolução |
|---|---|---|
| **Proteção × produtividade** — exigir autenticação e troca de senha (RF-01, RF-02) contraria o uso rápido em campo | Chefia × colaborador | Sessão de duração longa no dispositivo do colaborador. A autenticação ocorre raramente; o registro de perda ou produção não a exige a cada uso. Sommerville trata essa tensão explicitamente: proteção adicional custa produtividade, e o equilíbrio é decisão de projeto. |
| **Riqueza do dado × velocidade do registro** — registrar mais atributos por perda melhora a análise (RF-28, RF-30) e contraria o limite de cinco campos (RNF-01) | Gerência × colaborador | Prevalece o limite. Dado que não é registrado por ser trabalhoso demais não existe — o registro incompleto e feito supera o completo e omitido. |
| **Precisão do custo × esforço de apuração** — apurar mão de obra por espécie exigiria apontamento de horas individual | Chefia × colaborador | A agenda da semana registra o trabalho em **turnos** (manhã e tarde), não em horas marcadas, e um turno vale quatro horas por convenção (RF-71). O custo usa um **valor-hora médio da equipe** — folha do mês dividida pelas horas do mês (RF-76) —, e não o salário de cada um. Produz custo real sem controle de ponto e sem expor remuneração individual: o que varia entre espécies é o tempo gasto, não quem o gastou. |

---

## 6. Rastreabilidade

Cada requisito funcional é vinculado a caso de uso, entidade, regra de acesso e caso de teste na
matriz [`B5`](B5-matriz-rastreabilidade.md). Requisito sem vínculo é indício de especificação sem
implementação prevista — ou de implementação sem requisito que a justifique.
