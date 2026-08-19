# Fase 5: Analise e Fechamento de Pedido (Chefia — Desktop)

## Objetivo
Apos a gerencia verificar disponibilidade (e atribuir especies em itens genericos),
a chefia (Gilberto) recebe notificacao e analisa o resultado.
Se tudo disponivel e a venda fizer sentido: aprova.
Se faltam itens: marca como pendente alteracao, ajusta itens, e reenvia ou cancela.

## Pre-requisitos
- Pedido com status `verificado` (Fase 4 concluida)
- Notificacao recebida pela chefia (Fase 2)
- Pagina de detalhes do pedido (parcialmente criada na Fase 3)

## Tarefas

### T5.1 — Server Actions de analise
- [x] Adicionar em `src/app/pedidos/actions.ts`:
- [x] `approveOrder(orderId, userId)`:
  1. Validar que status eh `verificado`
  2. Mudar status para `aprovado`
  3. Registrar historico
  4. Notificar gerencia: "Pedido #47 aprovado — separar ate DD/MM"
- [x] `requestChanges(orderId, userId, notes?)`:
  1. Validar que status eh `verificado`
  2. Mudar status para `pendente_alteracao`
  3. Registrar historico com notas
  4. Notificar gerencia: "Pedido #47 precisa de alteracoes"
- [x] `updateOrderAfterReview(orderId, userId, updatedItems, removedItemIds)`:
  1. Validar que status eh `pendente_alteracao`
  2. Atualizar itens (quantidade, recipiente) ou remover itens
  3. Setar `is_available = NULL` nos itens alterados (precisam ser re-verificados)
  4. Manter `is_available` nos itens que nao mudaram
  5. Se houver novos itens, inseri-los com `is_available = NULL`
  6. Para itens genericos alterados: remover filhos (serao re-atribuidos pela gerencia)
  7. Mudar status para `cadastrado` (volta pro ciclo de verificacao)
  8. Notificar gerencia: "Pedido #47 alterado — verificar novamente"
- [x] `approvePartial(orderId, userId, keepItemIds)`:
  1. Remover itens nao incluidos em keepItemIds (e seus filhos se genericos)
  2. Mudar status para `aprovado`
  3. Registrar historico
  4. Notificar gerencia

### T5.2 — Pagina de detalhes do pedido
- [x] Criar `src/app/pedidos/[id]/page.tsx` (server component)
- [x] Acessivel para admin, chefia, gerencia
- [x] Carregar pedido completo com `getOrderById(id)`
- [x] Layout em secoes:

