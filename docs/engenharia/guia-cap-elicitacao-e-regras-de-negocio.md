# Guia de escrita — capítulos de *Elicitação e análise de requisitos* e *Regras de negócio*

> Para quem: você, sentando para escrever, sem tempo de reler 3.500 linhas de documentação.
> Não é um artefato de engenharia — é um mapa de onde o material já está e o que ainda falta escrever.

---

## Se você só ler dez linhas

1. **Você não precisa criar conteúdo novo.** Os dois capítulos já existem espalhados; o trabalho é
   recortar, ordenar e dar nome de teoria.
2. **Elicitação** sai de 5 lugares: [`A1`](A-fundacao/A1-documento-de-visao.md) §2, §3, §5 e §9,
   a legenda de origem de [`B2`](B-requisitos/B2-especificacao-requisitos.md) §1, o §5 de `B2`
   (conflitos), o §5 de [`B5`](B-requisitos/B5-matriz-rastreabilidade.md) (lacunas) e as seções
   *"Situação atual"* de [`docs/rotinas/`](../rotinas/).
3. **Regras de negócio** saem de 3 lugares: [`A2`](A-fundacao/A2-glossario-dominio.md) (as regras
   estão dentro das definições), os fluxos **FE/FA** de
   [`C2`](C-modelagem/C2-especificacao-casos-de-uso.md) e `## Regras de negócio` do
   [`CLAUDE.md`](../../CLAUDE.md).
4. **A única coisa que só você pode escrever:** quem foi entrevistado, quando, e com que roteiro.
   Isso não está em lugar nenhum do repositório. É o §1 do capítulo de elicitação — comece por ele
   enquanto a memória está fresca.
5. **Não escreva nada dentro de `docs/engenharia/word/`.** Aquela pasta é gerada e apagada a cada
   `npm run docs:tcc`.

---

## A fronteira entre os três capítulos (decore isto)

Sem essa distinção você vai escrever o mesmo conteúdo três vezes — o erro mais comum nesses dois
capítulos.

| Capítulo | Pergunta que responde | Frase típica | Some se o sistema não existir? |
|---|---|---|---|
| **Elicitação e análise** | *Como eu descobri o que o sistema precisa fazer?* | "Trinta e dois requisitos foram levantados por entrevista com a chefia." | Não — descreve o método |
| **Regras de negócio** | *O que o negócio impõe, independentemente de software?* | "O preço não pode cair abaixo do piso mínimo." | **Não** — vale no papel também |
| **4.2 Requisitos** (já escrito) | *O que o sistema deve fazer?* | "O sistema deve impedir que o preço fique abaixo do piso." | **Sim** — desaparece com o sistema |

**Teste de 5 segundos para saber se algo é regra de negócio:** apague mentalmente o sistema. Se a
frase continua verdadeira no viveiro, é regra. Se ela começa com *"O sistema deve"*, é requisito.

Exemplo do par: **RN** "mortalidade acima de 20% é anormal e exige providência" → **RF-29** "o
sistema deve emitir alerta para espécie cuja mortalidade ultrapasse 20%". A regra é do viveiro; o
requisito é a resposta do software a ela.

---

# Parte 1 — Elicitação e análise de requisitos

## 1.1 O que já está pronto e onde

