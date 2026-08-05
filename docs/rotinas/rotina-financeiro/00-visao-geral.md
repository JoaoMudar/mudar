# Financeiro — visão geral

> Como o dinheiro entra no sistema. Escrito em linguagem de negócio, para ser lido por
> quem usa (Gilberto, Débora) e não só por quem programa.
>
> Plano de implementação: [`plans/P12-conciliacao-bancaria.md`](../../../plans/P12-conciliacao-bancaria.md).
> Por que a tentativa anterior falhou: [`docs/postmortem-financeiro-bi.md`](../../postmortem-financeiro-bi.md).

## O problema que isso resolve

Hoje o dinheiro do viveiro vive em três lugares que não conversam: o extrato de 9 contas
bancárias, uma planilha de despesas digitada à mão, e a cabeça do Gilberto. Nenhum dos três
fecha com os outros. Não dá para responder "quanto custou produzir uma muda", "esse pedido
foi pago?" ou "o sítio dá lucro?" sem sentar e somar.

Já se tentou resolver pela planilha. Não funciona, e o motivo está medido no post-mortem:
**a planilha não é uma fonte de dados, é a memória de uma pessoa em forma de grade.**

## A inversão

**O extrato do banco é a verdade. Tudo mais explica o extrato.**

Um gasto que não passou por nenhuma conta não existe para o sistema — e se foi em dinheiro,
entra por uma conta chamada `CAIXA`, que também é uma conta. Isso é o que impede o buraco:
o saldo calculado pelo sistema tem que bater com o saldo que o banco mostra. Se bate, nada
ficou de fora. Se não bate, o sistema aponta onde.

## O que você faz, na prática

### Uma vez por mês, dia 1, 15 minutos

1. **Baixa o extrato** de cada conta no app do banco (arquivo OFX, de preferência).
2. **Importa** no sistema. O arquivo entra inteiro — você não digita nada.
3. **O sistema classifica o que já conhece.** "CELESC" ele já sabe que é Energia da casa,
   porque você ensinou no mês passado.
4. **Sobra uma fila** com o que ele não reconheceu. Cada linha: três toques —
   centro de custo, categoria, com quem foi.
5. **Zerou a fila?** Confere o saldo contra o extrato e **fecha o mês**. Trava.

A fila **encolhe todo mês**, porque cada classificação vira uma regra. É o contrário da
planilha, onde a fila de coisas sem categoria crescia sozinha e nunca zerava.

### No dia a dia

Nada. O financeiro não pede lançamento diário. Ele lê o que o banco já registrou.

## As três perguntas que ele responde

**1. Para onde foi o dinheiro?**
Todo lançamento cai num dos 5 centros de custo — viveiro, sítio, clínica, casa,
floricultura (extinta) — e numa das categorias da lista fechada. Quando um gasto serve a
dois lugares (a energia do imóvel que abriga casa e clínica), ele se divide em partes.

**2. O viveiro dá lucro?**
Somando só os centros de negócio (viveiro + sítio) e comparando com a receita das vendas.
Sem gasto da família entrando por engano — que era um dos furos da planilha: R$48.793 de
gasto pessoal marcado como negócio, e R$63.311 de gasto de negócio marcado como pessoal.

**3. Quanto custa uma muda, de verdade?**
Essa é a mais valiosa e a mais indireta. O custo fixo mensal do viveiro (energia, folha,
contabilidade, combustível) deixa de ser um número digitado de cabeça e passa a ser o que
efetivamente saiu da conta. Esse número alimenta o custeio (P1), que alimenta o preço (P3).

## O que ele NÃO faz

- **Não emite nota fiscal.** A NF continua no sistema do Sebrae. O financeiro registra que
  o dinheiro entrou, não gera o documento.
- **Não é contabilidade.** Não substitui o contador nem gera obrigação fiscal.
- **Não adivinha o passado.** O marco zero é **01/01/2026**. O que veio antes fica no banco
  histórico `notas_despesas` (42.666 linhas, 2003–2026) e serve para tendência, não para
  conciliação.
- **Não mostra número de mês aberto.** Mês pela metade mostra travessão. Um indicador
  calculado sobre mês incompleto leva a decisão errada — foi assim que a planilha produziu
  uma margem falsa de 74,1%.

## Quem vê

**Só chefia e admin.** A base tem gasto pessoal da família e da clínica de fonoaudiologia
misturado ao do viveiro — separá-los é justamente o objetivo, mas até lá (e mesmo depois) o
acesso é restrito. Gerência e colaborador não entram em `/financeiro`.

## Fases desta rotina

| Arquivo | Conteúdo |
|---|---|
| `00-visao-geral.md` | Você está aqui. |
| [`01-cadastro-unico.md`](01-cadastro-unico.md) | O schema `cadastro`: uma identidade por pessoa/empresa. |
| [`02-schema-financeiro.md`](02-schema-financeiro.md) | As tabelas, as listas fechadas e as 7 regras invioláveis. |
| [`03-relacao-com-rotinas.md`](03-relacao-com-rotinas.md) | Como amarra em pedidos, clientes, fornecedores, insumos e custeio. |
