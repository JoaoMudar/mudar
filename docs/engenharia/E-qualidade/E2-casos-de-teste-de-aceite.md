# E2: Casos de teste de aceite

> **Artefato:** Casos de teste de aceite · **Bloco:** E, Qualidade, riscos e segurança
> **Destino no TCC:** Capítulo 4, seção 4.8 (amostra) e Apêndice (integral)
> **Fundamentação:** Sommerville (2011) define o teste de aceite como aquele conduzido com dados
> reais do cliente, destinado a verificar se o sistema atende às suas necessidades, distinto do
> teste de desenvolvimento, que verifica se o sistema faz o que o programador pretendeu.

---

## 1. Níveis de teste e critério de aprovação

Como o plano de testes completo não integra o conjunto de artefatos produzidos, esta seção fixa o
mínimo necessário para que os casos abaixo se sustentem.

| Nível | O que verifica | Quem executa | Automatizado |
|---|---|---|---|
| **Unitário** | Funções utilitárias, regras de negócio e validações isoladas, cálculo de preço, validação de documento, política de senha | Desenvolvimento | Sim |
| **Integração** | Operações de servidor contra o banco, incluindo restrições de integridade e permissão | Desenvolvimento | Sim, com dependências simuladas |
| **Aceite** | Se o sistema resolve o problema do usuário, com dados reais da empresa | **Usuário, com observação** | Não |

**Critério de entrada** no teste de aceite: os testes automatizados passam e a funcionalidade está
publicada no ambiente de produção com dados reais.

**Critério de aprovação** de um subsistema: todos os seus casos de aceite de prioridade *deve ter*
resultam em **Aprovado**. Caso reprovado impede a aprovação do subsistema: não existe aprovação
parcial, pela razão registrada em [`E3`, R-10](E3-analise-de-riscos.md): módulo iniciado e não
validado conta como não entregue.

**Ambiente:** celular Android com navegador de uso corrente, nas condições reais de campo, inclusive
sob conexão instável, que não é exceção a evitar mas condição a testar.

---

## 2. Como ler os casos

| Campo | Significado |
|---|---|
| **ID** | Identificador estável do caso |
| **Requisito** | Requisito de [`B2`](../B-requisitos/B2-especificacao-requisitos.md) que o caso verifica |
| **Pré-condição** | Estado necessário antes de iniciar |
| **Passos** | Ações do usuário, na ordem |
| **Resultado esperado** | O que deve ocorrer para o caso ser aprovado |
| **Situação** | Aprovado · Reprovado · Não executado |

Todos partem de **sessão autenticada** com perfil autorizado, salvo quando o próprio caso testa a
autenticação.

---

## 3. Acesso e segurança

| ID | Requisito | Pré-condição | Passos | Resultado esperado | Situação |
|---|---|---|---|---|---|
| **TA-01** | RF-01 | Sem sessão ativa | 1. Acessar diretamente o endereço de uma tela interna | Acesso é recusado e o usuário conduzido à autenticação | Não executado |
| **TA-02** | RF-02 | Usuário recém-criado com senha temporária | 1. Autenticar-se com a senha temporária<br>2. Tentar acessar qualquer outra tela | Sistema exige a definição de nova senha antes de permitir qualquer outra tela | Não executado |
| **TA-03** | RF-06 | Sessão de perfil colaborador | 1. Acionar diretamente uma operação restrita à chefia | Operação é recusada, ainda que acionada fora da interface | Não executado |
| **TA-04** | RF-62 | Sessão de perfil gerência | 1. Tentar acessar extrato, lançamento, compra, custo fixo e fechamento, inclusive digitando o endereço direto | Acesso recusado nas cinco. Consulta de preço, custo unitário, margem e indicadores permanecem acessíveis (D4 §3.2) | Não executado |
| **TA-05** | RF-07 | Duas sessões ativas do mesmo usuário, em aparelhos distintos | 1. Listar sessões ativas<br>2. Encerrar a sessão do outro aparelho<br>3. Tentar usar o outro aparelho | A sessão encerrada perde o acesso; a sessão atual permanece | Não executado |
| **TA-06** | RF-04 | - | 1. Tentar autenticar com senha errada<br>2. Autenticar corretamente<br>3. Consultar o registro de acessos | Ambas as tentativas constam, com data, origem e dispositivo | Não executado |

