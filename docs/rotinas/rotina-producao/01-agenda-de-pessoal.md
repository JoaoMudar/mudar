# Subrotina: Agenda de Pessoal

> Onde se anota **o que cada funcionário vai fazer na semana**. É a porta de entrada da
> rotina de produção — ver [`00-visao-geral.md`](00-visao-geral.md).

## A ideia em 1 frase

**Uma grade de uma semana: linhas são pessoas, colunas são dias.** Preenche-se na segunda de
manhã em poucos minutos, e ela vira a lista de tarefas do celular de cada um.

## O problema

Débora distribui tarefas verbalmente. Três consequências:

1. **Nada fica registrado** — no fim do mês ninguém sabe quanto tempo foi gasto em quê.
2. **Esquecimento é invisível** — se a irrigação do canteiro 4 não foi feita, só se descobre
   pela muda morta.
3. **Custo de mão de obra não existe** — é o maior custo do viveiro e o único que o custeio
   (P1) ainda não consegue calcular.

## As 4 decisões de desenho

### 1. Turno, não horário

A unidade da agenda é **dia × turno** (manhã / tarde), nunca hora marcada. Ninguém no viveiro
trabalha com agenda de hora em hora, e pedir horário exato garantiria que a agenda não é
preenchida.

Um turno = **4 horas** por convenção. É o que transforma a agenda em horas sem controle de
ponto.

### 2. Escolher, não digitar

Tudo é lista fechada: funcionário (do cadastro), tipo de tarefa (do catálogo), espécie e
recipiente (quando o tipo de tarefa exigir). Campo livre só em "observação", opcional.

> Mesma regra do financeiro: **sem campo aberto = sem typo = dado que serve para somar.**

### 3. Repetir é o caminho normal

A semana do viveiro se parece muito com a anterior. O botão principal da tela é
**"Copiar semana passada"** — traz tudo preenchido, e ajusta-se o que mudou. Preencher do
zero é a exceção.

Tarefas recorrentes (irrigação diária, por exemplo) podem ser marcadas como **fixas** e já
nascem em toda semana nova.

### 4. Planejado vira realizado sozinho

No fim do dia, o colaborador confirma o que fez. **Se não confirmar, o planejado é assumido
como realizado** ao fechar a semana — com uma marca de "não confirmado".

A alternativa (exigir confirmação) produziria uma agenda com buracos, e agenda com buraco não
serve para calcular custo. Assumir o planejado e sinalizar a dúvida é mais honesto do que não
ter dado nenhum.

## As telas

### Gerência — grade da semana (tela principal)

Em tablet/computador, a grade inteira:

```
Semana de 10/08 a 15/08                    [Copiar semana passada] [Publicar]

              SEG        TER        QUA        QUI        SEX        SÁB
Rogério      Repicagem  Repicagem  Irrigação  Semeadura  Semeadura  Limpeza
             Ipê-amar.  Ipê-amar.  —          Aroeira    Aroeira    —
             M+T        M          M          M+T        M          M

Amélia       Semeadura  Semeadura  Semeadura  Repicagem  Repicagem  —
             Aroeira    Aroeira    Canela     Ipê-roxo   Ipê-roxo
             M+T        M+T        M+T        M+T        M

Jaison       Separação  Entrega    Adubação   Adubação   Separação  —
             Ped. #124  Blumenau   —          —          Ped. #131
             M          M+T        M          M          M+T
```

No celular, a mesma agenda vira **um dia por tela**, deslizando entre os dias — a grade
completa não cabe e não deve ser espremida.

Cadastrar uma tarefa são **3 toques**: pessoa → tipo de tarefa → turno. Espécie e recipiente
só aparecem se o tipo de tarefa exigir.

### Colaborador — hoje

```
Segunda, 10 de agosto

☐  MANHÃ    Repicagem · Ipê-amarelo · saco 10x18
☐  TARDE    Repicagem · Ipê-amarelo · saco 10x18

            [Concluir]  → pergunta só a quantidade
```

Uma lista curta, sem menu, sem navegação. Concluir pede **um número** e nada mais. É a
mesma disciplina de formulário de campo já aplicada em `/insumos/registrar`, inclusive a
fila offline.

### Chefia — custo do período

Horas planejadas × realizadas, custo total de mão de obra e quanto disso foi para cada
espécie.

## Do planejamento ao custo

O ponto que faltava no custeio (P1):

```
turnos na agenda  ×  4h  =  horas
horas  ×  valor-hora médio da equipe  =  custo de mão de obra
custo  →  rateado sobre a espécie da tarefa
```

**O valor-hora é médio da equipe, não individual.** Vem da folha do mês (financeiro)
dividida pelas horas trabalhadas no mês — um número só, atualizado mensalmente.

> **Por que médio:** o documento de requisitos (B2 §4) resolveu o conflito
> "precisão do custo × esforço de apuração" descartando o apontamento individual, para não
> impor controle de ponto. O valor-hora médio mantém essa decisão de pé e ainda assim produz
> custo real — porque o que varia de verdade entre espécies é o **tempo gasto**, não quem
> gastou. Guardar valor-hora por pessoa transformaria a agenda num instrumento de avaliação
> de desempenho, o que muda a relação da equipe com o app e derruba o preenchimento.

Tarefa **sem espécie** (limpeza de canteiro, manutenção) é custo indireto: entra no rateio
geral, junto dos custos fixos.

## Modelo de dados (esboço)

| Entidade | Papel |
|---|---|
| `task_types` | catálogo de tipos de tarefa — vive nos [Cadastros](../rotina-cadastros.md) |
| `week_plans` | a semana: `week_start`, `status` (rascunho · publicada · fechada) |
| `assignments` | a célula da grade: funcionário (party), data, turno, tipo de tarefa, espécie?, recipiente?, quantidade planejada, observação |
| `production_activities` | o realizado — já previsto no MER; ganha `assignment_id` **opcional**, para permitir registro avulso |
| `labor_rates` | valor-hora médio por período (mês) |

Funcionário é `cadastro.parties` com papel `funcionario` — **não** `users`. Amélia e Jaison
existem na agenda mesmo sem nunca terem feito login.

## Regras invioláveis

1. **Semana fechada não muda.** Depois de fechada, correção só por lançamento de ajuste — o
   custo do mês já foi calculado em cima dela.
2. **Toda tarefa tem um responsável.** Não existe tarefa sem pessoa; existe pessoa sem tarefa.
3. **Tipo de tarefa vem do catálogo.** Nunca texto livre.
4. **Funcionário inativo some da grade, mas não do histórico.**
5. **Colaborador só vê e edita as próprias tarefas** — a grade da semana inteira é de
   gerência e chefia (matriz RBAC, D4).

## O que isso destrava

| Destrava | Como |
|---|---|
| **P1 Custeio** | fecha a última peça: mão de obra por espécie |
| **P3 Precificação** | preço com custo real, não estimado |
| **Estoque** | produção registrada com regularidade alimenta o saldo |
| **Perdas (P2)** | perda registrada no mesmo gesto da tarefa |
| **Indicadores (G2)** | horas por espécie, tarefas não confirmadas, planejado × realizado |
