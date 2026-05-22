# Fase 2: Sistema de Notificacoes In-App

## Objetivo
Criar um sistema de notificacoes interno que avise chefia e gerencia quando ha acoes pendentes.
Notificacoes sao o "elo" entre as etapas do fluxo de pedidos.

## Pre-requisitos
- Tabela `notifications` criada (Fase 1, T1.5)
- Sistema de auth com `getSession()` em `src/lib/auth.ts`
- Componente `Toast.tsx` existente

## Tarefas

### T2.1 — Server Actions de notificacoes
- [ ] Criar `src/lib/notifications.ts` com funcoes:
  - `createNotification(userId, type, title, message, link)` — insere notificacao no banco
  - `getUnreadNotifications(userId)` — retorna notificacoes nao lidas do usuario
  - `getNotifications(userId, limit=20)` — retorna ultimas notificacoes (lidas e nao lidas)
  - `markAsRead(notificationId)` — marca uma notificacao como lida
  - `markAllAsRead(userId)` — marca todas como lidas
  - `getUnreadCount(userId)` — retorna contagem de nao lidas (para badge)
- [ ] Todas as funcoes devem usar `'use server'` e importar `pool` de `@/lib/db`
- [ ] Funcao helper `notifyRole(role, type, title, message, link)` — cria notificacao para TODOS os usuarios ativos com determinado role

### T2.2 — Componente NotificationBell (sino de notificacoes)
- [ ] Criar `src/components/NotificationBell.tsx` (client component)
- [ ] Exibir icone de sino no header/nav
- [ ] Badge vermelho com contagem de nao lidas (ex: "3")
- [ ] Ao clicar, abrir dropdown/painel com lista de notificacoes
- [ ] Cada notificacao mostra: titulo, mensagem resumida, tempo relativo ("ha 5 min")
- [ ] Clicar em uma notificacao: marca como lida + navega para o link
- [ ] Botao "Marcar todas como lidas"
- [ ] Polling a cada 30 segundos para atualizar contagem (via fetch a uma API route ou server action)
  - Alternativa: usar `router.refresh()` com revalidacao, mas polling eh mais simples para MVP

### T2.3 — API Route para polling de notificacoes
- [ ] Criar `src/app/api/notifications/route.ts`
- [ ] GET: retorna `{ unreadCount, notifications }` para o usuario autenticado
- [ ] Verificar sessao no handler (rejeitar se nao autenticado)

### T2.4 — Integrar NotificationBell no layout
- [ ] Adicionar `<NotificationBell />` no layout principal (`src/app/layout.tsx` ou header compartilhado)
- [ ] Exibir apenas para usuarios autenticados
- [ ] Posicionar no canto superior direito
- [ ] Responsivo: funcionar bem em mobile e desktop

### T2.5 — Pagina de notificacoes (opcional, mas recomendada)
- [ ] Criar `src/app/notificacoes/page.tsx`
- [ ] Lista completa de notificacoes com scroll
- [ ] Filtro: todas / nao lidas
- [ ] Link do sino "Ver todas" aponta para esta pagina

## Design do NotificationBell

```
Desktop:                          Mobile:
+---------------------------+     +------------------+
| [Logo]    [Sino(3)]  [User]|   | [=] Titulo [Sino] |
+---------------------------+     +------------------+

Dropdown ao clicar no sino:
+-------------------------------+
| Notificacoes     [Marcar lidas]|
+-------------------------------+
| * Novo pedido #47              |
|   Cliente X - 5 especies       |
|   ha 3 minutos                 |
+-------------------------------+
|   Pedido #45 verificado        |
|   2 itens indisponiveis        |
|   ha 1 hora                    |
+-------------------------------+
| Ver todas as notificacoes      |
+-------------------------------+
```

## Tipos de Notificacao

| type | Quando | Para quem | Titulo exemplo |
|------|--------|-----------|----------------|
| `novo_pedido` | Chefia cadastra pedido | Gerencia | "Novo pedido #47 — Cliente X" |
| `pedido_verificado` | Gerencia finaliza checklist | Chefia | "Pedido #47 verificado — 2 itens indisponiveis" |
| `pedido_aprovado` | Chefia aprova pedido | Gerencia | "Pedido #47 aprovado — separar ate 15/06" |
| `pedido_alterado` | Chefia altera itens | Gerencia | "Pedido #47 alterado — verificar novamente" |
| `pedido_pronto` | Gerencia finaliza separacao | Chefia | "Pedido #47 pronto para envio" |

## Notas Tecnicas
- Polling de 30s eh aceitavel para MVP (equipe de 7 pessoas, volume baixo)
- Nao implementar WebSocket ou SSE agora — complexidade desnecessaria
- Notificacoes antigas (>30 dias lidas) podem ser limpas por cron futuramente
- O sino deve funcionar em TODAS as paginas, nao so admin
