# Apêndice C — Casos de teste de aceite

> Gerado a partir de `E-qualidade/E2-casos-de-teste-de-aceite.md`.
> **Não edite este arquivo** — edite o artefato de origem e rode `npm run docs:tcc`.

---

## 1. Níveis de teste e critério de aprovação

Como o plano de testes completo não integra o conjunto de artefatos produzidos, esta seção fixa o
mínimo necessário para que os casos abaixo se sustentem.

| Nível | O que verifica | Quem executa | Automatizado |
|---|---|---|---|
| **Unitário** | Funções utilitárias, regras de negócio e validações isoladas — cálculo de preço, validação de documento, política de senha | Desenvolvimento | Sim |
| **Integração** | Operações de servidor contra o banco, incluindo restrições de integridade e permissão | Desenvolvimento | Sim, com dependências simuladas |
| **Aceite** | Se o sistema resolve o problema do usuário, com dados reais da empresa | **Usuário, com observação** | Não |

**Critério de entrada** no teste de aceite: os testes automatizados passam e a funcionalidade está
publicada no ambiente de produção com dados reais.

**Critério de aprovação** de um subsistema: todos os seus casos de aceite de prioridade *deve ter*
resultam em **Aprovado**. Caso reprovado impede a aprovação do subsistema — não existe aprovação
parcial, pela razão registrada em [`E3`, R-10](E3-analise-de-riscos.md): módulo iniciado e não
validado conta como não entregue.

**Ambiente:** celular Android com navegador de uso corrente, nas condições reais de campo — inclusive
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
| **TA-04** | RF-62 | Sessão de perfil gerência | 1. Tentar acessar qualquer tela do subsistema financeiro | Acesso recusado em todas as telas financeiras | Não executado |
| **TA-05** | RF-07 | Duas sessões ativas do mesmo usuário, em aparelhos distintos | 1. Listar sessões ativas<br>2. Encerrar a sessão do outro aparelho<br>3. Tentar usar o outro aparelho | A sessão encerrada perde o acesso; a sessão atual permanece | Não executado |
| **TA-06** | RF-04 | — | 1. Tentar autenticar com senha errada<br>2. Autenticar corretamente<br>3. Consultar o registro de acessos | Ambas as tentativas constam, com data, origem e dispositivo | Não executado |

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
| **TA-16** | RF-29 | — | 1. Verificar se o colaborador que registrou a perda em TA-15 recebeu alerta | **O colaborador não é interrompido.** O alerta dirige-se a quem pode agir | Não executado |

## 6. Precificação

| ID | Requisito | Pré-condição | Passos | Resultado esperado | Situação |
|---|---|---|---|---|---|
| **TA-17** | RF-31, RF-32 | Espécie com custo apurado; margem definida para o canal | 1. Consultar o preço sugerido da espécie no canal | O preço corresponde ao custo acrescido da margem do canal | Não executado |
| **TA-18** | RF-33 | Pedido em fechamento | 1. Informar preço inferior ao piso mínimo<br>2. Tentar aprovar | **Aprovação é recusada**, com indicação do piso aplicável. Não é apenas um aviso | Não executado |
| **TA-19** | RF-35 | Espécies com custo apurado e preço praticado registrado | 1. Abrir o relatório de comparação entre custo e preço | Relatório exibe a margem por espécie e **destaca ao menos um caso real de margem negativa** | Não executado |

> **TA-19 tem uma característica incomum:** seu resultado esperado é encontrar um problema. Se
> nenhuma margem negativa aparecer no primeiro relatório sobre dados reais, a hipótese mais provável
> não é que a precificação esteja correta — é que o custo esteja subestimado, e o caso deve ser
> reexaminado junto com TA-09.

## 7. Clientes e pedidos

| ID | Requisito | Pré-condição | Passos | Resultado esperado | Situação |
|---|---|---|---|---|---|
| **TA-20** | RF-36 | Cliente inexistente no sistema | 1. Iniciar o cadastro de um pedido<br>2. Acionar o cadastro rápido<br>3. Informar apenas nome e telefone<br>4. Concluir o pedido | O pedido é concluído **sem sair da tela** e sem exigir dados fiscais | Não executado |
| **TA-21** | RF-38 | — | 1. Informar um CPF inválido no cadastro completo | Documento é recusado no momento da digitação, preservando os demais campos preenchidos | Não executado |
| **TA-22** | RF-41 | Espécies e recipientes cadastrados | 1. Registrar um pedido com três itens<br>2. Consultar a lista de pedidos | Pedido aparece na lista, com número sequencial e os três itens | Não executado |
| **TA-23** | RF-66, RF-67 | — | 1. Registrar item genérico com quantidade e recipiente, sem espécie<br>2. Definir a lista de espécies aceitas<br>3. Na verificação, tentar atender com espécie fora da lista | Item genérico é aceito sem espécie; a espécie fora da lista é recusada | Não executado |
| **TA-24** | RF-42, RF-43 | Pedido no estado *cadastrado*; estoque menor que o pedido em um item | 1. Verificar a disponibilidade item a item<br>2. Informar a quantidade parcial disponível | Item é registrado como **parcial**, preservando a quantidade pedida e a disponível — e não como indisponível | Não executado |
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

