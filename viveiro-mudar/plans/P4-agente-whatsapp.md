# P4 — Agente WhatsApp

## Status: NÃO INICIADO
## Prioridade: ALTA
## Dependências: P1 (espécies/estoque), P3 (tabela de preços, simulador de orçamento)
## Bloqueia: P5 (Automação n8n — fluxo pós-venda)

---

## Objetivo
Criar um agente de atendimento via WhatsApp que responde perguntas frequentes, consulta estoque em tempo real, gera orçamentos automaticamente e escala para humano quando necessário. Liberar o Gilberto do atendimento manual.

## Contexto
100% do atendimento é feito pelo Gilberto via WhatsApp pessoal. Ele responde orçamentos de cabeça, sem consultar preço ou estoque. Quando está ocupado no campo, clientes esperam horas ou dias. Não há padrão de resposta nem registro estruturado das conversas.

## Resultado Esperado
- Bot WhatsApp que responde perguntas frequentes (disponibilidade, preços, prazos, frete)
- Geração automática de orçamento via conversa
- Escalação inteligente para Gilberto/João quando necessário
- Painel de conversas e métricas de atendimento

---

## Dados que a Equipe de Campo Precisa Levantar (PARALELO)

- [ ] **20 perguntas mais frequentes**: Gilberto revisar conversas recentes e listar (com respostas padrão)
- [ ] **Fluxo de decisão**: João + Gilberto definirem o que o bot responde sozinho vs escala para humano
- [ ] **Textos padrão**: João escrever templates de resposta para cada situação — tom profissional mas acessível
- [ ] **Número WhatsApp Business**: João contratar número com API (Evolution API self-hosted ou Z-API)
- [ ] **Horário de atendimento**: definir quando bot responde sozinho vs quando avisa "fora do horário"
- [ ] **Informações do viveiro**: endereço, horário, formas de pagamento, prazo médio de entrega, área de cobertura

---

## Tarefas de Desenvolvimento

### Fase 1: Infraestrutura WhatsApp

- [ ] **T4.1** Instalar e configurar Evolution API na VPS
  - Docker compose com PostgreSQL
  - Configurar webhook URL para receber mensagens
  - Conectar número WhatsApp Business via QR code
- [ ] **T4.2** Criar tabela `whatsapp_conversations`
  ```
  id, phone_number, customer_name, channel (enum: whatsapp),
  status (enum: bot, human, closed), assigned_to (user_id nullable),
  started_at, last_message_at, closed_at, created_at
  ```
- [ ] **T4.3** Criar tabela `whatsapp_messages`
  ```
  id, conversation_id (FK), direction (enum: incoming, outgoing),
  message_type (enum: text, image, document, audio),
  content, metadata_json, sent_at, created_at
  ```
- [ ] **T4.4** Criar webhook handler (API route `/api/whatsapp/webhook`) que:
  - Recebe mensagem da Evolution API
  - Cria/atualiza conversa
  - Salva mensagem
  - Envia para processamento do agente

### Fase 2: Agente de IA

- [ ] **T4.5** Implementar agente com Anthropic API (Claude):
  - System prompt com contexto do viveiro, catálogo de espécies, regras de negócio
  - Tools disponíveis para o agente:
    - `check_stock(species_id, container_id)` → consulta estoque atual
    - `get_price(species_id, container_id, channel_id, quantity)` → consulta preço
    - `generate_quote(items[], distance_km)` → gera orçamento completo
    - `get_species_info(species_name)` → busca informações da espécie
    - `escalate_to_human(reason)` → transfere para atendente
  - Manter contexto da conversa (últimas N mensagens)
- [ ] **T4.6** Implementar function calling para cada tool:
  - `check_stock`: query na tabela `batches` (P2) com status = 'pronto'
  - `get_price`: query na `price_table` (P3)
  - `generate_quote`: chama `calculate-quote` do P3, salva como `quote`
  - `get_species_info`: query na `species` (P1)
  - `escalate_to_human`: muda status da conversa, notifica Gilberto/João
- [ ] **T4.7** Implementar lógica de escalação:
  - Cliente pede para falar com humano → escala
  - Bot não consegue responder após 2 tentativas → escala
  - Assunto fora do escopo (reclamação, pagamento pendente) → escala
  - Pedido acima de valor X → escala para Gilberto aprovar
- [ ] **T4.8** Implementar resposta via Evolution API (enviar mensagem de volta)

### Fase 3: Fluxo de Orçamento pelo WhatsApp

- [ ] **T4.9** Implementar fluxo conversacional de orçamento:
  1. Cliente: "Quero orçamento de mudas"
  2. Bot: "Claro! Quais espécies você precisa?" (ou envia lista/catálogo)
  3. Cliente: lista espécies e quantidades
  4. Bot: confirma itens, pergunta recipiente se necessário
  5. Bot: "Para calcular o frete, qual a cidade/distância?"
  6. Bot: envia orçamento formatado com: itens, preço unitário, subtotal, frete, total, validade
  7. Bot: "Posso fechar o pedido ou gostaria de ajustar algo?"
- [ ] **T4.10** Formatar orçamento em texto WhatsApp (emojis + formatação markdown leve)
- [ ] **T4.11** Salvar orçamento gerado pelo bot como `quote` no banco (P3)

### Fase 4: Painel de Atendimento

- [ ] **T4.12** Criar página `/app/atendimento`
  - Lista de conversas ativas (bot e humano)
  - Filtros: status, período, atendente
  - Clicar na conversa → ver histórico de mensagens
  - Campo para enviar mensagem manual (modo humano)
  - Botão "Devolver ao Bot" quando resolver
- [ ] **T4.13** Criar página `/app/atendimento/metricas`
  - Tempo médio de resposta (bot e humano)
  - Taxa de resolução pelo bot vs escalação
  - Volume de conversas por dia/semana
  - Conversas que viraram orçamento → taxa de conversão
- [ ] **T4.14** Implementar notificação (push/WhatsApp) quando conversa é escalada

---

## Critérios de Aceite
- [ ] Bot responde perguntas frequentes corretamente (testar com 10 cenários)
- [ ] Bot consulta estoque e preço em tempo real
- [ ] Orçamento gerado pelo bot confere com simulador do P3
- [ ] Escalação funciona e notifica humano imediatamente
- [ ] Conversa escalada aparece no painel com histórico completo
- [ ] Métricas de atendimento são calculadas e exibidas
- [ ] Bot funciona fora do horário comercial com mensagem adequada

---

## Notas Técnicas
- Evolution API é self-hosted e gratuita — requer VPS com Docker.
- Usar Anthropic Claude Sonnet para o agente (custo-benefício).
- Manter histórico de conversa limitado a 20 mensagens no contexto do agente para controlar tokens.
- Custo estimado do agente: ~R$0,05-0,20 por conversa completa.
- Implementar rate limiting: máximo 30 mensagens/minuto por número para evitar ban do WhatsApp.
- A Evolution API suporta webhooks — cada mensagem recebida dispara o webhook automaticamente.
- Para áudios: usar Whisper (OpenAI) para transcrever antes de enviar ao agente.
