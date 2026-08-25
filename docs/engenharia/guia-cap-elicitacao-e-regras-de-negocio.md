# Guia de escrita: capítulos de *Elicitação e análise de requisitos* e *Regras de negócio*

> Para quem: você, sentando para escrever, sem tempo de reler 3.500 linhas de documentação.
> Não é um artefato de engenharia: é um mapa de onde o material já está e o que ainda falta escrever.

---

## Se você só ler dez linhas

1. **Você não precisa criar conteúdo novo.** Os dois capítulos já existem espalhados; o trabalho é
   recortar, ordenar e dar nome de teoria.
2. **Elicitação** sai de 5 lugares: [`A1`](A-fundacao/A1-documento-de-visao.md) §2, §3, §5 e §9,
   a legenda de origem de [`B2`](B-requisitos/B2-especificacao-requisitos.md) §1, o §5 de `B2`
   (conflitos), o §5 de [`B5`](B-requisitos/B5-matriz-rastreabilidade.md) (lacunas) e as seções
   *"Situação atual"* de [`docs/rotinas/`](../rotinas/).
3. **Regras de negócio** já estão catalogadas: 82 regras em
   [`B3-regras-de-negocio.md`](B-requisitos/B3-regras-de-negocio.md), cada uma com os requisitos que
   ela origina. Foram extraídas de [`A2`](A-fundacao/A2-glossario-dominio.md) (as regras estão dentro
   das definições), dos fluxos **FE/FA** de [`C2`](C-modelagem/C2-especificacao-casos-de-uso.md) e do
   `## Regras de negócio` do [`CLAUDE.md`](../../CLAUDE.md).
4. **A única coisa que só você pode escrever:** quem foi entrevistado, quando, e com que roteiro.
   Isso não está em lugar nenhum do repositório. É o §1 do capítulo de elicitação, comece por ele
   enquanto a memória está fresca.
5. **Não escreva nada dentro de `docs/engenharia/word/`.** Aquela pasta é gerada e apagada a cada
   `npm run docs:tcc`.

---

## A fronteira entre os três capítulos (decore isto)

Sem essa distinção você vai escrever o mesmo conteúdo três vezes: o erro mais comum nesses dois
capítulos.

| Capítulo | Pergunta que responde | Frase típica | Some se o sistema não existir? |
|---|---|---|---|
| **Elicitação e análise** | *Como eu descobri o que o sistema precisa fazer?* | "Trinta e dois requisitos foram levantados por entrevista com a chefia." | Não: descreve o método |
| **Regras de negócio** | *O que o negócio impõe, independentemente de software?* | "O preço não pode cair abaixo do piso mínimo." | **Não**: vale no papel também |
| **4.2 Requisitos** (já escrito) | *O que o sistema deve fazer?* | "O sistema deve impedir que o preço fique abaixo do piso." | **Sim**: desaparece com o sistema |

**Teste de 5 segundos para saber se algo é regra de negócio:** apague mentalmente o sistema. Se a
frase continua verdadeira no viveiro, é regra. Se ela começa com *"O sistema deve"*, é requisito.

Exemplo do par: **RN** "mortalidade acima de 20% é anormal e exige providência" → **RF-29** "o
sistema deve emitir alerta para espécie cuja mortalidade ultrapasse 20%". A regra é do viveiro; o
requisito é a resposta do software a ela.

---

# Parte 1: Elicitação e análise de requisitos

## 1.1 O que já está pronto e onde