## 4. Custeio

| ID | Requisito | Pré-condição | Passos | Resultado esperado | Situação |
|---|---|---|---|---|---|
| **TA-07** | RF-08, RF-09 | Catálogo com espécies cadastradas | 1. Buscar uma espécie por um nome popular regional<br>2. Buscar a mesma espécie pelo nome científico | Ambas as buscas retornam a mesma espécie | Não executado |
| **TA-08** | RF-14 | Insumo, espécie e recipiente cadastrados | 1. Abrir o registro de consumo de insumo no celular<br>2. Preencher e confirmar | Registro é gravado, confirmação visual aparece, e o formulário volta vazio pronto para o próximo | Não executado |
| **TA-09** | RF-15 | Pelo menos dez espécies com custo calculado | 1. Consultar o custo unitário de uma espécie<br>2. **Apurar o mesmo custo manualmente**, em planilha, a partir dos insumos e do rateio | Os dois valores coincidem | Não executado |
| **TA-10** | RF-11 | Insumo com custo cadastrado | 1. Alterar o custo do insumo<br>2. Consultar o histórico de preços | O valor anterior permanece registrado, com a data da alteração | Não executado |
| **TA-11** | RF-18 | Espécie com custo calculado, usando o insumo alterado em TA-10 | 1. Consultar o custo unitário da espécie após a alteração | O custo reflete o novo preço do insumo | Não executado |
| **TA-12** | RF-16 | Custos fixos do mês registrados | 1. Somar o rateio de custo fixo de todas as combinações ativas | A soma iguala o custo fixo total do mês | Não executado |

> **TA-09 é o caso de aceite mais importante do sistema.** É o único que confronta o resultado do
> sistema com uma apuração independente, e é o que o §3.6 da metodologia cita nominalmente. Sua
> reprovação invalida todo o subsistema de precificação, que dele depende.

## 5. Perdas

| ID | Requisito | Pré-condição | Passos | Resultado esperado | Situação |
|---|---|---|---|---|---|
| **TA-13** | RF-26, RNF-01 | Espécies e recipientes cadastrados | 1. Registrar uma perda no celular, em campo | Registro concluído em **no máximo quatro campos**, sem digitação de texto livre | Não executado |
| **TA-14** | RF-26, RNF-05 | Dispositivo em modo avião | 1. Registrar uma perda sem conexão<br>2. Observar a confirmação<br>3. Restabelecer a conexão | Confirmação aparece imediatamente mesmo sem rede; o registro aparece no sistema após a reconexão | Não executado |
| **TA-15** | RF-28, RF-29 | Espécie com produção registrada e perdas acumuladas acima de 20% | 1. Registrar perda que ultrapasse o limite<br>2. Acessar o perfil de gerência | Alerta de mortalidade é exibido à gerência, identificando espécie e taxa | Não executado |
| **TA-16** | RF-29 | - | 1. Verificar se o colaborador que registrou a perda em TA-15 recebeu alerta | **O colaborador não é interrompido.** O alerta dirige-se a quem pode agir | Não executado |

## 5.1 Produção: cadastro do viveiro, lotes, agenda e apontamento

*Acrescentada em 24/08/2026.* Fecha a lacuna que a §13 declarava desde 19/08: **RF-69 a RF-76
estavam sem critério de aprovação**, e o subsistema da agenda não tinha como ser aceito. Os casos
abaixo cobrem esses e os requisitos da rotina de produção (RF-80 a RF-105).

### 5.1.1 Cadastro do viveiro

