# P15: Protocolo de atividades por lote

> Origem: conversa João (26/08/2026), especificação do módulo novo.
> Domínio em [`docs/rotinas/2-producao/06-protocolo-de-atividades.md`](../docs/rotinas/2-producao/06-protocolo-de-atividades.md).

**Status: engenharia concluída (26/08/2026). Nenhuma migration, nenhuma Server Action, nenhuma tela.**

> **Este plano começa onde o P14 ainda não chegou.** O P14 tem banco pronto e nenhuma tela; este
> tem **nem banco nem tela**, e é de propósito: o módulo depende de um motor de geração automática,
> e a regra de contagem atravessa tabela, visão e Server Action. Modelar depois de construir
> custaria reescrevê-la em três lugares.

---

## A ideia em 1 frase

**O lote passa a cobrar sozinho o que tem de receber**, seguindo uma receita de manejo por tipo de
embalagem que gera as tarefas na agenda nas datas certas.

---

## O problema que ele resolve

A `docs/rotinas/2-producao/01-agenda-de-pessoal.md` já nomeava: *"esquecimento é invisível: se a
irrigação do canteiro 4 não foi feita, só se descobre pela muda morta"*. A agenda registra o que a
Débora lembrou de lançar, e `batch_health` deriva a cor do atraso das tarefas **lançadas**: o lote
esquecido por completo aparece **verde**. A tela que existe para mostrar o esquecimento mostra hoje
o contrário dele.

---

## As 6 decisões (fechadas em 26/08/2026)

### 1. A contagem é da execução real, nunca de calendário fixo
Lote limpo em 15/09 com intervalo de 3 meses vence em **14/12**, e não em julho nem em outubro.
Calendário fixo acumularia vencidas e produziria uma nova quinze dias depois de o canteiro ser
limpo (RN-100).

### 2. Uma etapa tem no máximo uma ocorrência em aberto
Vermelho de três dias e vermelho de cinco meses são a **mesma** pendência, mais velha. É o que
impede a lista de pendências de virar ruído (RN-101).

### 3. A âncora é declarada, e não é a etapa anterior
"Classificar pós-germinação" ancora na conclusão de "Plantar no tubete", que pode estar várias
posições atrás. Inferir pela ordem mandaria classificar muda que ainda não nasceu (RN-99).

### 4. Sem cron: geração preguiçosa movida a evento
Mesmo padrão de `assignments_uma_ocorrencia_por_dia`, e a decisão de não criar cron está registrada
na migration `20260826000003`.

### 5. A ordem é `assignments` comum, com `protocol_step_id`
Espelha `recurrence_id`. Agenda, Gantt, apontamento e tela do colaborador não aprendem conceito
novo (RN-111).

### 6. A etapa sequencial comanda `batches.stage`
Via `resulting_stage` declarado na etapa. Uma verdade só sobre a fase do lote (RN-102).

---

## Impacto nos documentos de engenharia (TCC)

Todos já aplicados em 26/08/2026.

| Doc | O que mudou | Gravidade |
|---|---|---|
| `rotinas/2-producao/06` | documento novo: domínio, decisões, motor e prova de mesa | 🔴 alta |
| `B2` | RF-121 a RF-136; §2.3.8 nova; RF-84 e RF-90 emendados pela nota de RF-136 | 🔴 alta |
| `B3` | RN-98 a RN-111; RN-75 e RN-93 emendadas; contagens da §1, §3.10, §4 e §7 | 🔴 alta |
| `C1` | UC-57, UC-58, UC-59; 59 casos no lugar de 56 | 🟠 média |
| `C2` | UC-57, UC-58 e UC-59 detalhados; 15 casos no lugar de 12 | 🟠 média |
| `C6` | 5 entidades e 1 visão na §3.3; conceitual ganhou 3 caixas; §2.1 e contagens | 🔴 alta |
| `C8` | 6 verbetes novos; `batches`, `assignments`, `containers`, `batch_movements` e `settings` emendados | 🔴 alta |
| `B5` | 16 linhas, §2.3.8 nova, cobertura recalculada | 🟠 média |
| `E2` | §5.1.6 nova: TA-87 a TA-98 | 🟠 média |
| `D4` | recursos Tipos de embalagem, Protocolo de atividades e Divisão de lote; §3.16 nova | 🟠 média |
| `modelo-dados-pt` | fig23 e fig24 (`.mmd` e `.png`), README e renumeração das figuras posteriores | 🟠 média |