| Abra este arquivo | Seção | O que você tira dali |
|---|---|---|
| [`A1-documento-de-visao.md`](A-fundacao/A1-documento-de-visao.md) | §2: O problema | O diagnóstico inicial: ausência de registro, conhecimento na memória de duas pessoas, precificação intuitiva. É o **resultado** da elicitação de contexto |
| `A1` | §5: Stakeholders e usuários | Quem foi ouvido, com quantas pessoas, nível técnico. Inclui os *stakeholders* sem acesso ao sistema (contador, clientes de compensação, órgãos ambientais) e a **declaração de viés do autor** |
| `A1` | §8 (Premissas e §9) Restrições | As 8 restrições **RE-1 a RE-8**: cada uma é um achado de elicitação (usuários sem formação técnica, conexão instável, mãos sujas, base financeira misturada) |
| [`B2-especificacao-requisitos.md`](B-requisitos/B2-especificacao-requisitos.md) | §1 ("Legenda) origem" | **As técnicas de elicitação já estão codificadas**: OP, EN, AD, DOM, LEG, ORG. É o esqueleto da sua seção de técnicas |
| `B2` | §4: Distribuição por prioridade | A priorização MoSCoW: parte da *análise*, não do levantamento |
| `B2` | §5: Conflitos entre requisitos e sua resolução | **O melhor material do capítulo.** Três conflitos reais entre *stakeholders*, com a negociação e o desfecho. É análise de requisitos em estado puro |
| [`B5-matriz-rastreabilidade.md`](B-requisitos/B5-matriz-rastreabilidade.md) | §5: O que a construção desta matriz revelou | **Validação de requisitos**: 25 lacunas encontradas por verificação sistemática, não por acaso |
| [`E3-analise-de-riscos.md`](E-qualidade/E3-analise-de-riscos.md) | risco de viés do autor | O tratamento formal do problema de ser gerente e analista ao mesmo tempo |
| [`docs/rotinas/`](../rotinas/) | seções "Situação atual" / "Fluxo atual" | O **registro do processo como-é**, em linguagem de negócio. `3-comercial/pedidos.md` ("Fluxo atual analógico"), `1-cadastros/00-visao-geral.md` §"O problema", `4-financeiro/00-visao-geral.md` §"Situação atual" |
| [`docs/contexto-projeto.md`](../contexto-projeto.md) | §Formulários de campo | Os princípios de UX derivados da observação em campo |

## 1.2 Tabela pronta: requisitos por técnica de elicitação

Contagem extraída de `B2` (106 RF). Requisitos com duas origens aparecem em ambas as linhas, por isso
a soma dá 113 e não 106.

| Técnica (código em `B2`) | Requisitos funcionais | Leitura |
|---|---:|---|
| **EN**: Entrevista com chefia e gerência | 40 | Técnica dominante: o conhecimento estava na memória das pessoas |
| **OP**: Observação participante | 35 | Segunda maior: o autor integra a operação |
| **ORG**: Política do projeto | 16 | Quase toda em acesso, segurança e fechamento de período |
| **AD**: Análise documental (notas, extratos, planilhas) | 16 | Concentrada no subsistema financeiro e de custeio |
| **LEG**: Exigência legal/fiscal | 4 | Documento fiscal, LGPD, nome científico |
| **DOM**: Estudo do domínio florestal | 2 | Complementar |

Nos **26 requisitos não funcionais** a origem é outra: 13 vêm de política do projeto (**ORG**),
10 derivam diretamente das restrições **RE-1 a RE-5** de `A1`, e 3 de exigência legal (**LEG**).
Ou seja: **os RNF não foram elicitados com os usuários, foram deduzidos das restrições do ambiente.**
Esse é um parágrafo de análise que a banca valoriza.

## 1.3 Esqueleto sugerido do capítulo

| Seção | De onde vem | Você escreve do zero? |
|---|---|---|
| 1. Caracterização do ambiente de elicitação | `A1` §2, §3 + `rotinas/*` "Situação atual" | Não: recorta |
| 2. *Stakeholders* identificados | `A1` §5 (tabela pronta) | Não |
| 3. Técnicas empregadas e justificativa | `B2` §1 legenda + tabela 1.2 acima | Parcial: falta o **como** (ver 1.4) |
| 4. Processo de elicitação (o como-é) | `rotinas/*` + `A1` §2 | Parcial |
| 5. Restrições identificadas | `A1` §9 (RE-1 a RE-8) | Não |
| 6. Análise: priorização MoSCoW | `B2` §4 | Não |
| 7. Análise: conflitos e negociação | `B2` §5 (três conflitos) | Não |
| 8. Validação dos requisitos | `B5` §5 (as lacunas encontradas) + `E2` casos de aceite | Não |
| 9. Ameaças à validade: viés do analista interno | `A1` §5 final + `E3` | Parcial |

## 1.4 O que **não** existe no repositório (a sua lição de casa)

Isto é o único trabalho realmente novo. Nada disso está registrado em nenhum arquivo:

- **Datas e número de sessões** de entrevista e observação.
- **Roteiro das entrevistas**: mesmo que tenham sido conversas semiestruturadas, o roteiro precisa
  ser reconstruído e vai como apêndice.
- **Quais documentos** foram efetivamente analisados na técnica **AD** (`B2` diz "notas de compra,
  registros de custos fixos, planilhas de notas fiscais, extratos bancários", falta período e volume).
- **Instrumento de observação**: havia ficha, caderno, fotos? Como o registro era feito?

> ⚠️ Escreva esta parte **primeiro**, num rascunho bruto de 15 minutos, antes de mexer em qualquer
> outra coisa. É a única informação que existe só na sua cabeça e que ninguém pode recuperar depois.

---

# Parte 2: Regras de negócio

## 2.1 Onde as regras estão escondidas

> ✅ **Já resolvido.** O catálogo completo agora existe em
> [`B3-regras-de-negocio.md`](B-requisitos/B3-regras-de-negocio.md): **82 regras** numeradas
> de RN-01 a RN-90, com oito números vagos de regras que saíram do catálogo, cada uma com
> tipo, onde já estava documentada e os requisitos que ela origina.
> mais as tabelas inversas (RF → RN e RNF → origem). Os mesmos conteúdos, já reduzidos ao formato
> de quadro que vai impresso, estão em [`B4-quadros-tcc.md`](B-requisitos/B4-quadros-tcc.md).
> A subseção abaixo continua útil para conferir se alguma regra escapou.

As regras estavam dissolvidas em cinco lugares:

| Lugar | Como a regra aparece ali |
|---|---|
| [`A2-glossario-dominio.md`](A-fundacao/A2-glossario-dominio.md) | **Dentro da definição.** "Piso mínimo: valor abaixo do qual o preço não pode cair, independentemente de negociação" já é uma regra completa |
| [`C2-especificacao-casos-de-uso.md`](C-modelagem/C2-especificacao-casos-de-uso.md) | Nos fluxos **FE** (exceção) e **FA** (alternativo). Toda exceção existe porque uma regra foi violada, `FE-1 Preço abaixo do piso mínimo` é a regra vista pelo avesso |
| [`CLAUDE.md`](../../CLAUDE.md) §Regras de negócio | A lista curta e canônica, em 6 linhas. **Comece por ela** |
| [`C6`](C-modelagem/C6-modelo-entidade-relacionamento.md) / [`C8`](C-modelagem/C8-dicionario-de-dados.md) | Regras que viraram estrutura: chaves compostas, listas fechadas, restrições `CHECK`. `C6` §5 explica *por que o piso é coluna e não constante*, regra que molda o modelo |
| [`G2`](G-gestao/G2-fichas-de-indicadores.md) e [`D4`](D-arquitetura/D4-matriz-rbac.md) | Limiares e regras de acesso (o 20% de mortalidade; a base bancária restrita à chefia) |

## 2.2 O catálogo: 82 regras, em [`B3`](B-requisitos/B3-regras-de-negocio.md)

As regras estão numeradas de **RN-01 a RN-90**, com oito números vagos (RN-36, RN-49, RN-54,
RN-60, RN-61, RN-63, RN-64 e RN-65 saíram do catálogo e não se reutilizam), e agrupadas em
nove áreas:

| Área | Regras | O que cobre |
|---|---|---|
| A: Domínio e produto | RN-01 a RN-06 | Espécie como centro, nomes populares, recipiente define o produto, ciclo produtivo, muda pronta |
| B: Custeio | RN-07 a RN-12, RN-53, RN-56 | Composição do custo unitário, histórico de preço, competência, valor-hora médio, tarefa sem espécie como custo indireto |
| C: Produção, estoque e perdas | RN-13 a RN-18, RN-48, RN-50 a RN-52, RN-57, RN-74 a RN-90 | Saldo, contagem física, estoque mínimo, causa em lista fechada, mortalidade de 20%, custo da perda, agenda por turno, semana que fecha, o que soma ao estoque; e, desde 24/08/2026, área e canteiro, lote e repicagem, catálogo de tarefas, apontamento e período de trabalho, entrada e saldo de insumo, gasto de tarefa |
| D: Precificação | RN-19 a RN-24, RN-58, RN-59 | Preço = custo + margem, canal, piso mínimo, frete, margem negativa, custo vigente na data, preço que sugere e não impõe |
| E: Cliente e obrigação fiscal | RN-25 a RN-30, RN-55, RN-62 | PF/PJ, cadastro mínimo, identidade única com papéis acumuláveis, nota externa, compensação ambiental, LGPD, endereços |
| F: Pedido, entrega e fornecedor | RN-31 a RN-35, RN-37 a RN-39, RN-66, RN-67 | Ciclo de estados, item genérico, disponibilidade parcial, carga como unidade que sai do viveiro, cotação de fornecedor |
| G: Financeiro | RN-40 a RN-44, RN-68 a RN-73 | Extrato como fonte da verdade, centro de custo e rateio, fechamento do mês, acesso restrito, transferência, entregue ≠ pago, centro de custo como cadastro que se inativa |
| H: Acesso e responsabilidade | RN-45, RN-46 | Perfil determina o acesso; todo registro tem autor |
| I: Indicadores | RN-47 | Indicador sem meta e sem comparação não orienta decisão |

Cada regra em `B3` traz **tipo** (fato, restrição, derivação, acionamento), **onde já estava
documentada** e **quais RF e RNF ela origina**. As tabelas inversas (RF → RN e RNF → origem) estão
nas seções 4 e 5 de lá, e o texto integral dos 106 RF e 26 RNF no apêndice: o arquivo é
autossuficiente para gerar as tabelas do trabalho.

**Dois números que valem parágrafo no capítulo:** 102 dos 106 requisitos funcionais nascem de regra de
negócio, mas apenas 3 dos 26 não funcionais: os outros 23 vêm das restrições do ambiente (RE-1 a
RE-5) ou de política do projeto. As regras determinam **o que** o sistema faz; o ambiente determina
**como** ele precisa ser.

> ⚠️ **Não inclua** no capítulo de regras: "no máximo cinco campos por tela", "funcionar sem
> conexão", "senha cifrada". Essas são **RNF**, restrições do ambiente, não regras do viveiro. Já
> estão em `B2` §3. Aplique o teste de 5 segundos.

## 2.3 Esqueleto sugerido do capítulo

| Seção | Conteúdo |
|---|---|
| 1. Conceito e critério de classificação | O teste "apague o sistema"; a distinção regra × requisito × RNF; os quatro tipos (`B3` §2) |
| 2. Regras de domínio e produto | RN-01 a RN-06 |
| 3. Regras de custeio | RN-07 a RN-12, RN-53, RN-56 |
| 4. Regras de produção, estoque e perdas | RN-13 a RN-18, RN-48, RN-50 a RN-52, RN-57, RN-74 a RN-90 |
| 5. Regras de precificação | RN-19 a RN-24, RN-58, RN-59: a **espinha dorsal do trabalho**, é onde o objetivo OP-3 se realiza |
| 6. Regras de cliente e obrigação fiscal | RN-25 a RN-30, RN-55, RN-62 |
| 7. Regras de pedido, entrega e fornecedor | RN-31 a RN-35, RN-37 a RN-39, RN-66, RN-67 |
| 8. Regras financeiras, de acesso e de indicadores | RN-40 a RN-47, RN-68 a RN-73 |
| 9. Como as regras se refletem no sistema | Tabela RN → RF (`B3` §3 e §4) → onde é verificada (`E2`) |
| 10. Regras implementadas como restrição de dados | `C6`/`C8`: lista fechada, chave composta, `CHECK` |

A seção 9 é a que fecha o capítulo com rigor: mostra que nenhuma regra ficou sem implementação e
nenhuma implementação ficou sem regra: o mesmo raciocínio de `B5`. As quatro exceções (RF-02,
RF-03, RF-07 e RF-72, que não decorrem de regra alguma) estão justificadas em `B3` §6 e valem um
parágrafo.

---

# Parte 3: Como plugar os dois capítulos no TCC

## 3.1 Onde eles entram na numeração

Elicitação **precede** requisitos, e regras de negócio vêm logo depois.

**Metade já foi feita.** Em 19/08/2026 o capítulo de regras de negócio entrou como **4.3** e tudo
que vinha depois deslocou uma casa. É esta a numeração vigente, e é a que `scripts/build-docs-tcc.mjs`
gera hoje:

```
4.1 Visão geral da solução          A1
4.2 Requisitos do sistema           B2
4.3 Regras de negócio               B3   ← entrou em 19/08/2026
4.4 Modelagem do sistema            C1, C2      (era 4.3)
4.5 Modelagem de dados              C6          (era 4.4)
4.6 Arquitetura da solução          D1, D3      (era 4.5)
4.7 Segurança e controle de acesso  D4, E4-E6   (era 4.6)
4.8 Verificação e validação         F3          (era 4.7)
4.9 Indicadores de desempenho       G2          (era 4.8)
4.10 Rastreabilidade                B5          (era 4.9)
```

Mais os apêndices A (glossário), B (dicionário de dados), C (casos de teste) e **D (quadros de
regras e requisitos, de `B4`)**.

**Falta a elicitação.** Quando `B1` existir, ela entra como **4.2** e desloca tudo outra vez.
regras de negócio passa a 4.4, modelagem a 4.5, e assim por diante. Deixar para renumerar uma vez
só não era opção: sem `B3` posicionado, o capítulo de regras não tinha onde ser gerado.

Custo real da renumeração, medido na de 19/08: **uma linha por artefato**. Todas as referências a
"seção 4.x" vivem no cabeçalho `Destino no TCC`; não há nenhuma no corpo dos documentos. Para
localizá-las:

```bash
grep -rn "seção 4\.\|Destino no TCC" docs/engenharia --include=*.md | grep -v /word/
```

E lembre de ajustar o array `SECOES` de `scripts/build-docs-tcc.mjs`, que define o **nome do
arquivo** gerado além do título: renumerar o título sem renumerar o arquivo produz `word/` com
nomes que não batem com o sumário.

## 3.2 Fluxo de trabalho (não fure este)

1. Crie o artefato-fonte que falta em `docs/engenharia/`, seguindo a convenção de códigos:
   - `B-requisitos/B1-elicitacao-e-analise.md`: **o único que falta**; o código `B1` está livre
   - `B-requisitos/B3-regras-de-negocio.md`: **✅ já existe**, com as 82 regras e as tabelas de vínculo
   - `B-requisitos/B4-quadros-tcc.md`: **✅ já existe**, com os 13 quadros formatados para o Word
2. Registre-os em [`scripts/build-docs-tcc.mjs`](../../scripts/build-docs-tcc.mjs), no array
   `SECOES`, na posição correta da ordem: o array define nome de arquivo, título e ordem
   do capítulo.
3. Acrescente a linha em [`00-indice.md`](00-indice.md), com destino e situação.
4. Termo novo entra **primeiro** no glossário `A2`, depois nos outros documentos.
5. Rode `npm run docs:tcc` e monte a partir de [`word/`](word/), nunca editando `word/` à mão.

## 3.3 Fundamentação teórica: o que citar

O projeto já apoia cada artefato em um autor do Capítulo 2 (ver `00-indice.md` §"Fundamentação
teórica"). Para os dois novos:

| Capítulo | Autor já no referencial | O que ele sustenta |
|---|---|---|
| Elicitação e análise | **Sommerville (2011)** | Processo de engenharia de requisitos: elicitação, análise, validação e gestão; conflito entre *stakeholders* resolvido por negociação; classificação de RNF em produto/organizacionais/externos |
| Elicitação e análise | **Pressman e Maxim (2016)** | Priorização negociada; técnicas de levantamento |
| Regras de negócio | **Sommerville (2011)** | Requisitos de domínio: os que decorrem do domínio de aplicação e não do usuário |
| Regras de negócio | **Elmasri e Navathe (2011)** | Regras aplicadas como restrições de integridade no modelo de dados (seção 8 do esqueleto) |

Se for citar autor novo, o Capítulo 2 precisa recebê-lo antes, foi o que se fez com Brasil (2018)
para a LGPD, registrado em [`E5-E6-referencial-cap2.md`](E-qualidade/E5-E6-referencial-cap2.md).

---

# Parte 4: Plano de trabalho em blocos de 25 minutos

Cada bloco é fechado: começa e termina com algo escrito no disco. Não pule o bloco 1.

| # | Bloco | O que fazer | Entregável |
|---|---|---|---|
| 1 | **Memória fresca** | Escreva bruto: datas, participantes e formato das entrevistas e observações; documentos analisados | Rascunho de 1 página (§1.4) |
| 2 | Leitura dirigida | Leia **só** `A1` §2, §5, §9 e `B2` §1 | Nada: só leitura |
| 3 | Elicitação, esqueleto | Crie `B1-elicitacao-e-analise.md` com as 9 seções vazias e cole a tabela 1.2 | Arquivo criado |
| 4 | Elicitação, miolo | Preencha seções 1, 2, 3 e 5 (todas por recorte de `A1`) | Metade do capítulo |
| 5 | Elicitação, análise | Seções 6, 7 e 8: copie os três conflitos de `B2` §5 e as lacunas de `B5` §5 | Capítulo em pé |
| 6 | Elicitação, fechamento | Seção 9 (viés) + revisão de citações | Capítulo fechado |
| 7 | Regras, conferência | Leia `B3` §3 inteiro e confira cada enunciado contra a sua vivência do viveiro, corrigir agora custa uma linha, depois custa uma tabela | `B3` validado |
| 8 | Regras, prosa | Escreva o texto corrido das seções 2 a 8 do esqueleto, uma área por vez, apoiado nas tabelas de `B3` | Capítulo em pé |
| 9 | Regras, seções 9 e 10 | Vínculo RN → RF (tabelas de `B3` §3 e §4) + regras que viraram restrição de dados (`C6`/`C8`) | Capítulo fechado |
| 10 | Integração | Registre no `SECOES`, renumere as seções, rode `npm run docs:tcc` | `word/` regenerado |

## Armadilhas conhecidas

- **`docs/engenharia/word/` é gerada.** Editar lá dentro e rodar `npm run docs:tcc` apaga o trabalho.
- **Não repita `B2`.** Se um parágrafo do capítulo de regras começa com "O sistema deve", ele
  pertence a 4.2 e não aqui.
- **Numeração de RN é estável.** Uma vez atribuída, não se reutiliza, mesma disciplina dos RF
  (`B2` §1).
- **Não cite número de linha neste guia.** As referências deste arquivo apontam para seções (`§4`,
  `§5`), e não para linhas: um artefato que cresce invalida toda citação de linha silenciosamente.
  Foi assim que a versão anterior passou a apontar para o lugar errado em sete lugares.
- **Vários plan files antigos foram escritos para Supabase**, que não é a stack. Se for buscar
  material em `plans/`, leia antes [`docs/auditoria-divergencias.md`](../auditoria-divergencias.md).
- **Regra sem requisito** é sinal de lacuna: ou falta o RF, ou a regra não é do escopo. Foi
  exatamente assim que `B5` encontrou 25 lacunas, vale a pena repetir o exercício.