| ID | Requisito | Pré-condição | Passos | Resultado esperado | Situação |
|---|---|---|---|---|---|
| **TA-59** | RF-80, RF-81 | Sessão de gerência | 1. Cadastrar a área A<br>2. Cadastrar os canteiros 1, 2 e 3 nela<br>3. Cadastrar a área B e o canteiro 1 nela<br>4. Tentar cadastrar um segundo canteiro 1 na área A | Existem o canteiro 1 da área A e o canteiro 1 da área B, como lugares distintos; o repetido na mesma área é recusado | Não executado |
| **TA-60** | RF-69 | Sessão de chefia | 1. Cadastrar funcionário sem criar usuário para ele<br>2. Abrir a agenda da semana | O funcionário aparece na escalação mesmo sem nunca ter feito login | Não executado |
| **TA-61** | RF-70, RF-82 | Catálogo de tarefas carregado | 1. Abrir o apontamento de "Irrigação" (medição por tempo, sem lote)<br>2. Abrir o apontamento de "Repicar" (medição por tubete, com lote) | A primeira tela não apresenta campo de lote nem de quantidade; a segunda apresenta os dois | Não executado |
| **TA-62** | RF-83 | Turnos cadastrados com 4 horas cada | 1. Alterar o fim do turno da manhã para uma hora mais tarde<br>2. Consultar as horas de uma tarefa planejada naquele turno, sem apontamento | As horas atribuídas passam de 4 para 5, sem alterar a atribuição | Não executado |

### 5.1.2 Lotes

| ID | Requisito | Pré-condição | Passos | Resultado esperado | Situação |
|---|---|---|---|---|---|
| **TA-63** | RF-84, RF-90 | Espécie com tempo de produção, recipiente e canteiro livre | 1. Criar lote de 500 mudas no canteiro A-3<br>2. Consultar o lote | O lote ocupa A-3, tem saldo 500 e previsão de disponibilidade igual à data de plantio somada ao tempo de produção da espécie | Não executado |
| **TA-64** | RF-85, RF-89 | Lote aberto em A-3 | 1. Consultar a ocupação do viveiro<br>2. Baixar o lote inteiro por perda<br>3. Consultar a ocupação de novo | A-3 aparece ocupado no passo 1 e **livre** no passo 3; o lote continua consultável pelo histórico | Não executado |
| **TA-65** | RF-86, RF-87 | Lote de 500 mudas em tubete, canteiro B-1 livre | 1. Repicar 300 mudas para saco 10x18, destino B-1<br>2. Consultar os dois lotes | O lote de origem fica com saldo 200; o novo tem 300, está em B-1 e exibe o lote de origem. O histórico de ambos explica a diferença | Não executado |
| **TA-66** | RF-86, RF-91 | Lote de 500 mudas | 1. Repicar 300 mudas informando que 20 morreram no processo<br>2. Consultar o saldo do lote de origem e a mortalidade da espécie | O lote de origem cai para 180, o novo tem 300, e as 20 aparecem como perda **daquele lote**, não como diferença sem explicação | Não executado |
| **TA-67** | RF-88 | Lote com saldo 200 | 1. Tentar registrar perda de 250 mudas | A operação é recusada, com o saldo disponível informado. **Nenhum saldo negativo é gravado** | Não executado |
| **TA-68** | RF-91, RNF-01 | Lote aberto | 1. Registrar uma perda a partir do lote, no celular | O registro conclui-se em **no máximo quatro campos**, e em nenhum deles se digita espécie, recipiente ou canteiro: os três vêm do lote | Não executado |

### 5.1.3 Agenda da semana

| ID | Requisito | Pré-condição | Passos | Resultado esperado | Situação |
|---|---|---|---|---|---|
| **TA-69** | RF-71, RF-92 | Três funcionários cadastrados | 1. Escalar dois deles para "Encher saquinho" na manhã de segunda<br>2. Escalar o terceiro para "Irrigação" na mesma manhã<br>3. Consultar a agenda do dia | As duas tarefas coexistem no mesmo turno, cada uma com o seu grupo | Não executado |
| **TA-70** | RF-93 | Agenda da semana aberta | 1. Lançar "Irrigação" para o intervalo de segunda a sexta | A tarefa aparece nos cinco dias, com um lançamento só | Não executado |
| **TA-71** | RF-72 | Semana anterior preenchida, com uma tarefa marcada como recorrente | 1. Criar a semana nova<br>2. Acionar "copiar semana passada" | A semana nasce com a tarefa recorrente já presente, e a cópia reproduz o restante da anterior | Não executado |
| **TA-72** | RF-73 | Semana no estado *fechada* | 1. Tentar alterar uma atribuição dela | A alteração é recusada, com o motivo informado | Não executado |
| **TA-73** | RF-74 | Duas tarefas na segunda, uma para o colaborador e outra para um colega | 1. Entrar com o perfil do colaborador<br>2. Consultar as tarefas do dia | Vê a própria tarefa e **não vê** a do colega | Não executado |

