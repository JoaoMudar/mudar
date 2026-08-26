# Documentação de engenharia

Documentos formais de engenharia de software do projeto. São a base do **Capítulo 4 (Resultados)** do TCC.

> Procurando o índice completo, com status e destino de cada artefato no TCC?
> Está em [`00-indice.md`](00-indice.md).

## A diferença entre esta pasta e as outras

| Pasta | O que é | Escrito para |
|---|---|---|
| [`docs/rotinas/`](../rotinas/) | Como o viveiro funciona, em linguagem de negócio | Quem opera: Gilberto, Débora |
| **`docs/engenharia/`** (aqui) | Como o sistema é projetado, em linguagem formal | A banca e quem projeta |
| [`plans/`](../../plans/) | O que falta implementar, task por task | Quem está codando agora |

Se você quer saber **o que o viveiro faz**, vá para `rotinas/`.
Se quer saber **como o sistema foi pensado**, é aqui.

## Estrutura

```
docs/engenharia/
├── README.md        ← você está aqui
├── 00-indice.md     ← índice completo, com status
│
├── A-fundacao/      Por que o sistema existe e o que ele é
├── B-requisitos/    O que ele deve fazer
├── C-modelagem/     Quem faz o quê, sobre quais dados
├── D-arquitetura/   Como ele é construído
├── E-qualidade/     Como saber se está certo e seguro
├── F-ux/            Como saber se é usável
├── G-gestao/        Como medir se está funcionando
│
└── word/            GERADA: não edite nada aqui
```

## O que esperar de cada pasta

### `A-fundacao/`: o ponto de partida
O problema, o escopo e o vocabulário. **Leia primeiro.** O glossário fixa os termos que todos os outros documentos usam: sem ele, "recipiente", "canal" e "item genérico" viram palavras vagas.

- Documento de Visão: problema, objetivos, o que está **dentro e fora** do escopo, premissas e restrições
- Glossário do domínio: cada termo do viveiro com uma definição só

### `B-requisitos/`: o que o sistema deve fazer
O coração da especificação. Cada requisito tem identificador, prioridade, de onde veio e como se verifica.

- Especificação de Requisitos: 76 funcionais e 26 não funcionais
- Regras de negócio: 103 regras, cada uma com o tipo e os requisitos que ela origina. É o que vale no viveiro **exista ou não o software**; se o enunciado começa com "o sistema deve", ele pertence à especificação, não aqui
- Quadros de regras e requisitos: os mesmos conteúdos reduzidos a duas ou quatro colunas, prontos para colar no Word. **Transcrição, não fonte**
- Matriz de rastreabilidade: liga cada requisito ao caso de uso, à entidade, à permissão e ao teste. **Construída por último**, porque é ela que revela o que ficou faltando

### `C-modelagem/`: quem faz o quê, sobre quais dados
Os diagramas UML e o modelo de dados.

- Diagrama de casos de uso: 59 casos, por ator
- Especificação de casos de uso: os 12 críticos, com fluxos alternativos e exceções
- MER e DER: 62 entidades, nos quatro módulos, com a espécie no centro
- Dicionário de dados: cada coluna de cada tabela, explicada em português

### `D-arquitetura/`: como o sistema é construído
As decisões técnicas e suas consequências.

- Arquitetura C4: contexto, contêineres e componentes, amarrados às 3 camadas de Sommerville
- Diagrama de implantação: onde cada coisa roda, e como se publica
- Matriz RBAC: quem pode fazer o quê, com as exceções justificadas

### `E-qualidade/`: como saber se está certo e seguro
Verificação, riscos e segurança.

- Casos de teste de aceite: 85 casos, executados pelos próprios usuários
- Análise de riscos: do **projeto**, não do sistema. Vai para o Capítulo 3, não o 4
- Modelagem de ameaças: do **sistema em operação**. Ativo → ameaça → controle
- Mapeamento LGPD: quais dados pessoais, para quê, por quanto tempo
- Plano de backup e recuperação: o que se perde, e em quanto tempo se recupera
- Acréscimos ao referencial: texto novo para o Capítulo 2.5, exigido pelos dois anteriores

### `F-ux/`: como saber se é usável
- Plano de avaliação de usabilidade: transforma os 5 atributos de Nielsen em números que se coletam com cronômetro e ficha de papel

### `G-gestao/`: como medir se está funcionando
- Fichas de indicadores: 9 KPIs com fórmula, fonte, meta, faixas e responsável

### `word/`: a entrega para o TCC
**Pasta gerada. Não edite nada aqui.** É apagada e recriada a cada geração.

Contém os arquivos já na ordem do Capítulo 4, com os diagramas exportados em PNG (o Word não renderiza Mermaid) e legendas ABNT prontas. Comece por `word/00-como-montar.md`.

Para regerar depois de mexer em qualquer artefato:

```bash
npm run docs:tcc
```

## Duas regras

**1. Termo novo entra no glossário primeiro.** Depois nos outros documentos. É o que impede que a mesma coisa tenha três nomes.

**2. Nada existe sem requisito que o justifique.** Entidade nova, caso de uso novo, tela nova: todos apontam para um requisito em `B-requisitos/`. Se não apontam, ou falta o requisito, ou a coisa não deveria existir. A matriz de rastreabilidade é o que verifica isso.