| Abra este arquivo | Seção | O que você tira dali |
|---|---|---|
| [`A1-documento-de-visao.md`](A-fundacao/A1-documento-de-visao.md) | §2 O problema (l. 23-44) | O diagnóstico inicial: ausência de registro, conhecimento na memória de duas pessoas, precificação intuitiva. É o **resultado** da elicitação de contexto |
| `A1` | §5 Stakeholders (l. 75-97) | Quem foi ouvido, com quantas pessoas, nível técnico. Inclui os *stakeholders* sem acesso ao sistema (contador, clientes de compensação, órgãos ambientais) e a **declaração de viés do autor** |
| `A1` | §8 Premissas e §9 Restrições (l. 140-167) | As 8 restrições **RE-1 a RE-8** — cada uma é um achado de elicitação (usuários sem formação técnica, conexão instável, mãos sujas, base financeira misturada) |
| [`B2-especificacao-requisitos.md`](B-requisitos/B2-especificacao-requisitos.md) | §1 "Legenda — origem" (l. 22-31) | **As técnicas de elicitação já estão codificadas**: OP, EN, AD, DOM, LEG, ORG. É o esqueleto da sua seção de técnicas |
| `B2` | §4 Distribuição por prioridade (l. 235-250) | A priorização MoSCoW — parte da *análise*, não do levantamento |
| `B2` | §5 Conflitos e resolução (l. 254-263) | **O melhor material do capítulo.** Três conflitos reais entre *stakeholders*, com a negociação e o desfecho. É análise de requisitos em estado puro |
| [`B5-matriz-rastreabilidade.md`](B-requisitos/B5-matriz-rastreabilidade.md) | §5 O que a matriz revelou (l. 197-251) | **Validação de requisitos**: 25 lacunas encontradas por verificação sistemática, não por acaso |
| [`E3-analise-de-riscos.md`](E-qualidade/E3-analise-de-riscos.md) | risco de viés do autor | O tratamento formal do problema de ser gerente e analista ao mesmo tempo |
| [`docs/rotinas/`](../rotinas/) | seções "Situação atual" / "Fluxo atual" | O **registro do processo como-é**, em linguagem de negócio. `rotina-pedidos.md` l. 3 ("Fluxo atual analógico"), `rotina-cadastros.md` §"O problema", `rotina-financeiro.md` §"Situação atual" |
| [`docs/contexto-projeto.md`](../contexto-projeto.md) | §Formulários de campo | Os princípios de UX derivados da observação em campo |

## 1.2 Tabela pronta — requisitos por técnica de elicitação

Contagem extraída de `B2` (68 RF). Requisitos com duas origens aparecem em ambas as linhas, por isso
a soma passa de 68.

| Técnica (código em `B2`) | Requisitos funcionais | Leitura |
|---|---:|---|
| **EN** — Entrevista com chefia e gerência | 28 | Técnica dominante: o conhecimento estava na memória das pessoas |
| **OP** — Observação participante | 22 | Segunda maior: o autor integra a operação |
| **AD** — Análise documental (notas, extratos, planilhas) | 10 | Concentrada no subsistema financeiro e de custeio |
| **ORG** — Política do projeto | 8 | Quase toda em acesso e segurança |
| **LEG** — Exigência legal/fiscal | 4 | Documento fiscal, LGPD, nome científico |
| **DOM** — Estudo do domínio florestal | 1 | Complementar |

Nos **26 requisitos não funcionais** a origem é outra: 13 vêm de política do projeto (**ORG**),
10 derivam diretamente das restrições **RE-1 a RE-5** de `A1`, e 3 de exigência legal (**LEG**).
Ou seja: **os RNF não foram elicitados com os usuários — foram deduzidos das restrições do ambiente.**
Esse é um parágrafo de análise que a banca valoriza.

## 1.3 Esqueleto sugerido do capítulo

| Seção | De onde vem | Você escreve do zero? |
|---|---|---|
| 1. Caracterização do ambiente de elicitação | `A1` §2, §3 + `rotinas/*` "Situação atual" | Não — recorta |
| 2. *Stakeholders* identificados | `A1` §5 (tabela pronta) | Não |
| 3. Técnicas empregadas e justificativa | `B2` §1 legenda + tabela 1.2 acima | Parcial — falta o **como** (ver 1.4) |
| 4. Processo de elicitação (o como-é) | `rotinas/*` + `A1` §2 | Parcial |
| 5. Restrições identificadas | `A1` §9 (RE-1 a RE-8) | Não |
| 6. Análise: priorização MoSCoW | `B2` §4 | Não |
| 7. Análise: conflitos e negociação | `B2` §5 (três conflitos) | Não |
| 8. Validação dos requisitos | `B5` §5 (25 lacunas) + `E2` casos de aceite | Não |
| 9. Ameaças à validade — viés do analista interno | `A1` §5 final + `E3` | Parcial |

## 1.4 O que **não** existe no repositório (a sua lição de casa)

Isto é o único trabalho realmente novo. Nada disso está registrado em nenhum arquivo:

- **Datas e número de sessões** de entrevista e observação.
- **Roteiro das entrevistas** — mesmo que tenham sido conversas semiestruturadas, o roteiro precisa
  ser reconstruído e vai como apêndice.