### 5.1.4 Apontamento

| ID | Requisito | Pré-condição | Passos | Resultado esperado | Situação |
|---|---|---|---|---|---|
| **TA-74** | RF-94, RF-95 | Funcionário escalado para repicagem | 1. Abrir a agenda do dia<br>2. Iniciar o apontamento de repicagem no cartão dele<br>3. Uma hora depois, iniciar o apontamento de irrigação no mesmo cartão | O cartão passa a exibir irrigação, e o apontamento de repicagem fica encerrado com uma hora, **sem que nada tenha sido pedido para encerrá-lo** | Não executado |
| **TA-75** | RF-97 | Apontamento aberto para um funcionário | 1. Abrir a mesma agenda em dois aparelhos<br>2. Iniciar uma tarefa nova nos dois ao mesmo tempo | Apenas um apontamento fica aberto. A segunda tentativa é recusada pelo banco, e não só pela tela | Não executado |
| **TA-76** | RF-96 | Funcionário com apontamento aberto | 1. Encerrar o dia dele<br>2. Consultar o cartão | Nenhuma tarefa em curso, e as horas do apontamento encerrado ficam registradas | Não executado |
| **TA-77** | RF-98 | Duas tarefas, uma medida por tempo e outra por saco | 1. Encerrar a medida por tempo<br>2. Encerrar a medida por saco | A primeira encerra sem pedir número algum; a segunda pede a quantidade, e só ela | Não executado |
| **TA-78** | RF-99 | Tarefa de repicagem em curso | 1. Tentar iniciar o apontamento sem informar lote | A operação é recusada e o campo de lote é indicado | Não executado |
| **TA-79** | RF-100, RF-75 | Dois dias planejados, um com apontamento e outro sem | 1. Fechar a semana<br>2. Consultar as horas de cada dia | O dia apontado usa o intervalo real; o dia sem apontamento usa a jornada do turno, **marcado como não confirmado** | Não executado |
| **TA-80** | RF-76, RF-100 | Semana fechada e valor-hora do período definido | 1. Consultar o custo de mão de obra por espécie<br>2. **Conferir manualmente**: horas × valor-hora | Os dois valores coincidem, e o custo aparece rateado sobre a espécie de cada tarefa | Não executado |

### 5.1.5 Insumos e gastos da tarefa

| ID | Requisito | Pré-condição | Passos | Resultado esperado | Situação |
|---|---|---|---|---|---|
| **TA-81** | RF-101, RF-102 | Insumo com 100 litros de entrada e nenhum consumo | 1. Encerrar uma tarefa informando consumo de 30 litros<br>2. Consultar o saldo do insumo | O saldo passa a 70, **sem nenhuma ação além do encerramento da tarefa** | Não executado |
| **TA-82** | RF-105 | Insumo com saldo 10 | 1. Encerrar tarefa informando consumo de 25 | O registro é **gravado**, e o saldo aparece negativo e destacado. A operação não é recusada | Não executado |
| **TA-83** | RF-104 | Tarefa encerrada, ligada a um lote | 1. Lançar gasto extra de frete na tarefa<br>2. Consultar o custo do lote | O gasto aparece como custo direto daquele lote, e não no rateio geral | Não executado |
| **TA-84** | RF-104, RF-70 | Sessão de colaborador | 1. Abrir o encerramento de uma tarefa | Não existe campo de valor em reais na tela do colaborador | Não executado |

