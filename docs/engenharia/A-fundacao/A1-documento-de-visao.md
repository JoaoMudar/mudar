# A1 — Documento de Visão

> **Artefato:** Documento de Visão · **Bloco:** A — Fundação e escopo
> **Destino no TCC:** Capítulo 4, seção 4.1 — Visão geral da solução
> **Fundamentação:** Sommerville (2011) situa a definição de escopo e de restrições como parte da
> engenharia de requisitos, anterior à especificação. Pressman e Maxim (2016) acrescentam que a
> delimitação explícita do que o software **não** fará é tão determinante quanto a do que ele fará.

---

## 1. Identificação

| Campo | Conteúdo |
|---|---|
| **Produto** | Sistema de gestão para viveiro florestal |
| **Organização** | Viveiro Mudar — Agrolândia, Santa Catarina |
| **Natureza** | Protótipo funcional, desenvolvido como Trabalho de Conclusão de Curso |
| **Domínio** | Produção e comercialização de mudas de árvores nativas |
| **Usuários previstos** | 9 pessoas, distribuídas em 3 perfis de acesso |

---

## 2. O problema

O Viveiro Mudar produz e comercializa mudas de espécies nativas desde 1990. Ao longo de mais de três
décadas, a operação consolidou-se sem qualquer estrutura de dados: **não há registro de perdas, de
custo por espécie, de margem por canal de venda nem de estoque.**

O conhecimento operacional está distribuído na memória de duas pessoas. A precificação é definida
intuitivamente pelo gestor, sem qualquer apuração de custo. O único sistema em uso restringe-se à
emissão de notas fiscais, e os dados dele exportados vêm em planilhas de campos genéricos,
insuficientes para subsidiar decisão. A comercialização ocorre majoritariamente por WhatsApp, sem
registro estruturado do pedido.

Duas consequências decorrem diretamente desse quadro:

1. **A empresa pode estar comercializando abaixo do custo sem ter como perceber.** Sem custo
   apurado por espécie e recipiente, a margem é desconhecida, e uma margem negativa é
   indistinguível de uma positiva.
2. **Não há previsibilidade de receita.** Sem histórico estruturado de pedidos, de tempo de produção
   e de estoque, não é possível projetar o que estará disponível para venda nem quando.

O problema não é de escala nem de tecnologia disponível — é de **ausência de registro**. Todo dado
necessário à gestão é gerado diariamente pela operação e descartado no mesmo dia.

---

## 3. A oportunidade

O Alto Vale do Itajaí concentra a maior densidade de viveiros florestais de Santa Catarina, e o
diagnóstico do setor aponta a ausência de protocolos e as falhas de gestão como causas de
ineficiência produtiva. Trata-se, em sua maioria, de microempresas cuja continuidade depende da
geração de valor — para as quais a adoção de tecnologia da informação é fator de competitividade e,
frequentemente, de sobrevivência.

A oportunidade consiste em capturar, no ponto em que ela ocorre, a informação que a operação já
produz — e convertê-la em custo apurado, margem visível e previsão de disponibilidade.

---

## 4. Objetivos do produto

Derivados dos objetivos específicos do trabalho:

| # | Objetivo | Verificação |
|---|---|---|
| **OP-1** | Estruturar o registro de produção, clientes, vendas e compras, hoje inexistente | Dados das oito rotinas persistidos e consultáveis |
| **OP-2** | Apurar o custo unitário real por espécie e recipiente, substituindo a estimativa intuitiva | Custo calculado e conferido contra apuração manual |
| **OP-3** | Tornar visível a margem por canal de venda, com piso mínimo que impeça venda com prejuízo | Relatório de margem com destaque para valores negativos |
| **OP-4** | Automatizar processos comerciais recorrentes, hoje conduzidos manualmente por WhatsApp | Pedido registrado no sistema em vez de em conversa |
| **OP-5** | Definir e disponibilizar indicadores de desempenho para monitoramento da eficiência operacional | Indicadores especificados e apresentados em painel |

---

## 5. Stakeholders e usuários

