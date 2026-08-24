# Rotina: Centros de custo

> Cadastro do módulo 1 sobre uma tabela do schema `financeiro`. **Quem mantém é o Cadastro,
> quem consome é o Financeiro**, e isso não é contradição: a fronteira de schema existe por
> segurança de acesso, não para declarar dono.
>
> Decisões desta rotina em [`plans/P13-producao-agenda-cadastros.md`](../../../plans/P13-producao-agenda-cadastros.md)
> (T13.24 a T13.27). O consumo está em [`4-financeiro/02-schema-financeiro.md`](../4-financeiro/02-schema-financeiro.md).

## Situação atual

**Não existe.** `financeiro.cost_centers` está especificada em [`C6`](../../engenharia/C-modelagem/C6-modelo-entidade-relacionamento.md) §3.5
e [`C8`](../../engenharia/C-modelagem/C8-dicionario-de-dados.md), e não foi criada: nenhuma
migration a menciona. Os cinco centros (viveiro, sítio, clínica, casa, floricultura) vivem só em
documento, previstos como **seed** da Fase 2 do P12.

Do jeito que estava escrito, a lista era **fechada em código**: acrescentar um centro ou aposentar
outro exigia migration e deploy. [`RN-41`](../../engenharia/B-requisitos/B3-regras-de-negocio.md)
dizia "lista fechada de cinco" e `RF-57` mandava classificar "em lista fechada".

## O problema

A realidade não é fixa. A floricultura já foi extinta, tanto que nasce inativa no seed. O sítio pode
virar arrendamento, a clínica pode mudar de endereço e virar dois centros, e um negócio novo aparece
sem pedir licença ao sistema. Toda vez que isso acontecer, a alternativa era: ou mexer no banco à
mão, ou empurrar o gasto para o centro errado, que é exatamente como a planilha antiga acumulou
R$48.793 de gasto pessoal marcado como negócio (ver [post-mortem](../../postmortem-financeiro-bi.md)).

**O que precisa continuar fechado é a escolha no momento do lançamento**, ninguém digita centro
livre ao classificar um extrato. A lista em si não.

## Para onde vamos

Uma tela `/cadastros/centros-de-custo` onde a chefia cria centro novo e inativa o que acabou.

```
[Criar]      chefia informa nome + natureza (negócio ou pessoal)
                │              └─ código gerado do nome, único e imutável
                ▼
[Usar]       o centro aparece na classificação de lançamento (P12 Fase 4)
                │
                ▼
[Inativar]   sai das escolhas de lançamento novo
             continua no lançamento antigo, que nunca perde seu centro
                │
                ▼
[Reativar]   volta às escolhas, se o destino de gasto ressurgir
```

**Passa na regra de corte do módulo 1** ("é cadastro se, ao apagá-lo, um movimento passado ficar sem
sentido"): lançamento sem centro é lançamento sem natureza. Custo fixo não passa nessa regra e por
isso ficou no Financeiro; centro de custo passa.

## Conceitos importantes

### Natureza: negócio ou pessoal
É o centro de custo que separa um do outro, não há campo de natureza no lançamento. A natureza é
escolhida **na criação** e não muda depois que o centro tem lançamento: alterá-la reescreveria o
passado, movendo gasto entre negócio e pessoal em indicador já apurado.

Enquanto o centro nunca foi usado, a natureza ainda pode ser corrigida, é erro de digitação, não
reescrita de história.

### Código
Slug do nome, minúsculo e sem acento (`viveiro`, `sitio`, `floricultura`), único. **Imutável**: é
por ele que o seed, as regras de classificação e qualquer consulta escrita à mão apontam. Renomear
o centro muda o nome exibido, nunca o código.

### Inativar, não excluir
**Exclusão não existe como operação**, nem na tela nem na matriz de acesso. Centro que nunca foi
usado também só inativa: uma linha a menos na lista não vale a chance de apagar o destino de um
lançamento.

Inativo quer dizer uma coisa só: **não aparece na escolha de lançamento novo**. O centro continua
existindo, continua sendo exibido nos lançamentos que já o têm, e continua entrando nos totais do
período em que foi usado.

### O que a inativação não faz
- Não apaga nem esconde lançamento algum.
- Não impede **reclassificar** um lançamento antigo para aquele centro: quando o backlog retroceder
  até os anos da floricultura, é para lá que aquele gasto vai.
- Não altera indicador de mês já fechado.

## Telas por perfil

### Chefia e administrador (`/cadastros/centros-de-custo`)
- **Lista**: nome, natureza, situação (ativo/inativo), com os inativos ao fim e visivelmente
  marcados.
- **Novo centro**: nome + natureza. Dois campos, o código sai do nome.
- **Editar**: nome sempre; natureza só enquanto o centro não tiver lançamento.
- **Inativar / reativar**: um toque, com confirmação que diz o que vai acontecer ("some das escolhas
  de lançamento novo, continua nos lançamentos antigos").

### Gerência e colaborador
**Não veem a tela nem o atalho no hub de Cadastros.** É o primeiro cadastro do módulo 1 fechado para
a gerência, e o motivo é o mesmo da base bancária ([`D4`](../../engenharia/D-arquitetura/D4-matriz-rbac.md)
§3.2 e §3.12): os centros nomeiam a vida pessoal da família, casa e clínica estão entre eles.

## Dependências com outras rotinas

- **Financeiro** ([`4-financeiro/02-schema-financeiro.md`](../4-financeiro/02-schema-financeiro.md)):
  é quem consome a lista, na classificação (`transactions.cost_center_id`), no rateio
  (`transaction_splits`) e nas regras automáticas (`classification_rules`). A tabela nasce nesta
  rotina e a Fase 2 do P12 não a recria.
- **Cadastro único** ([`00-visao-geral.md`](00-visao-geral.md)): a tela entra na área `/cadastros`,
  no grupo dos cadastros de operação, ao lado de tipos de tarefa.
- **Custeio** (`P1`): o custo mensal do centro `viveiro` é o que alimenta o rateio de custo fixo
  sobre a produção, quando o P12 Fase 6 amarrar os dois.

## Engenharia

| Artefato | O que esta rotina acrescentou |
|---|---|
| [`B3`](../../engenharia/B-requisitos/B3-regras-de-negocio.md) | RN-71 (lista mantida, não fixa), RN-72 (inativa, não exclui), RN-73 (natureza escolhida uma vez); RN-41 emendada |
| [`B2`](../../engenharia/B-requisitos/B2-especificacao-requisitos.md) | RF-77 a RF-79, em §2.2.3; RF-57 emendado |
| [`C1`](../../engenharia/C-modelagem/C1-diagrama-casos-de-uso.md) | UC-45 · Manter centros de custo |
| [`C6`](../../engenharia/C-modelagem/C6-modelo-entidade-relacionamento.md) / [`C8`](../../engenharia/C-modelagem/C8-dicionario-de-dados.md) | `created_at`, `created_by`, `deactivated_at` na entidade |
| [`D4`](../../engenharia/D-arquitetura/D4-matriz-rbac.md) | Recurso **Centros de custo** (C L A para chefia e admin) e a regra §3.12 |
| [`E2`](../../engenharia/E-qualidade/E2-casos-de-teste-de-aceite.md) | TA-56, TA-57 e TA-58 |
