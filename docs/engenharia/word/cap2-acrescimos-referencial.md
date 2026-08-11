# Capítulo 2.5 — Acréscimos ao referencial teórico

> Gerado a partir de `E-qualidade/E5-E6-referencial-cap2.md`.
> **Não edite este arquivo** — edite o artefato de origem e rode `npm run docs:tcc`.

---

## Onde entra

| Trecho | Posição sugerida | Motivo |
|---|---|---|
| **2.5.3 Proteção de dados pessoais** | Subseção nova, após 2.5.2 (Autenticação e controle de acesso) | Fundamenta o artefato E5 |
| **Parágrafo sobre continuidade** | Acrescentar ao final de 2.5, antes de 2.5.1 | Fundamenta o artefato E6; complementa o controle de "limitação de exposição e recuperação" que o texto atual já cita de Sommerville |

---

## 2.5.3 Proteção de dados pessoais

> Colar como subseção nova.

A proteção da informação em sistemas que manipulam dados de pessoas identificadas não se restringe a
uma escolha técnica: no ordenamento brasileiro, constitui obrigação legal. A Lei nº 13.709, de 14 de
agosto de 2018, conhecida como Lei Geral de Proteção de Dados Pessoais, dispõe sobre o tratamento de
dados pessoais, inclusive nos meios digitais, com o objetivo de proteger os direitos fundamentais de
liberdade e de privacidade (Brasil, 2018). A lei define dado pessoal como aquele relativo a pessoa
natural identificada ou identificável, e estabelece que todo tratamento deve apoiar-se em uma das
bases legais previstas em seu art. 7º, entre as quais figuram o consentimento do titular, o
cumprimento de obrigação legal ou regulatória, a execução de contrato e o legítimo interesse do
controlador.

Entre os princípios que regem o tratamento, destacam-se, para o projeto de sistemas de informação, os
da **finalidade**, que exige propósito legítimo e específico informado ao titular; da **necessidade**,
que limita a coleta ao mínimo indispensável à finalidade declarada; e da **segurança**, que impõe a
adoção de medidas técnicas aptas a proteger os dados de acessos não autorizados (Brasil, 2018). A lei
reserva ainda proteção reforçada aos **dados pessoais sensíveis**, categoria que abrange, entre
outros, aqueles referentes à saúde, cujo tratamento se sujeita a hipóteses mais restritas previstas
em seu art. 11. Ao titular são assegurados direitos como o de confirmação da existência do
tratamento, acesso, correção, eliminação e oposição, este último especialmente relevante quando o
tratamento se fundamenta no legítimo interesse. Tais exigências repercutem diretamente sobre decisões
de projeto, uma vez que a delimitação dos dados coletados, a definição de prazos de retenção e o
controle de acesso deixam de ser questões de conveniência técnica e passam a ser condição de
conformidade.

---

## Continuidade e recuperação

> Colar ao final da introdução da seção 2.5, logo após o parágrafo que descreve os três tipos de
> controle de segurança de Sommerville.

No que se refere ao terceiro tipo de controle descrito por Sommerville (2011), a limitação de
exposição e recuperação, sua operacionalização depende da definição prévia de objetivos mensuráveis.
Dois indicadores são convencionalmente empregados para essa finalidade: o **objetivo de ponto de
recuperação** (*recovery point objective*), que expressa o volume máximo de dados que se admite
perder, medido como intervalo de tempo desde a última cópia íntegra; e o **objetivo de tempo de
recuperação** (*recovery time objective*), que expressa o prazo máximo aceitável para o
restabelecimento do serviço após uma interrupção. A definição desses valores decorre da criticidade
do sistema e do custo tolerável, e é ela que converte a intenção de proteger em requisito
verificável. Cabe observar, ainda, que uma rotina de cópia de segurança cuja restauração nunca foi
exercitada não constitui controle efetivo, mas hipótese não verificada, razão pela qual o teste
periódico de restauração integra o próprio controle.

---

## Referências a acrescentar

> Inserir em ordem alfabética na seção REFERÊNCIAS.

```
BRASIL. Lei nº 13.709, de 14 de agosto de 2018. Dispõe sobre a proteção de dados pessoais e altera
a Lei nº 12.965, de 23 de abril de 2014 (Marco Civil da Internet). Brasília, DF: Presidência da
República, 2018.
```

A referência a `BRASIL. Lei Complementar nº 123, de 14 de dezembro de 2006` já consta do trabalho;
a nova entrada deve ser posicionada imediatamente após ela, seguindo a ordenação por ano.

---

## Ajuste no sumário

A inclusão de 2.5.3 desloca a numeração das seções seguintes apenas se o sumário for gerado
manualmente. Sendo automático, basta atualizá-lo. As demais subseções de 2.5 permanecem inalteradas:

```
2.5   Segurança da informação
2.5.1 Princípios básicos (confidencialidade, integridade, disponibilidade)
2.5.2 Autenticação e controle de acesso
2.5.3 Proteção de dados pessoais          ← nova
```