| Perfil | Quantidade | Responsabilidades no sistema | Nível técnico | Dispositivo |
|---|---|---|---|---|
| **Chefia** | 1 | Vendas, aprovação de preço, finanças, entregas, decisões | Baixo | Celular e computador |
| **Gerência** | 2 | Operação, coordenação, estoque, planejamento de produção, tarefas | Baixo a médio | Celular |
| **Colaborador** | 6 | Execução em campo: produção, perdas, separação de cargas | Baixo, sem formação técnica | Celular |

**Stakeholders sem acesso ao sistema, mas com influência sobre os requisitos:** o contador da
empresa (formato dos dados fiscais), os clientes de compensação ambiental (exigência de nota fiscal
e de nome científico) e os órgãos ambientais (rastreabilidade de espécies nativas).

**Condição do autor:** o autor do trabalho integra a gerência da empresa. A imersão no domínio é uma
vantagem de elicitação e, simultaneamente, um risco metodológico de viés — tratado explicitamente em
[`E3 — Análise de riscos`](../E-qualidade/E3-analise-de-riscos.md).

---

## 6. Escopo — o que o sistema fará

Organizado por subsistema. A ordem reflete dependência: o custeio é fundacional, e os demais o
consomem.

| Subsistema | Entrega |
|---|---|
| **Custeio** | Cadastro de espécies, recipientes, insumos, custos fixos e coleta de sementes; cálculo do custo unitário por espécie e recipiente |
| **Produção** | Registro de semeadura, repicagem e demais atividades; acompanhamento do ciclo produtivo |
| **Estoque** | Quantidade disponível por espécie e recipiente, derivada de produção, perdas e vendas; alerta de estoque baixo |
| **Perdas** | Registro de perda em campo com causa; análise por espécie e alerta de mortalidade acima do limite |
| **Precificação** | Preço por canal de venda a partir do custo apurado, com piso mínimo e frete incorporado |
| **Clientes** | Cadastro com dados fiscais de pessoa física e jurídica; cadastro rápido durante o pedido |
| **Pedidos** | Ciclo completo: registro, verificação de disponibilidade, aprovação, separação e entrega |
| **Fornecedores** | Cadastro, cotação e comparação de propostas para complementar produção própria |
| **Financeiro** | Importação de extrato bancário, classificação de lançamentos e fechamento mensal |
| **Indicadores** | Painel por perfil com os indicadores de desempenho definidos |
| **Acesso** | Autenticação, três perfis de acesso e controle de permissão por operação |

---

## 7. Escopo — o que o sistema **não** fará

Delimitação deliberada. Cada exclusão tem motivo declarado.

| Fora do escopo | Motivo |
|---|---|
| **Emissão de nota fiscal** | Permanece no sistema fiscal externo já em uso. O sistema registra a necessidade de emissão e o número da nota, mas não gera o documento — emissão fiscal exige certificação e homologação fora do alcance de um protótipo. |
| **Contabilidade** | Não substitui o contador nem gera obrigação acessória. O módulo financeiro é gerencial, não contábil. |
| **Folha de pagamento e gestão de pessoal** | Fora do problema de pesquisa. |
| **Reconstituição do histórico financeiro anterior a 2026** | O sistema parte de um marco zero. Dados anteriores servem a análise de tendência, não a conciliação. |
| **Controle de lotes de produção rastreáveis individualmente** | Exigiria disciplina de registro incompatível com a operação atual. O sistema registra atividades de produção agregadas por espécie e recipiente, não leva por leva. |
| **Venda direta ao consumidor final (comércio eletrônico)** | Depende de catálogo, meio de pagamento e logística de varejo. Previsto como evolução, não como entrega do protótipo. |
| **Integração automática com o WhatsApp para fechar pedidos sem intervenção humana** | A negociação por WhatsApp é conduzida por pessoa e assim permanece. O sistema recebe o pedido já negociado. |
| **Aplicativo nativo para Android ou iOS** | O uso móvel é atendido por aplicação web progressiva. Publicação em loja de aplicativos não agrega ao problema de pesquisa e adiciona custo de distribuição. |
| **Funcionamento offline pleno** | O registro em campo funciona sem conexão, com envio posterior. Consultas que dependem de dado agregado exigem conexão. |

---

## 8. Premissas

Condições assumidas como verdadeiras. Se alguma se mostrar falsa, o escopo precisa ser revisto.