> **TA-80 tem a mesma natureza de TA-09 e TA-51**: confronta o número do sistema com uma apuração
> manual. É o tipo de caso que decide se o custo apurado merece confiança, e por isso não pode ser
> substituído por conferência de tela.

> **TA-75 exige dois aparelhos de propósito.** A regra "uma pessoa faz uma tarefa por vez" (RN-83)
> é garantida por índice único parcial no banco, e não por validação de tela: um teste feito num
> aparelho só passaria mesmo que a garantia estivesse apenas na interface.

---

## 6. Precificação

| ID | Requisito | Pré-condição | Passos | Resultado esperado | Situação |
|---|---|---|---|---|---|
| **TA-17** | RF-31, RF-32 | Espécie com custo apurado; margem definida para o canal | 1. Consultar o preço sugerido da espécie no canal | O preço corresponde ao custo acrescido da margem do canal | Não executado |
| **TA-18** | RF-33 | Pedido em fechamento | 1. Informar preço inferior ao piso mínimo<br>2. Tentar aprovar | **Aprovação é recusada**, com indicação do piso aplicável. Não é apenas um aviso | Não executado |
| **TA-19** | RF-35 | Espécies com custo apurado e preço praticado registrado | 1. Abrir o relatório de comparação entre custo e preço | Relatório exibe a margem por espécie e **destaca ao menos um caso real de margem negativa** | Não executado |

> **TA-19 tem uma característica incomum:** seu resultado esperado é encontrar um problema. Se
> nenhuma margem negativa aparecer no primeiro relatório sobre dados reais, a hipótese mais provável
> não é que a precificação esteja correta: é que o custo esteja subestimado, e o caso deve ser
> reexaminado junto com TA-09.

## 7. Clientes e pedidos

| ID | Requisito | Pré-condição | Passos | Resultado esperado | Situação |
|---|---|---|---|---|---|
| **TA-20** | RF-36 | Cliente inexistente no sistema | 1. Iniciar o cadastro de um pedido<br>2. Acionar o cadastro rápido<br>3. Informar apenas nome e telefone<br>4. Concluir o pedido | O pedido é concluído **sem sair da tela** e sem exigir dados fiscais | Não executado |
| **TA-21** | RF-38 | - | 1. Informar um CPF inválido no cadastro completo | Documento é recusado no momento da digitação, preservando os demais campos preenchidos | Não executado |
| **TA-22** | RF-41 | Espécies e recipientes cadastrados | 1. Registrar um pedido com três itens<br>2. Consultar a lista de pedidos | Pedido aparece na lista, com número sequencial e os três itens | Não executado |
| **TA-23** | RF-66, RF-67 | - | 1. Registrar item genérico com quantidade e recipiente, sem espécie<br>2. Definir a lista de espécies aceitas<br>3. Na verificação, tentar atender com espécie fora da lista | Item genérico é aceito sem espécie; a espécie fora da lista é recusada | Não executado |
| **TA-24** | RF-42, RF-43 | Pedido no estado *cadastrado*; estoque menor que o pedido em um item | 1. Verificar a disponibilidade item a item<br>2. Informar a quantidade parcial disponível | Item é registrado como **parcial**, preservando a quantidade pedida e a disponível, e não como indisponível | Não executado |
| **TA-25** | RF-68 | Espécie disponível em recipiente diferente do pedido | 1. Na verificação, informar quantidade e recipiente realmente disponível | O sistema registra a quantidade e o recipiente ofertado | Não executado |
| **TA-26** | RF-44, RF-46 | Pedido no estado *verificado* | 1. Aprovar o pedido | Pedido passa a *aprovado*, a carga de separação é gerada com os itens aprovados, e os responsáveis são notificados | Não executado |
| **TA-27** | RF-40, RF-45 | Pedido de cliente cadastrado apenas com nome e telefone | 1. No fechamento, indicar que há nota fiscal a emitir | Sistema solicita os dados fiscais **na própria tela**, sem descartar o pedido em andamento | Não executado |
| **TA-28** | RF-47 | Carga no estado *pendente* | 1. Marcar cada item como separado, no celular, em campo | Ao concluir, a carga passa a *pronta* e o pedido a *pronto para envio* | Não executado |
| **TA-29** | RF-48 | Pedido que percorreu o ciclo completo | 1. Consultar o histórico de estados | A sequência completa aparece, com autor e momento de cada transição | Não executado |

