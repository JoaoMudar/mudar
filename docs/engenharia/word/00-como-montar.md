# Como montar o TCC a partir desta pasta

> **Pasta gerada automaticamente.** Não edite nada aqui, edite o artefato de origem em
> `docs/engenharia/` e rode `npm run docs:tcc`. Qualquer edição feita nesta pasta é perdida
> na próxima geração.

Gerado em 2026-08-21 · 16 arquivos · 18 figuras.

## Ordem de colagem no Capítulo 4

1. `4.1-visao-geral-da-solucao.md` → **4.1 Visão geral da solução**
2. `4.2-requisitos.md` → **4.2 Requisitos do sistema**
3. `4.3-regras-de-negocio.md` → **4.3 Regras de negócio**
4. `4.4-modelagem-do-sistema.md` → **4.4 Modelagem do sistema**
5. `4.5-modelagem-de-dados.md` → **4.5 Modelagem de dados**
6. `4.6-arquitetura.md` → **4.6 Arquitetura da solução**
7. `4.7-seguranca-e-controle-de-acesso.md` → **4.7 Segurança e controle de acesso**
8. `4.8-verificacao-e-validacao.md` → **4.8 Verificação e validação**
9. `4.9-indicadores-de-desempenho.md` → **4.9 Indicadores de desempenho**
10. `4.10-rastreabilidade.md` → **4.10 Rastreabilidade**

## Fora do Capítulo 4

- `cap2-acrescimos-referencial.md` → Capítulo 2.5, Acréscimos ao referencial teórico
- `cap3-analise-de-riscos.md` → Capítulo 3, Análise de riscos do projeto

> **`cap2-acrescimos-referencial.md` deve ser colado antes do Capítulo 4.** Os artefatos de LGPD e
> de backup apresentam, nos resultados, conteúdo que o referencial atual não fundamenta. Sem esse
> acréscimo, o Capítulo 4 afirma o que o Capítulo 2 não sustenta.
>
> **`cap3-analise-de-riscos.md` não pertence ao Capítulo 4.** Análise de riscos do projeto é
> elemento de metodologia: cabe como seção nova no Capítulo 3.

## Apêndices

- `apendice-A-glossario.md` → Apêndice A, Glossário do domínio
- `apendice-B-dicionario-de-dados.md` → Apêndice B, Dicionário de dados
- `apendice-C-casos-de-teste.md` → Apêndice C, Casos de teste de aceite
- `apendice-D-quadros.md` → Apêndice D, Quadros de regras de negócio e requisitos

Estes quatro são longos demais para o corpo do texto. A recomendação é apresentar, no capítulo, uma
amostra de duas ou três tabelas e remeter ao apêndice para o restante.

## Figuras

Todas em `img/`, numeradas em sequência contínua (Figura 1 a Figura 18) e já referenciadas no
texto de cada arquivo, com legenda no padrão ABNT abaixo da imagem.

Ao colar no Word:

1. Insira a imagem por **Inserir → Imagens → Este dispositivo**, apontando para o arquivo em `img/`.
2. Aplique **Inserir legenda** na figura, para que o Word mantenha a numeração automática e permita
   gerar a lista de figuras. A legenda já está escrita no texto, use-a como conteúdo.
3. Confira a largura: as imagens foram geradas a 1400 px e devem ser reduzidas à largura da mancha
   de texto.

> A **Lista de Figuras** do trabalho hoje traz apenas os títulos de exemplo. Com 18 figuras,
> ela passa a ser obrigatória: o próprio modelo indica que a lista é exigida acima de cinco figuras.

## Tabelas

As tabelas vêm em Markdown. Ao colar no Word, o formato mais confiável é:

1. Copiar a tabela do arquivo `.md`.
2. No Word, colar como **texto sem formatação**.
3. Selecionar o bloco e usar **Inserir → Tabela → Converter texto em tabela**, com `|` como
   separador.
4. Remover a linha de traços (`|---|---|`), que é sintaxe do Markdown e não conteúdo.

Alternativa mais rápida, se houver Pandoc instalado: converter o arquivo inteiro com
`pandoc arquivo.md -o arquivo.docx` e copiar do resultado.

## Conferência antes de entregar

- [ ] Numeração das figuras contínua e coerente com a Lista de Figuras
- [ ] Todas as tabelas cabem na largura da página, sem corte
- [ ] Figuras legíveis em escala de cinza, caso a impressão seja monocromática
- [ ] Acréscimos ao Capítulo 2.5 colados **antes** do Capítulo 4
- [ ] Referência da Lei nº 13.709/2018 inserida na seção REFERÊNCIAS
- [ ] Análise de riscos posicionada no Capítulo 3, não no 4
