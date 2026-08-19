# Fase 6 (Futuro): Emissão de NF via API

> **Fora do escopo desta rotina.** Este documento registra o que as Fases 1–4 deixam
> pronto e o que ainda falta para emitir Nota Fiscal de verdade. É o ponto de partida
> da rotina Financeiro/NF: **nada aqui se implementa agora**.

## O que esta rotina já prepara
- **Dados fiscais estruturados** do destinatário: PF/PJ, documento único (CPF/CNPJ),
  endereço completo, e-mail (para envio de DANFE/XML), IE / isenção.
- **`orders.needs_invoice`** por pedido: sabemos quais pedidos vão gerar NF.
- **Gate de completude** (`isFiscallyComplete`) acionado no fechamento, garante que
  todo pedido marcado para NF tem destinatário válido.

## O que ainda falta (a decidir/implementar depois)

### Provedor de emissão
- Escolher API (ex.: **Focus NF-e**, **NFe.io**, **PlugNotas**, **eNotas**) ou
  integração direta com a **SEFAZ**.

### Dados do emitente (o viveiro)
- CNPJ, IE, **regime tributário** (provável Simples Nacional → CSOSN).
- **Certificado digital A1**, CSC/token, ambiente de **homologação × produção**.

### Dados fiscais do produto (hoje inexistentes em `species`/`containers`)
- **NCM**, **CFOP**, **CST/CSOSN**, unidade comercial, origem da mercadoria.
- Exigirá migração futura nas tabelas de produto.

### Cálculo e ciclo de vida da nota
- Cálculo de impostos por canal de venda / UF; tratamento do **frete** na NF.
- Numeração/série; contingência; **cancelamento**; **carta de correção**.

### Persistência do retorno
- Guardar **chave de acesso**, protocolo, **XML** e **DANFE (PDF)**; envio por e-mail.
- Tabela sugerida `order_invoices` (`order_id`, `status`, `chave`, `xml_url`,
  `danfe_url`, `provider`, `error`, timestamps).

## Cross-references
- `../../4-financeiro/00-visao-geral.md`: etapa "Emissão de nota fiscal" (perfil **Chefia**).
- `../../3-comercial/pedidos/05-analise-fechamento.md`: onde `needs_invoice` é definido.
- `04-integracao-pedidos-nf.md`: o gate de completude que habilita esta fase.