## 8. Fornecedores

| ID | Requisito | Pré-condição | Passos | Resultado esperado | Situação |
|---|---|---|---|---|---|
| **TA-30** | RF-53 | Fornecedores cadastrados que ofertam a espécie | 1. Emitir cotação para três fornecedores<br>2. Consultar as cotações geradas | Três cotações são criadas, agrupadas sob a mesma consulta, com o texto enviado registrado | Não executado |
| **TA-31** | RF-53 | Fornecedor marcado como *não contatar* | 1. Tentar incluí-lo na seleção da cotação | Fornecedor é **excluído da seleção** pelo sistema, com indicação do motivo | Não executado |
| **TA-32** | RF-54 | Consulta com pelo menos duas respostas registradas | 1. Registrar as respostas<br>2. Comparar as propostas<br>3. Escolher uma por espécie | O comparativo apresenta as propostas lado a lado; a escolha admite uma única por espécie | Não executado |

## 9. Financeiro

| ID | Requisito | Pré-condição | Passos | Resultado esperado | Situação |
|---|---|---|---|---|---|
| **TA-33** | RF-56 | Arquivo de extrato de uma conta | 1. Importar o arquivo | Os lançamentos são criados sem digitação, e o total de linhas confere com o arquivo | Não executado |
| **TA-34** | RF-56 | Extrato já importado | 1. **Importar o mesmo arquivo novamente** | Nenhum lançamento é duplicado; a importação registra as linhas descartadas | Não executado |
| **TA-35** | RF-57, RF-58 | Lançamentos pendentes de classificação | 1. Classificar um lançamento recorrente<br>2. Importar o extrato do mês seguinte | O lançamento equivalente chega **já classificado** | Não executado |
| **TA-36** | RF-59 | Lançamento pago em mês distinto daquele a que pertence | 1. Informar data de competência diferente da data de movimentação | O custo é computado no mês de competência; o saldo, no mês de movimentação | Não executado |
| **TA-37** | RF-60 | Mês com todos os lançamentos classificados | 1. Conferir o saldo calculado contra o saldo do extrato<br>2. Fechar o mês<br>3. Tentar alterar um lançamento do período | Os saldos coincidem; após o fechamento, a alteração é recusada | Não executado |
| **TA-38** | RF-61 | Mês corrente, ainda não fechado | 1. Consultar os indicadores financeiros do mês | Sistema exibe indicação de indisponibilidade, **e não um número** | Não executado |

### 9.1 Centros de custo

Os três casos abaixo verificam um **cadastro do módulo 1** (`/cadastros/centros-de-custo`), e estão
aqui porque é no lançamento que o efeito aparece. Acrescentados em 24/08/2026, com RF-77 a RF-79.

| ID | Requisito | Pré-condição | Passos | Resultado esperado | Situação |
|---|---|---|---|---|---|
| **TA-56** | RF-77 | Sessão de chefia | 1. Cadastrar centro de custo com nome e natureza<br>2. Classificar um lançamento pendente | O centro novo é oferecido na classificação e pode ser atribuído | Não executado |
| **TA-57** | RF-78 | Centro de custo com lançamento já classificado | 1. Inativar o centro<br>2. Abrir a classificação de um lançamento pendente<br>3. Consultar o lançamento antigo daquele centro | O centro não é oferecido na classificação nova, e o lançamento antigo continua exibindo-o | Não executado |
| **TA-58** | RF-79 | Centro de custo com lançamento já classificado | 1. Tentar alterar a natureza do centro<br>2. Procurar a opção de excluí-lo | A alteração é recusada com aviso, e não existe operação de exclusão | Não executado |

## 10. Indicadores