## 10. Indicadores

| ID | Requisito | Pré-condição | Passos | Resultado esperado | Situação |
|---|---|---|---|---|---|
| **TA-39** | RF-63 | Dados reais nos subsistemas | 1. Acessar o painel como chefia<br>2. Acessar o painel como gerência | Os dois perfis veem conjuntos distintos de indicadores | Não executado |
| **TA-40** | RF-64, RF-65 | Indicador com meta definida e período anterior disponível | 1. Consultar um indicador | Exibe valor, comparação com o período anterior, meta e sinalização visual de desempenho | Não executado |

## 11. Requisitos não funcionais

| ID | Requisito | Pré-condição | Passos | Resultado esperado | Situação |
|---|---|---|---|---|---|
| **TA-41** | RNF-01 | — | 1. Contar os campos de cada formulário destinado ao uso em campo | Nenhum excede cinco campos | Não executado |
| **TA-42** | RNF-02 | — | 1. Inspecionar cada campo de categoria dos formulários | Nenhum admite entrada livre de texto | Não executado |
| **TA-43** | RNF-06 | Celular de uso corrente | 1. Executar todas as rotinas de campo no celular | Nenhuma exige rolagem horizontal nem ampliação | Não executado |
| **TA-44** | RNF-07 | Conexão móvel limitada | 1. Executar as rotinas de campo sob rede lenta | As rotinas se completam em tempo aceitável para uso real | Não executado |
| **TA-45** | RNF-05 | Registro feito sem conexão | 1. Registrar<br>2. **Recarregar a página**<br>3. Restabelecer a conexão | O registro sobrevive ao recarregamento e é enviado ao reconectar | Não executado |
| **TA-46** | RNF-12 | — | 1. Inspecionar o código entregue ao navegador | Nenhuma credencial de banco e nenhuma regra de autorização presentes | Não executado |
| **TA-47** | RNF-09, RNF-10 | — | 1. Inspecionar o armazenamento de usuários e sessões | Nenhuma senha legível; identificadores de sessão apenas em forma protegida | Não executado |

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
> entidade armazenada — se os valores divergirem, a derivação está errada.

---

## 13. Cobertura

| Subsistema | Casos | Requisitos *deve ter* cobertos |
|---|---:|---|
| Acesso e segurança | 7 | RF-01, RF-02, RF-04, RF-05, RF-06, RF-07, RF-62 |
| Custeio | 7 | RF-08 a RF-12, RF-14 a RF-18 |
| Produção e estoque | 3 | RF-19, RF-22, RF-23 |
| Perdas | 5 | RF-26, RF-27, RF-28, RF-29 |
| Precificação | 3 | RF-31, RF-32, RF-33, RF-35 |
| Clientes e pedidos | 12 | RF-36, RF-38 a RF-48, RF-51, RF-66 a RF-68 |
| Fornecedores | 3 | RF-53, RF-54 |
| Financeiro | 6 | RF-56 a RF-61 |
| Indicadores | 2 | RF-63, RF-64, RF-65 |
| Não funcionais | 7 | RNF-01, RNF-02, RNF-05 a RNF-07, RNF-09, RNF-10, RNF-12 |
| **Total** | **55** | **Todos os 51 requisitos de prioridade *deve ter*** |

Requisitos sem caso de aceite correspondente são identificados pela matriz de rastreabilidade
[`B5`](../B-requisitos/B5-matriz-rastreabilidade.md). Ausência de cobertura em requisito de
prioridade *deve ter* é defeito de especificação, não do teste.

---

## 14. Registro de execução

A execução preenche a coluna **Situação** e acrescenta, para cada caso reprovado: data, executor,
observação e a decisão tomada — corrigir, aceitar com ressalva, ou reclassificar o requisito.

Os casos de aceite são executados **pelos próprios usuários da empresa**, sob observação, o que os
integra à mesma sessão de avaliação de usabilidade descrita em
[`F3`](../F-ux/F3-plano-avaliacao-usabilidade.md). A economia é deliberada: uma única sessão produz
verificação funcional e medição de usabilidade, e a disponibilidade dos usuários é recurso escasso
([`E3`, R-04](E3-analise-de-riscos.md)).