---

## Tarefas

### Bloco 1: banco

- [ ] **T15.1** Migration `container_types` + `containers.container_type_id`, com carga inicial (`saco`, `tubete`, `balde`) e backfill dos seis recipientes existentes. Asserção de que nenhum recipiente ficou sem tipo.
- [ ] **T15.2** Migration `protocols` + `protocol_steps`, com todas as restrições de `C8`: coerência entre `schedule_type` e `interval_days`/`resulting_stage`, coerência entre `anchor_type` e `anchor_step_id`, `anchor_step_id <> id`, `warning_pct` entre 0 e 100, único por `(protocol_id, sort_order)`, e índice único parcial de um protocolo vigente por tipo.
- [ ] **T15.3** Migration `species_protocol_overrides`, com a restrição de pelo menos um dos dois tempos preenchido.
- [ ] **T15.4** Migration `batch_protocol_steps`.
- [ ] **T15.5** Migration das emendas em `batches`: `filled_at` (com backfill `:= planted_at`), `planted_at` para nullable, `protocol_id`, `closed_reason` com a restrição de coerência com `closed_at`.
- [ ] **T15.6** Migration das emendas em `assignments`: `protocol_step_id`, `protocol_occurrence`, `protocol_due_on`, `cancelada` no CHECK de status, e o índice único `assignments_uma_ordem_por_ocorrencia`.
- [ ] **T15.7** Migration de `batch_movements`: `divisao_saida` e `divisao_entrada` no CHECK.
- [ ] **T15.8** Migration das duas chaves de `settings`, com asserção de que existem (o mesmo cuidado de `20260826000004`).
- [ ] **T15.9** Migration da visão `batch_protocol_due`.
- [ ] **T15.10** Migration de `batch_health` (`CREATE OR REPLACE`), derivando de `batch_protocol_due`. **Não editar a `20260826000005`**: migration aplicada não se reescreve.
- [ ] **T15.11** Carga inicial dos protocolos do tubete e do saco, com as etapas da prova de mesa.

### Bloco 2: o motor

- [ ] **T15.12** `src/lib/protocol/schedule.ts`: funções puras de cálculo. `tempoEfetivo(etapa, override)`, `proximoVencimento(estado, dias)`, `janelaDeAviso(dias, pct)`, `situacao(vencimento, janela, alertaAtivo, hoje)`. **Sem acesso ao banco**: é o núcleo testável do módulo.
- [ ] **T15.13** Testes unitários de T15.12, com os casos da prova de mesa como fixtures. Cobrir: contagem da execução real, âncora não resolvida, etapa sem alerta, janela proporcional em intervalo trimestral e semanal.
- [ ] **T15.14** `src/lib/protocol/engine.ts`: `montarAcompanhamento(loteId)`, `resolverAncoras(loteId, etapaConcluida)`, `gerarOrdens(loteId, horizonte)`, `varrerLotesAbertos()`. Idempotência por `ON CONFLICT DO NOTHING` sobre o índice único. **`gerarOrdens` resolve o `week_plan_id` antes de inserir** (RN-112): usa a semana do vencimento, abre-a em rascunho se não existir, e cai na semana aberta corrente quando a do vencimento estiver fechada. A ordem é inserida **sem linha em `assignment_members`** (RN-113).
- [ ] **T15.15** Validação de ciclo na cadeia de âncoras, com teste dedicado. **Não cabe em CHECK**: é a única barreira contra duas etapas que nunca vencem nada.
- [ ] **T15.16** Ganchos: criação de lote (T15.14 monta e gera), conclusão de apontamento com `protocol_step_id` (grava data real, avança fase, resolve âncoras), encerramento de lote (cancela ordens), divisão (copia estado).
- [ ] **T15.17** Varredura de recuperação na abertura da agenda do dia e do mapa de produção.
- [ ] **T15.18** Testes de integração do motor contra banco local, cobrindo TA-91, TA-93, TA-94 e TA-98.