| ID | Requisito | Pré-condição | Passos | Resultado esperado | Situação |
|---|---|---|---|---|---|
| **TA-39** | RF-63 | Dados reais nos subsistemas | 1. Acessar o painel como chefia<br>2. Acessar o painel como gerência | Os dois perfis veem conjuntos distintos de indicadores | Não executado |
| **TA-40** | RF-64, RF-65 | Indicador com meta definida e período anterior disponível | 1. Consultar um indicador | Exibe valor, comparação com o período anterior, meta e sinalização visual de desempenho | Não executado |

## 11. Requisitos não funcionais

| ID | Requisito | Pré-condição | Passos | Resultado esperado | Situação |
|---|---|---|---|---|---|
| **TA-41** | RNF-01 | - | 1. Contar os campos de cada formulário destinado ao uso em campo | Nenhum excede cinco campos | Não executado |
| **TA-42** | RNF-02 | - | 1. Inspecionar cada campo de categoria dos formulários | Nenhum admite entrada livre de texto | Não executado |
| **TA-43** | RNF-06 | Celular de uso corrente | 1. Executar todas as rotinas de campo no celular | Nenhuma exige rolagem horizontal nem ampliação | Não executado |
| **TA-44** | RNF-07 | Conexão móvel limitada | 1. Executar as rotinas de campo sob rede lenta | As rotinas se completam em tempo aceitável para uso real | Não executado |
| **TA-45** | RNF-05 | Registro feito sem conexão | 1. Registrar<br>2. **Recarregar a página**<br>3. Restabelecer a conexão | O registro sobrevive ao recarregamento e é enviado ao reconectar | Não executado |
| **TA-46** | RNF-12 | - | 1. Inspecionar o código entregue ao navegador | Nenhuma credencial de banco e nenhuma regra de autorização presentes | Não executado |
| **TA-47** | RNF-09, RNF-10 | - | 1. Inspecionar o armazenamento de usuários e sessões | Nenhuma senha legível; identificadores de sessão apenas em forma protegida | Não executado |

## 12. Casos acrescentados pela matriz de rastreabilidade

Os oito casos abaixo não constavam da primeira versão deste documento. Foram acrescentados quando a
matriz [`B5`](../B-requisitos/B5-matriz-rastreabilidade.md) confrontou requisitos e testes e apontou
requisitos de prioridade *deve ter* sem verificação correspondente.

| ID | Requisito | Pré-condição | Passos | Resultado esperado | Situação |
|---|---|---|---|---|---|
| **TA-48** | RF-05 | Sessão de administrador | 1. Criar usuário com perfil gerência<br>2. Autenticar-se como o novo usuário<br>3. Tentar acessar tela restrita à chefia | Usuário criado acessa apenas o que seu perfil permite | Não executado |
| **TA-49** | RF-10 | Sessão de chefia | 1. Cadastrar recipiente com volume e consumo de substrato<br>2. Registrar consumo de insumo usando o novo recipiente | Recipiente cadastrado fica disponível nas demais telas e compõe o custeio | Não executado |
| **TA-50** | RF-19 | Espécie e recipiente cadastrados | 1. Registrar uma semeadura no celular, informando espécie, recipiente e quantidade<br>2. Consultar o acompanhamento de produção | A atividade aparece no acompanhamento e soma ao estoque | Não executado |
| **TA-51** | RF-22 | Produção registrada, perdas registradas e pedido aprovado da mesma espécie | 1. Consultar a quantidade disponível da espécie<br>2. **Conferir manualmente**: produção − perdas − saídas | Os dois valores coincidem | Não executado |
| **TA-52** | RF-23 | Espécie com quantidade calculada diferente da real | 1. Registrar contagem física com a quantidade real<br>2. Consultar o estoque | A quantidade exibida passa a ser a contada, e a divergência fica registrada | Não executado |
| **TA-53** | RF-27 | Perdas registradas em datas distintas | 1. Filtrar as perdas por um intervalo de datas | Retorna somente os registros do intervalo | Não executado |
| **TA-54** | RF-39 | Cliente cadastrado com nome, telefone e documento | 1. Buscar por parte do nome<br>2. Buscar pelo telefone<br>3. Buscar pelo documento | As três buscas retornam o mesmo cliente | Não executado |
| **TA-55** | RF-51 | Carga no estado *pronta* | 1. Confirmar a entrega da carga<br>2. Consultar a agenda de entregas | A carga sai da agenda e o pedido é concluído | Não executado |

