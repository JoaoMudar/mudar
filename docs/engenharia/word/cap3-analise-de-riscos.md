# Capítulo 3, Análise de riscos do projeto

> Gerado a partir de `E-qualidade/E3-analise-de-riscos.md`.
> **Não edite este arquivo**: edite o artefato de origem e rode `npm run docs:tcc`.

---

## 1. Escala adotada

| Probabilidade | Critério |
|---|---|
| **Alta** | Já ocorreu, ou é esperado que ocorra no curso normal do projeto |
| **Média** | Plausível, com precedente em projetos semelhantes |
| **Baixa** | Possível, sem indício de que ocorrerá |

| Impacto | Critério |
|---|---|
| **Crítico** | Inviabiliza o objetivo do trabalho |
| **Alto** | Compromete um resultado, exigindo replanejamento |
| **Médio** | Atrasa ou degrada uma entrega |
| **Baixo** | Absorvido sem alteração de plano |

A **exposição** combina os dois. Riscos de exposição alta têm mitigação obrigatória e declarada; os
demais são monitorados.

---

## 2. Riscos de dados e domínio

### R-01 · Levantamento de dados primários incompleto ou impreciso

| | |
|---|---|
| **Probabilidade** | **Alta** |
| **Impacto** | **Crítico** |
| **Exposição** | **Máxima** |

O sistema depende de dados que **nunca foram medidos**: consumo de substrato por recipiente, tempo de
produção por espécie, custo de coleta de sementes, custos fixos mensais. Não estão em lugar algum a
ser consultado: precisam ser levantados em campo, pela primeira vez, por pessoas ocupadas com a
produção.

Sem eles, o sistema funciona vazio: o custeio não calcula, o preço não se sustenta e o indicador não
tem o que exibir. É o único risco cuja materialização inviabiliza o objetivo geral do trabalho.

**Mitigação:**
- Levantamento conduzido **em paralelo** ao desenvolvimento, e não depois, de modo que o atraso de
  um não bloqueie o outro.
- Aceitação de **estimativa declarada como estimativa** onde a medição não for viável no prazo: o
  tempo de produção entra como valor estimado pela gerência, identificado como tal, e é refinado
  quando o registro de produção acumular histórico.
- Priorização por impacto: custo de substrato e custos fixos afetam todas as espécies e vêm primeiro;
  custo de coleta afeta parte delas e vem depois.

> A estimativa declarada é preferível ao campo vazio. Um custo aproximado revela margem negativa
> grosseira, que é o que se busca; um custo ausente não revela nada.

### R-02 · Dados históricos financeiros inconsistentes

| | |
|---|---|
| **Probabilidade** | **Alta** |
| **Impacto** | **Médio** |
| **Exposição** | **Média** |

A base financeira anterior mistura gasto de negócio com gasto pessoal, contém meses inteiros
ausentes e categorias digitadas à mão. Reconstituí-la consumiria o prazo do trabalho sem produzir
dado confiável.

**Mitigação:** marco zero declarado. O sistema não reconstitui o passado, o histórico anterior serve
a análise de tendência, nunca a conciliação. Registrado como fora de escopo em
[`A1`](../A-fundacao/A1-documento-de-visao.md).

---

## 3. Riscos de processo e pessoas

### R-03 · Viés do pesquisador-gestor

| | |
|---|---|
| **Probabilidade** | **Alta** |
| **Impacto** | **Alto** |
| **Exposição** | **Alta** |

O autor integra a gerência da empresa estudada. A condição é declarada na metodologia como
participante-observador e traz vantagem real de acesso ao domínio, mas cria três riscos concretos,
que convém nomear em vez de deixar implícitos:

1. **Elicitação enviesada**: requisitos derivados da percepção do autor sobre a operação, e não da
   percepção de quem a executa.
2. **Validação complacente**: avaliar a usabilidade de um sistema que se projetou, com usuários que
   são colegas de trabalho, tende a produzir resultado favorável.
3. **Escopo dirigido pela conveniência**: priorizar o que é interessante de construir em vez do que
   é necessário para a empresa.

**Mitigação:**
- **Rastreabilidade de origem.** Todo requisito em [`B2`](../B-requisitos/B2-especificacao-requisitos.md)
  declara sua fonte: observação, entrevista, análise documental ou exigência legal. Requisito sem
  origem externa fica visível como tal.
- **Instrumento de usabilidade definido antes da avaliação**, com métricas objetivas de tempo e
  contagem de erros ([`F3`](../F-ux/F3-plano-avaliacao-usabilidade.md)), em vez de opinião coletada
  ao fim. Tempo de tarefa e número de erros não são complacentes.
- **Critérios de aceite verificáveis por terceiro**, definidos antes da implementação
  ([`E2`](E2-casos-de-teste-de-aceite.md)): em especial a conferência do custo calculado contra
  apuração manual independente.

> Este risco é registrado deliberadamente. Uma banca que o identifique num trabalho que o omite tem
> razão em cobrá-lo; num trabalho que o declara e trata, ele deixa de ser objeção e passa a ser
> rigor metodológico.

### R-04 · Indisponibilidade dos usuários para validação

| | |
|---|---|
| **Probabilidade** | **Média** |
| **Impacto** | **Alto** |
| **Exposição** | **Média** |

A validação exige tempo de três pessoas que respondem pela operação de uma empresa em atividade. A
sazonalidade agrava: em período de plantio, a disponibilidade cai a quase zero.