### Bloco 3: Server Actions e telas

- [ ] **T15.19** Server Actions de `protocols`/`protocol_steps` (criar, editar, reordenar, desativar), com a validação de ciclo.
- [ ] **T15.20** Server Actions de `container_types`.
- [ ] **T15.21** Server Action `dividirLote`, transacional: cria os dois filhos, copia o acompanhamento, encerra o pai com `dividido`, cancela ordens, grava os movimentos.
- [ ] **T15.22** Tela `/configuracoes/protocolos`: lista ordenada de etapas por tipo de embalagem. Densa é aceitável, quem opera é a gerência sentada. **A âncora não pode ficar escondida**: é onde o erro acontece.
- [ ] **T15.23** Tela `/cadastros/embalagens`.
- [ ] **T15.24** Seção de tempos do protocolo no cadastro da espécie (RF-133).
- [ ] **T15.25** Painel do protocolo na ficha do lote: etapas, última execução, próximo vencimento, situação.
- [ ] **T15.26** Ação de dividir lote na ficha do lote.
- [ ] **T15.27** Testes das Server Actions, mockando o pool com `vi.mock`.

### Bloco 4: fechamento

- [ ] **T15.28** Executar TA-87 a TA-98 e registrar a situação em `E2` §14.
- [ ] **T15.29** Conferir o banco migrado contra `C6`/`C8`, coluna por coluna, e registrar divergências em `docs/auditoria-divergencias.md`. **É a conferência que a rodada de 24/08 fez e que encontrou nove correções.**
- [ ] **T15.30** Conferir que todo termo novo do módulo está no glossário [`A2`](../docs/engenharia/A-fundacao/A2-glossario-dominio.md) e que nenhuma tela usa palavra que não esteja lá. **A regra do `B3` §8 é que o termo vai ao glossário primeiro**, e a auditoria de 26/08 achou os cinco verbetes faltando depois de o módulo inteiro estar escrito.

---

## Ordem de execução

Blocos 1 → 2 → 3 → 4, e dentro do bloco 1 a ordem das tarefas importa: `container_types` antes de
`protocols`, `protocol_steps` antes de `batch_protocol_steps` e das emendas em `assignments`, e a
visão por último, porque lê todas as anteriores.

**T15.12 e T15.13 antes de T15.14**, e não junto: o cálculo de datas é o que o módulo inteiro
existe para acertar, e testá-lo isolado do banco é o que permite rodar os casos da prova de mesa em
milissegundos, sem montar lote nenhum.

---

## Riscos

| Risco | Mitigação |
|---|---|
| **A geração preguiçosa não roda** porque ninguém abre a agenda por vários dias | A varredura gera tudo o que faltou desde a última execução, e ordem vencida nasce vencida. Nada se perde, só chega junto |
| **`planted_at` passar a nullable quebra leitura existente** | Nenhuma tela lê a coluna hoje (o P14 não tem tela). Conferir `src/` antes da T15.5 assim mesmo |
| **Protocolo mal montado gera ordem errada em massa** | O erro é diferido e silencioso, e é a razão de UC-57 ter fluxos de exceção escritos. A tela precisa mostrar o efeito da âncora antes de salvar |
| **Divisão com apontamento em curso** | Recusada na Server Action (UC-58 FE-2): a hora trabalhada perderia destino |

---

## O que este plano não faz

- **Não expede lote.** `closed_reason = 'expedido'` fica disponível, e quem passa a marcá-lo é a separação de carga, em plano próprio.
- **Não versiona protocolo.** Um vigente por tipo, e a edição não retroage (RN-107). Está declarado em `C8`.
- **Não cria entidade de eventos do protocolo.** O razão é `assignments` + `task_executions`. A consequência aceita está em `C8`: marcar etapa como feita fora da agenda tem de gerar ordem e execução.
- **Não mexe na recorrência de calendário.** `task_recurrences` continua como está: são duas coisas diferentes, e as duas convivem.