> **TA-51 tem a mesma natureza de TA-09**: confronta o número do sistema com uma apuração manual
> independente. É o que valida a decisão de manter o estoque como quantidade derivada em vez de
> entidade armazenada: se os valores divergirem, a derivação está errada.

---

## 13. Cobertura

| Subsistema | Casos | Requisitos *deve ter* cobertos |
|---|---:|---|
| Acesso e segurança | 7 | RF-01, RF-02, RF-04, RF-05, RF-06, RF-07, RF-62 |
| Custeio | 7 | RF-08 a RF-12, RF-14 a RF-18 |
| Produção e estoque | 3 | RF-19, RF-22, RF-23 |
| Perdas | 5 | RF-26, RF-27, RF-28, RF-29 |
| Cadastro do viveiro | 4 | RF-69, RF-70, RF-80 a RF-83 |
| Lotes | 6 | RF-84 a RF-91 |
| Agenda da semana | 5 | RF-71 a RF-74, RF-92, RF-93 |
| Apontamento | 7 | RF-75, RF-76, RF-94 a RF-100 |
| Insumos e gastos da tarefa | 4 | RF-101, RF-102, RF-104, RF-105 |
| Precificação | 3 | RF-31, RF-32, RF-33, RF-35 |
| Clientes e pedidos | 12 | RF-36, RF-38 a RF-48, RF-51, RF-66 a RF-68 |
| Fornecedores | 3 | RF-53, RF-54 |
| Financeiro | 9 | RF-56 a RF-61, RF-77 a RF-79 |
| Indicadores | 2 | RF-63, RF-64, RF-65 |
| Não funcionais | 7 | RNF-01, RNF-02, RNF-05 a RNF-07, RNF-09, RNF-10, RNF-12 |
| **Total** | **84** | **80 dos 87 requisitos de prioridade *deve ter*** |

Requisitos sem caso de aceite correspondente são identificados pela matriz de rastreabilidade
[`B5`](../B-requisitos/B5-matriz-rastreabilidade.md). Ausência de cobertura em requisito de
prioridade *deve ter* é defeito de especificação, não do teste.

**A lacuna da agenda de pessoal foi fechada em 24/08/2026.** Até essa data, sete *deve ter*
estavam descobertos (RF-69 a RF-74 e RF-76) e o subsistema não tinha critério de aprovação
declarado. A §5.1 cobre os sete, junto dos requisitos da rotina de produção.

**Sete *deve ter* continuam descobertos**, todos acrescentados em 24/08/2026 e todos de
apresentação: RF-79 e RF-103 (sinalizações), RF-85 e RF-87 (telas de consulta, cobertas
indiretamente por TA-64 e TA-65), RF-82 (coberto por TA-61), RF-88 e RF-89 (cobertos por TA-67 e
TA-64). Pelo critério do parágrafo anterior isso é defeito de especificação, e a decisão foi
**não multiplicar casos que apenas reexecutam o passo de conferência de outro**: a cobertura
indireta está declarada aqui em vez de disfarçada num caso próprio.

---

## 14. Registro de execução

A execução preenche a coluna **Situação** e acrescenta, para cada caso reprovado: data, executor,
observação e a decisão tomada: corrigir, aceitar com ressalva, ou reclassificar o requisito.

Os casos de aceite são executados **pelos próprios usuários da empresa**, sob observação, o que os
integra à mesma sessão de avaliação de usabilidade descrita em
[`F3`](../F-ux/F3-plano-avaliacao-usabilidade.md). A economia é deliberada: uma única sessão produz
verificação funcional e medição de usabilidade, e a disponibilidade dos usuários é recurso escasso
([`E3`, R-04](E3-analise-de-riscos.md)).