| # | Premissa |
|---|---|
| **PR-1** | A equipe fornecerá os dados primários necessários — catálogo de espécies, mapa de recipientes, consumo de insumos, tempos de produção e custos fixos. Sem eles, o sistema funciona vazio. |
| **PR-2** | Os usuários dispõem de celular com navegador atualizado e acesso à internet, ainda que instável. |
| **PR-3** | A chefia manterá a rotina de classificação financeira semanal e o fechamento mensal. |
| **PR-4** | A negociação comercial continuará ocorrendo por WhatsApp, com registro posterior no sistema. |
| **PR-5** | O extrato bancário estará disponível para exportação nos formatos oferecidos pelas instituições. |

---

## 9. Restrições

Limites impostos ao projeto, não escolhidos por ele.

| # | Restrição | Origem | Consequência de projeto |
|---|---|---|---|
| **RE-1** | Usuários sem formação técnica | Perfil da equipe | Interface de uso direto: no máximo cinco campos por tela, listas fechadas em vez de campo aberto, vocabulário do viveiro e não do sistema |
| **RE-2** | Celular como dispositivo principal | Contexto de campo | Concepção orientada ao uso móvel, não adaptação de tela de computador |
| **RE-3** | Conexão instável no viveiro | Ambiente físico | Registro em campo precisa funcionar sem rede, com envio posterior |
| **RE-4** | Uso com as mãos sujas, sob sol e chuva | Ambiente físico | Alvos de toque grandes, contraste alto, resposta visual imediata a cada ação |
| **RE-5** | Orçamento de microempresa | Porte da organização | Adoção de serviços de custo baixo ou nulo; sem licenças proprietárias |
| **RE-6** | Prazo até novembro de 2026 | Calendário acadêmico | Escopo entregue de forma incremental, com projetos priorizados por dependência |
| **RE-7** | Base financeira mistura gasto de negócio e gasto pessoal | Histórico da empresa | Acesso ao financeiro restrito à chefia; separação por centro de custo é pré-requisito de qualquer indicador |
| **RE-8** | Dados pessoais de clientes sujeitos à legislação de proteção de dados | Legal | Tratamento mapeado, acesso controlado e retenção definida |

---

## 10. Critérios de sucesso

Verificáveis. O detalhamento de cada verificação está em
[`E2 — Casos de teste de aceite`](../E-qualidade/E2-casos-de-teste-de-aceite.md).

| # | Critério | Como se verifica |
|---|---|---|
| **CS-1** | Custo unitário apurado para o conjunto inicial de espécies | Comparação do valor calculado pelo sistema com apuração manual independente |
| **CS-2** | Margem por canal visível, com margens negativas destacadas | Relatório de margem exibindo ao menos um caso real de margem negativa antes desconhecido |
| **CS-3** | Registro em campo executável por colaborador sem treinamento formal | Colaborador conclui o registro de uma perda sem auxílio, em observação assistida |
| **CS-4** | Dados persistem e sobrevivem a falha de conexão | Registro feito sem rede aparece no sistema após reconexão |
| **CS-5** | Pedido percorre o ciclo completo dentro do sistema | Um pedido real vai de registro a entrega sem sair para planilha ou papel |
| **CS-6** | Indicadores definidos e apresentados sobre dado real | Painel exibe os indicadores especificados em [`G2`](../G-gestao/G2-fichas-de-indicadores.md) |
| **CS-7** | Usabilidade avaliada segundo os cinco atributos de Nielsen | Aplicação do instrumento definido em [`F3`](../F-ux/F3-plano-avaliacao-usabilidade.md) |

---

## 11. Visão do produto em uma frase

> Para a **chefia, a gerência e os colaboradores do Viveiro Mudar**, que hoje operam sem qualquer
> registro estruturado de produção, custo e venda, o **sistema de gestão do viveiro** é uma
> aplicação web de uso móvel que **captura a informação no ponto em que ela é gerada** e a converte
> em custo apurado, margem visível e previsão de disponibilidade.
> Diferentemente da **planilha de notas fiscais hoje utilizada**, que registra o passado em campos
> genéricos e depende de digitação, o sistema **é alimentado pela própria rotina de trabalho** e
> devolve à operação a informação de que ela precisa para decidir.