**Mitigação:** sessões de observação curtas, executadas dentro da rotina real em vez de em ambiente
preparado: o que também melhora a validade do que se observa. Agendamento fora da alta temporada de
expedição.

### R-05 · Rejeição do sistema pela equipe

| | |
|---|---|
| **Probabilidade** | **Média** |
| **Impacto** | **Alto** |
| **Exposição** | **Média** |

A empresa opera há mais de três décadas sem registro estruturado. O sistema acrescenta uma etapa a
uma rotina que hoje não a tem, e uma etapa percebida como burocracia é abandonada na primeira semana
de pressão.

**Mitigação:** os requisitos não funcionais de campo (RNF-01 a RNF-08) existem por esta razão, e não
por preferência estética. O limite de cinco campos, as listas fechadas e a resposta visual imediata
são a contramedida direta a este risco. A decisão de manter o registro de perda em quatro campos, em
vez de cinco, é a aplicação explícita dessa lógica.

---

## 4. Riscos técnicos

### R-06 · Dependência de serviços externos

| | |
|---|---|
| **Probabilidade** | **Média** |
| **Impacto** | **Médio** |
| **Exposição** | **Média** |

O sistema depende de mensageria para cotação, de geocodificação para o mapa de fornecedores e de
emissor externo para a nota fiscal. Nenhum deles é controlado pelo projeto, e todos podem alterar
condições de uso ou indisponibilizar-se.

**Mitigação:** nenhuma função essencial depende de serviço externo. A cotação é registrada no sistema
independentemente do canal de envio; o mapa é conveniência sobre dado que já existe em texto; a nota
fiscal já é emitida fora do sistema, que apenas registra seu número. A perda de qualquer integração
degrada, mas não interrompe.

### R-07 · Perda de dados

| | |
|---|---|
| **Probabilidade** | **Baixa** |
| **Impacto** | **Crítico** |
| **Exposição** | **Média** |

O sistema torna-se, ao longo da implantação, a única fonte de dados que a empresa jamais teve. Perdê-los
significaria perder também o levantamento primário, que não é reproduzível a custo razoável.

**Mitigação:** ver [`E6`](E6-plano-backup-recuperacao.md).

### R-08 · Registro em campo perdido por falha de conexão

| | |
|---|---|
| **Probabilidade** | **Alta** |
| **Impacto** | **Médio** |
| **Exposição** | **Média** |

A conexão no viveiro é instável, e é justamente na área de separação e nos canteiros que ela falha
com mais frequência.

**Mitigação:** fila local de sincronização no dispositivo (RNF-05), com confirmação visual imediata
ao usuário mesmo sem rede. O registro é gravado localmente e enviado depois: o usuário não precisa
saber se havia conexão.

---

## 5. Riscos de projeto

### R-09 · Prazo acadêmico

| | |
|---|---|
| **Probabilidade** | **Média** |
| **Impacto** | **Alto** |
| **Exposição** | **Média** |

O escopo abrange quatro módulos e cerca de vinte e cinco telas, e o prazo termina em novembro de
2026.

**Mitigação:** escopo priorizado por dependência e não por interesse. O custeio é fundacional e vem
primeiro; os subsistemas classificados como *deveria ter* e *poderia ter* em
[`B2`](../B-requisitos/B2-especificacao-requisitos.md) são as candidatas naturais a corte, e a
classificação foi feita **antes** de o prazo apertar, e não durante.

### R-10 · Escopo excessivo para um protótipo

| | |
|---|---|
| **Probabilidade** | **Média** |
| **Impacto** | **Médio** |
| **Exposição** | **Média** |

Trinta e nove entidades e quatro módulos excedem o que se espera de um protótipo acadêmico. O risco
é de largura sem profundidade: muitas telas, nenhuma utilizável.

**Mitigação:** critério declarado de que um subsistema só conta como entregue quando atende a seus
critérios de aceite em [`E2`](E2-casos-de-teste-de-aceite.md). Módulo iniciado e não validado é
registrado como não entregue, e não como entrega parcial.

---

## 6. Matriz consolidada

| Código | Risco | Prob. | Impacto | Exposição |
|---|---|:--:|:--:|:--:|
| **R-01** | Levantamento de dados primários incompleto | Alta | Crítico | **Máxima** |
| **R-03** | Viés do pesquisador-gestor | Alta | Alto | **Alta** |
| **R-02** | Histórico financeiro inconsistente | Alta | Médio | Média |
| **R-04** | Indisponibilidade dos usuários | Média | Alto | Média |
| **R-05** | Rejeição do sistema pela equipe | Média | Alto | Média |
| **R-06** | Dependência de serviços externos | Média | Médio | Média |
| **R-07** | Perda de dados | Baixa | Crítico | Média |
| **R-08** | Registro perdido por falha de conexão | Alta | Médio | Média |
| **R-09** | Prazo acadêmico | Média | Alto | Média |
| **R-10** | Escopo excessivo para um protótipo | Média | Médio | Média |

**Os dois riscos de maior exposição não são técnicos.** R-01 é de disponibilidade de informação que
nunca foi medida, e R-03 é metodológico. Nenhum se resolve escrevendo código: o que é, em si, o
achado mais relevante desta análise para um trabalho cujo produto é software.

---

## 7. Distinção em relação aos riscos de segurança

Este documento trata dos riscos **do projeto**: o que pode impedir que o trabalho alcance seu
objetivo. Os riscos **do sistema em operação** (ameaças, vulnerabilidades e controles) são objeto
de [`E4`](E4-modelagem-de-ameacas.md), com método e escala próprios.

