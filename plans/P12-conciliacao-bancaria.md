# P12 — Conciliação bancária e organização financeira

> Substitui a tentativa anterior de BI sobre a planilha (`DESPESAS AAAA.xls`), abandonada
> em 05/08/2026. **Leia o [post-mortem](../docs/postmortem-financeiro-bi.md) antes de
> escrever qualquer linha** — ele mede, com números da base real, por que a planilha não
> pode ser a fonte da verdade.
>
> Origem: conversa João — "encruzilhada organização financeira" (05/08/2026).

**Status: FASE 0 — aguardando as três definições do João.**
**Branch: `feat/conciliacao-bancaria`.**

---

## A ideia em 1 frase

**O extrato do banco vira a verdade. A planilha vira só a explicação dele.**

Hoje é o contrário: tenta-se encaixar a planilha (errada, incompleta) no extrato (real).
Nunca fecha. Invertendo, o erro de digitação e a omissão morrem sozinhos — porque nada
existe se não bater com um movimento do banco.

## As 4 decisões (fechar estas primeiro)

**1. Marco zero.** Escolher uma data (sugestão: **01/01/2026**). Reconcilia 100% dali pra
frente. Passado não se reconstrói à mão — já está no banco `notas_despesas` pra tendência.

**2. Extrato manda.** Todo lançamento nasce do extrato. Nada solto.

**3. Pessoal vs. empresa.**
- Passado → só etiquetar (já está quase pronto: negócio R$3,69M, pessoal R$3,30M).
- Futuro → separar de verdade (uma conta só da empresa; retirada/aporte viram
  transferência marcada).

**4. Chega de digitar categoria.** Tudo vira lista fechada (dropdown). Sem campo aberto =
sem typo.
- Contas: código curto (`BB-PJ`, `SICOOB-01`…).
- Centros de custo: **já existem** em `notas_despesas` (`centros_custo`, 7 registros) —
  só confirmar os 5 que valem.
- Categoria e "de quem" (empresa / pessoal-membro / retirada / aporte): lista fixa.

## Como cada linha do extrato fica

```
data | valor | descrição do banco
+ conta   + centro de custo   + categoria   + de quem
+ liga (ou não) numa despesa/nota já cadastrada
+ status: conciliado | sem-contrapartida | divergente | a-classificar
```

Só se gasta energia no que **não** casou. O resto o sistema casa sozinho.

## Rotina do dia 1 de cada mês (15 min)

1. Baixa o extrato do mês (OFX de preferência).
2. Importa (não digita — o arquivo entra inteiro).
3. Sistema casa automático por valor + data.
4. O que sobrou: classifica no dropdown.
5. Zerou a fila → mês fechado. Trava.

## Sobre exportar mês a mês (o gargalo conhecido)

- É tarefa de 15 min no dia 1, não projeto. Não deixar acumular.
- Backlog: conta principal primeiro, do mês mais recente pra trás, só até o marco zero.
- A checar: Open Finance / agregador pode puxar tudo automático. Vale ver o que os bancos
  oferecem.

## Fases

- [ ] **Fase 0 (João):** listar contas + confirmar os 5 centros de custo + escolher marco zero.
- [ ] **Fase 1:** montar a tabela e importar 1 conta / 1 mês (piloto).
- [ ] **Fase 2:** conciliar o piloto. Medir quanto % bate sozinho.
- [ ] **Fase 3:** virar rotina mensal + puxar histórico até o marco zero, conciliando com
      as planilhas do Excel (`notas_despesas`).

## 3 armadilhas que afundam o plano

1. Fundação frouxa (centros de custo mal definidos) → bagunça de novo.
2. Querer reconciliar a história inteira → desiste no meio. **Marco zero é sagrado.**
3. Rotina não virar hábito → apodrece em 3 meses. Fechamento mensal no calendário.

---

## Próximo passo (só isto)

João define: **lista das contas** + **os 5 centros de custo** + **data do marco zero**.
Com isso monta-se a estrutura e roda o piloto de 1 mês.

## Aproveitável do que já existe

| Item | Onde | Serve pra quê |
|---|---|---|
| `formatCurrency` / `formatDate` / `formatPct` pt-BR | `src/lib/format.ts` | Toda tela de número |
| `ChartCard`, `StatTile`, paleta validada | `src/components/charts/` | Painéis, quando houver o que mostrar |
| Banco histórico (42.666 linhas, 2003–2026) | Postgres local, banco `notas_despesas` | Tendência e conciliação da Fase 3 |
| Regras críticas do banco histórico | `readmeBI.md` | Ler antes de qualquer query nele |
| Por que a abordagem anterior falhou | `docs/postmortem-financeiro-bi.md` | Não repetir |
