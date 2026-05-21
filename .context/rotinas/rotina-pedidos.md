# Rotina: Pedidos

## Fluxo atual
Cliente envia mensagem no WhatsApp -> Gilberto recebe -> passa para Débora verificar -> Gilberto confirma venda -> Débora organiza separação -> equipe separa -> Gilberto entrega.

## Telas por perfil

### Chefia
- **Cadastro de pedido**: cliente, espécies, quantidades, recipiente, canal de venda, data desejada
- **Aprovação de venda**: ver pedido montado com disponibilidade e preço, aprovar ou ajustar
- **Histórico de pedidos**: busca por cliente, status, período

### Gerência
- **Verificação de disponibilidade**: recebe pedido, confere estoque por espécie/recipiente, marca como disponível ou parcial
- **Fila de pedidos aprovados**: lista ordenada por data de entrega, com status (a separar, separando, pronto)
- **Montagem de carga**: agrupa pedidos por entrega

### Colaborador
- **Lista de separação**: espécies + quantidades a separar, marcar como concluído por item
