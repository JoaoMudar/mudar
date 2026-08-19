# Índice dos artefatos de engenharia

> Para entender a **estrutura de pastas** e o que esperar de cada uma, comece por
> [`README.md`](README.md). Este arquivo é o índice detalhado, com status e destino no TCC.
>
> Vai escrever os capítulos de **elicitação/análise de requisitos** e **regras de negócio**?
> O mapa do material já existente está em
> [`guia-cap-elicitacao-e-regras-de-negocio.md`](guia-cap-elicitacao-e-regras-de-negocio.md).
>
> Documentação formal de engenharia do projeto, produzida como base do **Capítulo 4 (Resultados)**
> do Trabalho de Conclusão de Curso *"Digitalização do fluxo operacional e comercial em viveiros
> florestais: um protótipo de sistema de gestão"* (UNIDAVI, 2026).
>
> Distinção em relação às demais pastas de `docs/`:
> - [`docs/rotinas/`](../rotinas/) — documentação **de domínio**, escrita em linguagem de negócio, para quem opera.
> - `docs/engenharia/` (aqui) — documentação **de engenharia**, formal, para a banca e para quem projeta.
> - [`plans/`](../../plans/) — roadmaps de implementação, registro vivo do progresso.

## Convenção editorial

Os artefatos são redigidos **em tempo de projeto**, como especificação da solução a ser construída.
São documentos de projeto, não relatórios de código.

## Índice dos artefatos

### A — Fundação e escopo

| Código | Artefato | Destino no TCC | Situação |
|---|---|---|---|
| [A1](A-fundacao/A1-documento-de-visao.md) | Documento de Visão | 4.1 Visão geral da solução | ✅ escrito |
| [A2](A-fundacao/A2-glossario-dominio.md) | Glossário do domínio | Apêndice | ✅ escrito |

### B — Engenharia de requisitos

| Código | Artefato | Destino no TCC | Situação |
|---|---|---|---|
| [B2](B-requisitos/B2-especificacao-requisitos.md) | Especificação de Requisitos (ERS) | 4.2 Requisitos do sistema | ✅ escrito — 76 RF, 26 RNF |
| [B3](B-requisitos/B3-regras-de-negocio.md) | Regras de negócio e vínculo com os requisitos | Capítulo de Regras de negócio | ✅ escrito — 55 regras, 73 dos 76 RF vinculados |
| [B5](B-requisitos/B5-matriz-rastreabilidade.md) | Matriz de rastreabilidade | 4.9 + Apêndice | ✅ escrito — revelou 25 lacunas |

### C — Modelagem UML e de dados

| Código | Artefato | Destino no TCC | Situação |
|---|---|---|---|
| [C1](C-modelagem/C1-diagrama-casos-de-uso.md) | Diagrama de casos de uso | 4.3 Modelagem do sistema | ✅ escrito — 44 casos de uso |
| [C2](C-modelagem/C2-especificacao-casos-de-uso.md) | Especificação de casos de uso | 4.3 + Apêndice | ✅ escrito — 8 casos detalhados |
| [C6](C-modelagem/C6-modelo-entidade-relacionamento.md) | MER e DER | 4.4 Modelagem de dados | ✅ escrito — 45 entidades nos quatro módulos |
| [C8](C-modelagem/C8-dicionario-de-dados.md) | Dicionário de dados | 4.4 + Apêndice | ✅ escrito — 45 entidades + 1 visão |

### D — Arquitetura e decisões técnicas

| Código | Artefato | Destino no TCC | Situação |
|---|---|---|---|
| [D1](D-arquitetura/D1-arquitetura-c4.md) | Documento de arquitetura (C4) | 4.5 Arquitetura da solução | ✅ escrito — 3 níveis C4 |
| [D3](D-arquitetura/D3-diagrama-implantacao.md) | Diagrama de implantação | 4.5 Arquitetura da solução | ✅ escrito |
| [D4](D-arquitetura/D4-matriz-rbac.md) | Matriz RBAC | 4.6 Segurança e controle de acesso | ✅ escrito — 31 recursos, agrupados nos quatro módulos |

### E — Qualidade, riscos e segurança

| Código | Artefato | Destino no TCC | Situação |
|---|---|---|---|
| [E2](E-qualidade/E2-casos-de-teste-de-aceite.md) | Casos de teste de aceite | 4.7 + Apêndice | ✅ escrito — 55 casos |
| [E3](E-qualidade/E3-analise-de-riscos.md) | Análise de riscos do projeto | **Capítulo 3** (metodologia) | ✅ escrito — 10 riscos |
| [E4](E-qualidade/E4-modelagem-de-ameacas.md) | Modelagem de ameaças e controles | 4.6 Segurança e controle de acesso | ✅ escrito — 11 ameaças |
| [E5](E-qualidade/E5-mapeamento-lgpd.md) | Mapeamento LGPD | 4.6 + parágrafos novos no Cap. 2.5 | ✅ escrito |
| [E6](E-qualidade/E6-plano-backup-recuperacao.md) | Plano de backup e recuperação | 4.6 + parágrafo novo no Cap. 2.5 | ✅ escrito |

### F — Usabilidade e experiência do usuário

| Código | Artefato | Destino no TCC | Situação |
|---|---|---|---|
| [F3](F-ux/F3-plano-avaliacao-usabilidade.md) | Plano de avaliação de usabilidade | 4.7 Verificação e validação | ✅ escrito |

### G — Gestão do projeto e Business Intelligence

| Código | Artefato | Destino no TCC | Situação |
|---|---|---|---|
| [G2](G-gestao/G2-fichas-de-indicadores.md) | Fichas de indicador (KPI) | 4.8 Indicadores de desempenho | ✅ escrito — 9 indicadores |

---

## Fundamentação teórica por artefato

Cada artefato se apoia em um autor já presente no referencial teórico do TCC. A coluna existe para
que nenhuma afirmação do Capítulo 4 fique sem lastro no Capítulo 2.

| Autor | Fundamenta |
|---|---|
| **Sommerville (2011)** | A1, B2, B5, C1, C2, D1, D3, D4, E4, E6 |
| **Elmasri e Navathe (2011)** | C6, C8 |
| **Pressman e Maxim (2016)** | A1, C1, C2, E3 |
| **Nielsen (1993)** | F3 |
| **Sharda, Delen e Turban (2015)** | G2 |
| **Brasil (2018) — Lei 13.709** | E5 *(referência a acrescentar ao Capítulo 2.5)* |

---

## Ordem de leitura

Para quem chega agora, a sequência que torna os artefatos compreensíveis:

1. **A2** — fixa o vocabulário. Todos os demais o utilizam.
2. **A1** — delimita o problema e o escopo.
3. **B2** — o que o sistema deve fazer.
4. **C1** e **C6** — quem faz o quê, e sobre quais dados.
5. Os demais, em qualquer ordem.
6. **B5** por último — amarra tudo e revela lacunas.

## Ordem de produção

`A2 → A1 → B2 → {C1, C6} → {C2, C8, D1, D3, D4, E2, E3, E4, E5, E6, F3, G2} → B5`

## Entrega para o TCC

A pasta [`word/`](word/) reúne os arquivos destinados ao documento final, na ordem do Capítulo 4,
com os diagramas exportados em imagem. Ver [`word/00-como-montar.md`](word/00-como-montar.md).
