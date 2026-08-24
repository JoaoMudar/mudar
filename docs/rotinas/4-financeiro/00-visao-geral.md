# Financeiro: visão geral

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

Um gasto que não passou por nenhuma conta não existe para o sistema, e se foi em dinheiro,
entra por uma conta chamada `CAIXA`, que também é uma conta. Isso é o que impede o buraco:
o saldo calculado pelo sistema tem que bater com o saldo que o banco mostra. Se bate, nada
ficou de fora. Se não bate, o sistema aponta onde.

## O que você faz, na prática

### Toda sexta-feira, 5 minutos

Classificar o que entrou na semana.

**Por que semanal e não só no fim do mês:** é memória, não preciosismo. Um PIX de R$1.200
para "JOSE M SILVA" você sabe o que foi na terça. No dia 32 você não sabe, vai chutar, ou
jogar em `Outros/Extraordinário`, que é onde a informação morre. A carga total é a mesma; a
qualidade da classificação não é.

### Dia 1 de cada mês, 15 minutos: o fechamento

1. **Baixa o extrato** de cada conta no app do banco (arquivo OFX, de preferência).
2. **Importa** no sistema. O arquivo entra inteiro, você não digita nada.
3. **O sistema classifica o que já conhece.** "CELESC" ele já sabe que é Energia da casa,
   porque você ensinou no mês passado.
4. **Sobra uma fila** com o que ele não reconheceu, pouca coisa, se a rotina de sexta rodou.
   Cada linha: três toques, centro de custo, categoria, com quem foi.
5. **Zerou a fila?** Confere o saldo contra o extrato e **fecha o mês**. Trava.

A fila **encolhe todo mês**, porque cada classificação vira uma regra. É o contrário da
planilha, onde a fila de coisas sem categoria crescia sozinha e nunca zerava.

### No dia a dia

Nada. O financeiro não pede lançamento diário. Ele lê o que o banco já registrou.

## Por que não digitar cada gasto na hora

Empresa organizada faz as duas coisas: lança a nota quando ela chega (vira "contas a pagar")
e usa o extrato como **conferência**. Aqui a ordem se inverte de propósito.

O motivo é que a origem manual já foi testada (a planilha *era* isso) e o resultado está
medido: faltavam R$299 mil só em 2026, com meses inteiros que nunca entraram e linhas
pré-digitadas esperando um valor que nunca chegou.

**Lançamento manual falha por esquecimento, e esquecimento é invisível. Extrato falha por
falta de contexto, e isso é visível**: a linha está lá na tela, pedindo classificação. Entre
um erro que você vê e um que você não vê, escolhe-se o que você vê.

Digitar na origem fica reservado a três casos, onde a falta faz diferença de verdade:
**nota de compra de insumo** (o extrato diz "R$3.400 Agro Comercial", a nota diz 40 sacos a
R$85: é o que vira custo por muda), **gasto parcelado** (uma parcela é 1/12 de uma decisão),
e **pagamento que atravessa o mês**.

## As duas datas de cada gasto

Todo lançamento tem **quando o dinheiro saiu** e **a que mês ele pertence**. Quase sempre é
a mesma coisa, e o sistema preenche sozinho. Mas o substrato comprado em fevereiro, com nota
vencendo em março e pago em abril, é custo de *fevereiro*, foi em fevereiro que ele virou
muda.

Você só mexe nessa segunda data quando ela diverge. Serve para o custo por muda não mentir:
sem isso, um mês de semeadura pesada aparece barato e o mês do pagamento aparece caro.

## As três perguntas que ele responde

**1. Para onde foi o dinheiro?**
Todo lançamento cai num dos 5 centros de custo, viveiro, sítio, clínica, casa,
floricultura (extinta): e numa das categorias da lista fechada. Quando um gasto serve a
dois lugares (a energia do imóvel que abriga casa e clínica), ele se divide em partes.

**2. O viveiro dá lucro?**
Somando só os centros de negócio (viveiro + sítio) e comparando com a receita das vendas.
Sem gasto da família entrando por engano: que era um dos furos da planilha: R$48.793 de
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
  calculado sobre mês incompleto leva a decisão errada, foi assim que a planilha produziu
  uma margem falsa de 74,1%.

## Quem vê: este é o módulo restrito do sistema

**A base bancária é só de chefia e admin.** Ela tem gasto pessoal da família e da clínica de
fonoaudiologia misturado ao do viveiro: separá-los é justamente o objetivo, mas até lá (e
mesmo depois) o acesso é restrito, porque a natureza pessoal do dado não some com a
classificação. Gerência e colaborador não abrem extrato, lançamento, fechamento nem compra.

**A restrição é por recurso, não pela porta do módulo.** Com a reorganização em quatro
módulos, custeio, precificação e os painéis passaram a morar aqui, são dinheiro, e quem os
alimenta é o extrato. Nenhum deles, porém, expõe a base bancária: são números derivados, que
a gerência precisa para operar e sempre pôde ler. A regra completa está em
[`D4 §3.2`](../../engenharia/D-arquitetura/D4-matriz-rbac.md#32-o-núcleo-bancário-do-financeiro-é-exclusivo-da-chefia).

### Telas por perfil

**Chefia / admin**: o módulo inteiro:

- **Lançamentos**: a fila do extrato; classificar em 3 toques (centro → categoria → quem)
- **Importação de extrato**: sobe o arquivo do banco, não digita
- **Compras**: a nota do insumo e a de mudas de terceiros; é aqui que a compra nasce, e é
  daqui que ela fica disponível para a Produção usar
- **Fechamento mensal**: confere saldo calculado × saldo do extrato e trava o mês
- **Custos fixos**: hoje digitados; passam a vir do mês fechado
- **Configuração**: contas, centros de custo, categorias, regras de classificação
- **Emissão de NF**: segue no sistema do Sebrae, o app registra o número, não emite
- **Faturamento e margem**: por período, cliente, canal e espécie *(só sobre mês fechado)*

**Gerência**: só o que é derivado, em leitura:

- **Consulta de preço**: tabela por espécie, recipiente e canal
- **Custo unitário** e **margem por canal**: leitura, sem poder alterar
- **Indicadores operacionais** (IND-01, 02, 03 e 05, conforme
  [`G2 §6`](../../engenharia/G-gestao/G2-fichas-de-indicadores.md))
- **Sem acesso** a extrato, lançamento, compra, custo fixo, fechamento ou faturamento.

**Colaborador**: nada. Não vê custo, preço nem margem (D4 §3.1).

## Fases desta rotina

| Arquivo | Conteúdo |
|---|---|
| `00-visao-geral.md` | Você está aqui. |
| [`01-cadastro-unico.md`](01-cadastro-unico.md) | O schema `cadastro`: uma identidade por pessoa/empresa. |
| [`02-schema-financeiro.md`](02-schema-financeiro.md) | As tabelas, as listas fechadas e as 8 regras invioláveis. |
| [`03-relacao-com-rotinas.md`](03-relacao-com-rotinas.md) | Como amarra em pedidos, clientes, fornecedores, insumos e custeio. |