**Cabecalho:**
- Numero do pedido (#47)
- Status com badge colorido
- Cliente (nome + telefone)
- Canal de venda
- Data de entrega
- Data de criacao
- Quem cadastrou

**Tabela de Itens:**
- Colunas: Especie | Recipiente | Quantidade | Disponibilidade | Obs. Gerencia
- Itens especificos: exibir especie + recipiente normalmente
- Itens genericos: exibir com destaque diferente:
  - Linha pai: "GENERICO — Min: Saco 10x18 — 1000 un" com badge
  - Linhas filhas (indentadas): especies atribuidas pela gerencia com quantidades
  - Ex: "  -> Ipe Amarelo | Saco 10x18 | 300" / "  -> Araucaria | Saco 17x22 | 300"
- Disponibilidade exibida como:
  - Icone verde check = disponivel / composicao definida
  - Icone vermelho X = indisponivel
  - Icone cinza ? = nao verificado / nao atribuido
- Se status eh `verificado`, mostrar resumo: "5 de 7 disponiveis"

**Historico de Status:**
- Timeline vertical com: data, status, quem alterou, notas

**Acoes (variam por status e role):**

| Status | Role | Acoes disponiveis |
|--------|------|-------------------|
| `cadastrado` | chefia | Editar, Cancelar |
| `cadastrado` | gerencia | Iniciar Verificacao |
| `verificado` | chefia | Aprovar, Aprovar Parcial, Solicitar Alteracao |
| `pendente_alteracao` | chefia | Editar Itens, Cancelar |
| `aprovado` | gerencia | Iniciar Separacao |
| `separando` | gerencia | (ver fase 6) |
| `pronto_envio` | chefia | (futuro: criar entrega) |

### T5.3 — Componente de analise (chefia)
- [x] Criar `src/app/pedidos/[id]/OrderAnalysis.tsx` (client component)
- [x] Visivel quando status = `verificado` e role = chefia/admin
- [x] Mostrar tabela de itens com indicadores visuais claros:
  - Itens disponiveis: fundo verde claro
  - Itens indisponiveis: fundo vermelho claro com alerta
  - Itens genericos: fundo azul claro com composicao expandida (mostrar filhos)
  - Observacoes da gerencia abaixo de cada item indisponivel
- [x] Se TODOS disponiveis:
  - Destaque: "Todos os itens disponiveis!"
  - Botao grande verde: "Aprovar Pedido"
- [x] Se ALGUNS indisponiveis:
  - Destaque: "3 de 7 itens indisponiveis"
  - Botao: "Aprovar apenas disponiveis" (remove itens indisponiveis e aprova)
  - Botao: "Editar pedido" (vai para modo edicao — trocar especie, quantidade, etc)
  - Botao: "Cancelar pedido"

### T5.4 — Modo edicao de itens (para pendente_alteracao)
- [x] Criar `src/app/pedidos/[id]/editar/page.tsx`
- [x] Proteger com `requireRole('admin', 'chefia')`
- [x] Reutilizar logica similar ao formulario de criacao (T3.4):
  - Tabela editavel de itens com toggle E/G (especifico/generico)
  - Poder remover itens indisponiveis
  - Poder alterar quantidades
  - Poder adicionar novos itens (especificos ou genericos)
  - Poder trocar especie/recipiente
  - Poder converter item especifico em generico (e vice-versa)
- [x] Pre-carregar com dados atuais do pedido
- [x] Itens indisponiveis destacados em vermelho com observacao da gerencia
- [x] Itens genericos mostram a composicao que a gerencia definiu (referencia visual)
- [x] Ao salvar: chama `updateOrderAfterReview` que volta o pedido para verificacao
- [x] Toast: "Pedido alterado — enviado para re-verificacao"

### T5.5 — Fluxo de re-verificacao
- [x] Garantir que ao voltar para `cadastrado` apos edicao:
  - Itens especificos que nao foram alterados manteem `is_available`
  - Itens especificos alterados recebem `is_available = NULL`
  - Itens genericos que nao foram alterados manteem seus filhos e `is_available`
  - Itens genericos alterados (quantidade ou recipiente minimo mudou): filhos removidos, `is_available = NULL`
  - Itens novos recebem `is_available = NULL`
  - Gerencia recebe notificacao para re-verificar
- [x] Na tela de verificacao (Fase 4), itens ja verificados aparecem com marca mas editaveis
- [x] Barra de progresso conta apenas itens com `is_available IS NULL`

## Wireframe — Pagina de Detalhes com Genericos (Desktop)

```
+====================================================================+
|  Pedido #47                                    Status: [VERIFICADO] |
+====================================================================+
|                                                                      |
|  Cliente: Joao da Silva — 47 99999-0000                             |
|  Canal: Compensacao Ambiental                                        |
|  Entrega: 15/06/2026                                                |
|                                                                      |
+----------------------------------------------------------------------+
|  Itens do Pedido                              5 de 5 disponiveis     |
+--------------------+------------+------+-------+--------------------+
| Especie            | Recipiente | Qtd  | Disp. | Obs. Gerencia      |
+--------------------+------------+------+-------+--------------------+
| Ipe Amarelo        | Tubete     | 500  |  [V]  |                    |
| Araucaria          | Saco 17x22 | 200  |  [V]  |                    |
+--------------------+------------+------+-------+--------------------+
| GENERICO           | Min: 10x18 | 1000 |  [V]  | composicao abaixo  |
|   -> Ipe Amarelo   | Saco 10x18 | 300  |       |                    |
|   -> Araucaria     | Saco 17x22 | 300  |       |                    |
|   -> Cedro Rosa    | Saco 10x18 | 200  |       |                    |
|   -> Pitanga       | Saco 10x18 | 200  |       |                    |
+--------------------+------------+------+-------+--------------------+
| Canafistula        | Tubete     | 300  |  [V]  |                    |
| Cedro Rosa         | Tubete     | 400  |  [V]  |                    |
+--------------------+------------+------+-------+--------------------+
|                                                                      |
|  [Aprovar Pedido]                                                    |
+----------------------------------------------------------------------+
```

## Notas Tecnicas
- A pagina de detalhes eh a "central" do pedido — usada em todas as fases
- Acoes mudam dinamicamente conforme status e role do usuario
- A edicao de itens deve ser uma transacao atomica (tudo ou nada)
- Ao aprovar parcial, os itens removidos devem constar no historico (notes)
- Ao remover item generico, seus filhos sao removidos em cascata (ON DELETE CASCADE)
- Considerar: Gilberto pode querer ligar pro cliente antes de decidir — o pedido pode ficar em `verificado` por horas/dias
- A composicao do generico eh apenas informativa para a chefia — ele ve o que a gerencia escolheu mas nao altera as especies individuais (se quiser mudar, altera o item generico e reenvia)
- **Nota Fiscal**: ao aprovar, a chefia responde "Precisa de Nota Fiscal?". Se sim, o cliente precisa estar fiscalmente completo (gate validado no servidor) — detalhes e complementacao inline na rotina de Clientes, `../../1-cadastros/clientes/04-integracao-pedidos-nf.md`
