# Rotina: Financeiro

> **Detalhamento por fase em [`rotina-financeiro/`](rotina-financeiro/)** — comece pela
> [visão geral](rotina-financeiro/00-visao-geral.md).
> Plano de implementação: [`plans/P12-conciliacao-bancaria.md`](../../plans/P12-conciliacao-bancaria.md).

## Situação atual

Gilberto faz NF pelo sistema do Sebrae. Dados de notas ficam em Excel, e as despesas numa
planilha digitada à mão (`DESPESAS AAAA.xls`). Não há controle de margem, custo real ou
faturamento estruturado.

Tentou-se construir BI sobre essa planilha em ago/2026 e a abordagem foi abandonada — o
motivo está medido em [`docs/postmortem-financeiro-bi.md`](../postmortem-financeiro-bi.md).

## Para onde vai (P12)

**O extrato do banco vira a verdade; a planilha vira só a explicação dele.**

As 9 contas (empresa, Gilberto, Glecira) são importadas mês a mês. Cada linha do extrato é
classificada por lista fechada — centro de custo, categoria, contraparte — e o saldo
calculado precisa fechar com o saldo do banco. Nada existe sem passar por uma conta.

- **Marco zero:** 01/01/2026 (jan–jul/2026 primeiro, depois retrocedendo).
- **5 centros de custo:** viveiro, sítio, clínica, casa, floricultura (extinta).
- **35 categorias em 14 grupos**, mais as de entrada.
- **Rotina:** sexta-feira, 5 min para classificar; dia 1, 15 min para fechar o mês.
- **Duas datas por lançamento:** quando o dinheiro saiu (caixa) e a que mês pertence
  (competência) — é a segunda que alimenta o custo por muda.

## Telas por perfil

### Chefia / admin (exclusivo — a base tem gasto pessoal da família e da clínica)
- **Lançamentos**: a fila do extrato; classificar em 3 toques (centro → categoria → quem)
- **Importação de extrato**: sobe o arquivo do banco, não digita
- **Fechamento mensal**: confere saldo calculado × saldo do extrato e trava o mês
- **Configuração**: contas, centros de custo, categorias, regras de classificação
- **Emissão de NF**: segue no sistema do Sebrae — o app registra o número, não emite
- **Faturamento**: visão por período, por cliente, por canal de venda *(só sobre mês fechado)*
- **Margem por espécie**: custo real vs preço de venda por espécie/recipiente *(via P1)*

### Gerência
- **Consulta de preço**: tabela de preços por espécie, recipiente e canal (somente leitura)
- **Sem acesso a `/financeiro`.**