- **Quais documentos** foram efetivamente analisados na técnica **AD** (`B2` diz "notas de compra,
  registros de custos fixos, planilhas de notas fiscais, extratos bancários" — falta período e volume).
- **Instrumento de observação**: havia ficha, caderno, fotos? Como o registro era feito?

> ⚠️ Escreva esta parte **primeiro**, num rascunho bruto de 15 minutos, antes de mexer em qualquer
> outra coisa. É a única informação que existe só na sua cabeça e que ninguém pode recuperar depois.

---

# Parte 2 — Regras de negócio

## 2.1 Onde as regras estão escondidas

Não existe um artefato de regras de negócio. Elas estão dissolvidas em cinco lugares:

| Lugar | Como a regra aparece ali |
|---|---|
| [`A2-glossario-dominio.md`](A-fundacao/A2-glossario-dominio.md) | **Dentro da definição.** "Piso mínimo: valor abaixo do qual o preço não pode cair, independentemente de negociação" já é uma regra completa |
| [`C2-especificacao-casos-de-uso.md`](C-modelagem/C2-especificacao-casos-de-uso.md) | Nos fluxos **FE** (exceção) e **FA** (alternativo). Toda exceção existe porque uma regra foi violada — `FE-1 Preço abaixo do piso mínimo` é a regra vista pelo avesso |
| [`CLAUDE.md`](../../CLAUDE.md) §Regras de negócio | A lista curta e canônica, em 6 linhas. **Comece por ela** |
| [`C6`](C-modelagem/C6-modelo-entidade-relacionamento.md) / [`C8`](C-modelagem/C8-dicionario-de-dados.md) | Regras que viraram estrutura: chaves compostas, listas fechadas, restrições `CHECK`. `C6` §5 explica *por que o piso é coluna e não constante* — regra que molda o modelo |
| [`G2`](G-gestao/G2-fichas-de-indicadores.md) e [`D4`](D-arquitetura/D4-matriz-rbac.md) | Limiares e regras de acesso (o 20% de mortalidade; o financeiro restrito à chefia) |

## 2.2 Inventário inicial — 19 regras já documentadas

Ponto de partida do capítulo. Numeração **RN-xx** proposta aqui (não existe ainda no projeto).
A coluna *Requisito* mostra por onde o sistema a implementa — é o que amarra este capítulo ao 4.2.

| RN | Enunciado (linguagem de negócio) | Onde já está | Requisito |
|---|---|---|---|
| RN-01 | Toda informação de produção, custo e venda se organiza em torno da **espécie** | `C6` §1; `CLAUDE.md` | RF-08 |
| RN-02 | O **recipiente** define o tamanho da muda; custo e preço existem por par espécie + recipiente | `A2` §2; `C8` `production_costs` | RF-10, RF-15 |
| RN-03 | O preço de venda é **custo real + margem do canal** | `A2` §3 "Preço" | RF-31, RF-32 |
| RN-04 | Nenhuma venda ocorre abaixo do **piso mínimo**, independentemente da negociação | `A2`; `C2` UC-26 FE-1 | RF-33 |
| RN-05 | O piso mínimo varia por canal e por espécie — não é constante única | `C6` §5 (l. 691) | RF-33 |
| RN-06 | O **frete** é calculado por R$/km e incorporado ao preço, não cobrado à parte | `A2` §3 "Frete" | RF-34 |
| RN-07 | O **canal de venda** é lista fechada de cinco; atacado é o padrão | `A2` §3; `C2` UC-24 passo 4 | RF-31 |
| RN-08 | Mortalidade acima de **20%** é anormal e exige providência | `A2` l. 43; `G2`; `C2` UC-17 FA-1 | RF-28, RF-29 |
| RN-09 | A causa da perda pertence a uma lista fechada — não há causa em texto livre | `A2`; `RNF-02` | RF-26 |
| RN-10 | O cliente pode comprar **quantidade sem espécie definida** (item genérico), e o viveiro escolhe as espécies | `A2` §3 "Item genérico" | RF-66 |
| RN-11 | No item genérico, o cliente pode restringir as espécies aceitas; espécie fora da lista não atende o item | `A2`; `C2` UC-25 FE-1 | RF-67 |
| RN-12 | Um pedido pode ser atendido **parcialmente** — disponibilidade não é tudo ou nada | `A2` §3; `C2` UC-25 FA-1 | RF-43 |
| RN-13 | Pode-se ofertar recipiente diferente do pedido, desde que registrado qual | `C2` UC-25 FA-2 | RF-68 |
| RN-14 | O preço do pedido depende de **aprovação da chefia** antes do fechamento | `C2` UC-26 | RF-44 |
| RN-15 | Pedido que exige nota fiscal só fecha com cadastro fiscal completo do cliente | `C2` UC-26 FA-1; `RNF-24` | RF-37, RF-40 |
| RN-16 | Venda para compensação ambiental exige o **nome científico** da espécie | `A2` §3; `RNF-25` | RF-08 |
| RN-17 | Custo se apura por **competência**, não por data de pagamento | `B2` RF-59 | RF-59 |
| RN-18 | Indicador financeiro só é confiável sobre **mês fechado**; mês fechado não aceita alteração | `B2` RF-60, RF-61 | RF-60, RF-61 |
| RN-19 | A mesma pessoa pode ser cliente e fornecedor — a identidade é única | `A2` §3 "Cliente"; [`rotina-cadastros.md`](../rotinas/rotina-cadastros.md) §Identidade única | — |

Duas regras adicionais que valem um parágrafo próprio, porque são **decisões de negócio tomadas
durante o projeto**, e não práticas herdadas — estão em `B2` §5:

- Mão de obra entra no custo por **tempo médio estimado por atividade**, não por apontamento
  individual de horas. Precisão suficiente para revelar margem negativa, sem impor controle de ponto.
- O acesso ao financeiro é **restrito à chefia** porque a base mistura gasto de negócio e gasto
  pessoal (`RE-7` em `A1` §9) — é regra de negócio, não preferência de segurança.

> ⚠️ **Não inclua** no capítulo de regras: "no máximo cinco campos por tela", "funcionar sem
> conexão", "senha cifrada". Essas são **RNF** — restrições do ambiente, não regras do viveiro. Já
> estão em `B2` §3. Aplique o teste de 5 segundos.

## 2.3 Esqueleto sugerido do capítulo

| Seção | Conteúdo |
|---|---|
| 1. Conceito e critério de classificação | O teste "apague o sistema"; a distinção regra × requisito × RNF |
| 2. Regras de produção e custeio | RN-01, RN-02, RN-17 |
| 3. Regras de precificação | RN-03 a RN-07 — a **espinha dorsal do trabalho**, é onde o objetivo OP-3 se realiza |
| 4. Regras de perdas | RN-08, RN-09 |
| 5. Regras comerciais e de pedido | RN-10 a RN-16 |
| 6. Regras financeiras e de acesso | RN-18, RN-19 + as duas decisões de projeto |
| 7. Como as regras se refletem no sistema | Tabela RN → RF → onde é verificada (`E2`) |
| 8. Regras implementadas como restrição de dados | `C6`/`C8`: lista fechada, chave composta, `CHECK` |

A seção 7 é a que fecha o capítulo com rigor: mostra que nenhuma regra ficou sem implementação e
nenhuma implementação ficou sem regra — o mesmo raciocínio de `B5`.

---

# Parte 3 — Como plugar os dois capítulos no TCC

## 3.1 Onde eles entram na numeração

Elicitação **precede** requisitos, e regras de negócio vêm logo depois. A ordem defensável é:

```
4.1 Visão geral da solução          (mantém)
4.2 Elicitação e análise de requisitos   ← NOVO
4.3 Requisitos do sistema           (era 4.2)
4.4 Regras de negócio                    ← NOVO
4.5 Modelagem do sistema            (era 4.3)
4.6 Modelagem de dados              (era 4.4)
4.7 Arquitetura da solução          (era 4.5)
4.8 Segurança e controle de acesso  (era 4.6)
4.9 Verificação e validação         (era 4.7)
4.10 Indicadores de desempenho      (era 4.8)
4.11 Rastreabilidade                (era 4.9)
```

Custo da renumeração: **16 referências** do tipo "seção 4.x" no corpo dos artefatos e **19 cabeçalhos**
com `Destino no TCC`. Para localizar todas:

```bash
grep -rn "seção 4\.\|Destino no TCC" docs/engenharia --include=*.md | grep -v /word/
```

Alternativa mais barata, se o prazo apertar: pendurar os dois capítulos como **4.10 e 4.11**, sem
renumerar nada. Funciona, mas fica ruim de ler — elicitação depois de rastreabilidade inverte a
ordem lógica do trabalho. Recomendação: renumere.

## 3.2 Fluxo de trabalho (não fure este)

1. Crie os artefatos-fonte em `docs/engenharia/`, seguindo a convenção de códigos:
   - `B-requisitos/B1-elicitacao-e-analise.md` (os códigos B1, B3 e B4 estão livres)
   - `B-requisitos/B3-regras-de-negocio.md`
2. Registre-os em [`scripts/build-docs-tcc.mjs`](../../scripts/build-docs-tcc.mjs), no array
   `SECOES` (l. 31), na posição correta da ordem — o array define nome de arquivo, título e ordem
   do capítulo.
3. Acrescente as duas linhas em [`00-indice.md`](00-indice.md), com destino e situação.
4. Termo novo entra **primeiro** no glossário `A2`, depois nos outros documentos.
5. Rode `npm run docs:tcc` e monte a partir de [`word/`](word/) — nunca editando `word/` à mão.

## 3.3 Fundamentação teórica — o que citar

O projeto já apoia cada artefato em um autor do Capítulo 2 (ver `00-indice.md` §"Fundamentação
teórica"). Para os dois novos:

| Capítulo | Autor já no referencial | O que ele sustenta |
|---|---|---|
| Elicitação e análise | **Sommerville (2011)** | Processo de engenharia de requisitos: elicitação, análise, validação e gestão; conflito entre *stakeholders* resolvido por negociação; classificação de RNF em produto/organizacionais/externos |
| Elicitação e análise | **Pressman e Maxim (2016)** | Priorização negociada; técnicas de levantamento |
| Regras de negócio | **Sommerville (2011)** | Requisitos de domínio — os que decorrem do domínio de aplicação e não do usuário |
| Regras de negócio | **Elmasri e Navathe (2011)** | Regras aplicadas como restrições de integridade no modelo de dados (seção 8 do esqueleto) |

Se for citar autor novo, o Capítulo 2 precisa recebê-lo antes — foi o que se fez com Brasil (2018)
para a LGPD, registrado em [`E5-E6-referencial-cap2.md`](E-qualidade/E5-E6-referencial-cap2.md).

---

# Parte 4 — Plano de trabalho em blocos de 25 minutos

Cada bloco é fechado: começa e termina com algo escrito no disco. Não pule o bloco 1.

| # | Bloco | O que fazer | Entregável |
|---|---|---|---|
| 1 | **Memória fresca** | Escreva bruto: datas, participantes e formato das entrevistas e observações; documentos analisados | Rascunho de 1 página (§1.4) |
| 2 | Leitura dirigida | Leia **só** `A1` §2, §5, §9 e `B2` §1 | Nada — só leitura |
| 3 | Elicitação, esqueleto | Crie `B1-elicitacao-e-analise.md` com as 9 seções vazias e cole a tabela 1.2 | Arquivo criado |
| 4 | Elicitação, miolo | Preencha seções 1, 2, 3 e 5 (todas por recorte de `A1`) | Metade do capítulo |
| 5 | Elicitação, análise | Seções 6, 7 e 8 — copie os três conflitos de `B2` §5 e as lacunas de `B5` §5 | Capítulo em pé |
| 6 | Elicitação, fechamento | Seção 9 (viés) + revisão de citações | Capítulo fechado |
| 7 | Regras, esqueleto | Crie `B3-regras-de-negocio.md` e cole o inventário 2.2 | Arquivo criado |
| 8 | Regras, revisão do inventário | Confira cada RN contra `A2` e `C2`; corrija enunciados; aplique o teste de 5 segundos | Inventário validado |
| 9 | Regras, seção 7 e 8 | Tabela RN → RF → verificação; regras que viraram restrição de dados | Capítulo fechado |
| 10 | Integração | Registre no `SECOES`, renumere as seções, rode `npm run docs:tcc` | `word/` regenerado |

## Armadilhas conhecidas

- **`docs/engenharia/word/` é gerada.** Editar lá dentro e rodar `npm run docs:tcc` apaga o trabalho.
- **Não repita `B2`.** Se um parágrafo do capítulo de regras começa com "O sistema deve", ele
  pertence a 4.2 e não aqui.
- **Numeração de RN é estável.** Uma vez atribuída, não se reutiliza — mesma disciplina dos RF
  (`B2` §1).
- **Vários plan files antigos foram escritos para Supabase**, que não é a stack. Se for buscar
  material em `plans/`, leia antes [`docs/auditoria-divergencias.md`](../auditoria-divergencias.md).
- **Regra sem requisito** é sinal de lacuna: ou falta o RF, ou a regra não é do escopo. Foi
  exatamente assim que `B5` encontrou 25 lacunas — vale a pena repetir o exercício.
