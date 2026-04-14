# Viveiro Mudar — Guia de Execução com Claude Code

## Estrutura dos Arquivos

```
viveiro-mudar/
├── CLAUDE.md                              ← Contexto global (carregado em toda sessão)
├── EXECUTION-GUIDE.md                     ← Este arquivo
├── plans/
│   ├── P1-custeio-por-especie.md          ← CRÍTICO (sem dependências)
│   ├── P2-controle-mortalidade-perdas.md  ← CRÍTICO (depende de P1)
│   ├── P3-precificacao-inteligente.md     ← CRÍTICO (depende de P1+P2)
│   ├── P4-agente-whatsapp.md             ← ALTO (depende de P1+P3)
│   ├── P5-automacao-pedidos-n8n.md       ← ALTO (depende de P3+P4)
│   ├── P6-dashboard-gestao.md            ← CRÍTICO (depende de P1+P2+P3)
│   ├── P7-catalogo-digital.md            ← MÉDIO (depende de P1+P3)
│   ├── P8-instagram-presenca-digital.md  ← MÉDIO (sem deps técnicas)
│   ├── P9-site-institucional.md          ← MÉDIO (depende de P7+P8)
│   └── P10-ecommerce-kits-tematicos.md   ← BAIXO (depende de tudo)
└── src/                                   ← Código gerado aqui
```

## Mapa de Dependências

```
P1 ──────────────────┐
  ↓                  │
P2 (usa species)     ├──→ P6 (Dashboard)
  ↓                  │
P3 (usa P1+P2)  ─────┘
  ↓
P4 (usa P1+P3) ──→ P5 (usa P3+P4)
  
P7 (usa P1+P3) ──→ P9 (usa P7) ──→ P10 (usa tudo)
P8 (independente)
```

## Como Usar no Claude Code

### Iniciando uma Sessão de Desenvolvimento

```bash
# Entrar no diretório do projeto
cd viveiro-mudar

# Iniciar Claude Code
claude

# Na primeira sessão de cada projeto, dizer:
> Leia o arquivo CLAUDE.md e o plan file plans/P1-custeio-por-especie.md. 
> Vamos implementar as tarefas da Fase 1. Crie os tasks para cada item.
```

### Fluxo Recomendado por Sessão

1. **Uma sessão = Uma fase de um projeto**
   - Não misture projetos na mesma sessão
   - Exemplo: "Sessão 1: P1 Fase 1 — Schema do Banco"

2. **Iniciar sessão com contexto**
   ```
   > Leia plans/P1-custeio-por-especie.md. Estamos na Fase 2.
   > As tasks T1.1 a T1.9 já foram concluídas. Implemente T1.10 a T1.12.
   ```

3. **Marcar progresso no plan file**
   - Após completar uma task, marcar `[x]` no plan file
   - Isso serve como checkpoint entre sessões

4. **Usar Plan Mode para decisões arquiteturais**
   - Apertar Shift+Tab 2x antes de começar algo complexo
   - Ex: antes de modelar o banco, entrar em plan mode

### Ordem de Execução Recomendada

#### Sprint 1 (Semanas 1-2): Fundação
```
Sessão 1: P1 Fase 1 — Criar todas as tabelas do schema
Sessão 2: P2 Fase 1 — Criar tabelas de lotes e perdas
Sessão 3: P1 Fase 3 — CRUDs administrativos (espécies, recipientes, insumos)
Sessão 4: P1 Fase 2 — Formulário mobile de registro de insumos
```

#### Sprint 2 (Semanas 3-4): Dados Entrando
```
Sessão 5: P2 Fase 2 — Formulário de registro de lote
Sessão 6: P2 Fase 3 — Formulário de contagem e perda
Sessão 7: P1 Fase 4 — Motor de cálculo de custo
Sessão 8: P2 Fase 4 — Alertas de mortalidade
```

#### Sprint 3 (Semanas 5-6): Precificação
```
Sessão 9:  P3 Fase 1 — Schema de precificação
Sessão 10: P3 Fase 2 — Motor de precificação
Sessão 11: P3 Fase 3 — Interface tabela de preços
Sessão 12: P3 Fase 4 — Simulador de orçamento
```

#### Sprint 4 (Semanas 7-8): Dashboard
```
Sessão 13: P6 Fase 1 — Views de agregação
Sessão 14: P6 Fase 2 — Interface do dashboard (KPIs + gráficos)
Sessão 15: P6 Fase 3 — Projeção e alertas
Sessão 16: P2 Fase 5 + P3 Fase 5 — Relatórios e integração
```

#### Sprint 5-6 (Mês 3): WhatsApp + Automação
```
Sessão 17: P4 Fase 1 — Infraestrutura WhatsApp (Evolution API)
Sessão 18: P4 Fase 2 — Agente de IA
Sessão 19: P4 Fase 3 — Fluxo de orçamento
Sessão 20: P4 Fase 4 — Painel de atendimento
Sessão 21: P5 Fase 1+2 — Schema e interface de pedidos
Sessão 22: P5 Fase 3 — Workflows n8n
```

#### Sprint 7-8 (Mês 4): Catálogo + Site
```
Sessão 23: P7 Fase 1+2 — Catálogo público
Sessão 24: P7 Fase 3 — Admin do catálogo
Sessão 25: P8 Tasks dev — Identidade visual + templates
Sessão 26: P9 Fase 1+2 — Páginas do site
Sessão 27: P9 Fase 3+4 — SEO + componentes
```

#### Sprint 9+ (Mês 6+): E-commerce
```
Sessão 28+: P10 — Somente após validar logística com 5-10 pedidos manuais
```

### Dicas para Sessões Produtivas

- **Antes de codar**: sempre entrar em Plan Mode e pedir para ler o plan file
- **Contexto é rei**: começar a sessão dizendo exatamente onde parou
- **Uma task por vez**: não pedir para implementar fase inteira de uma vez
- **Testar durante**: pedir para rodar/testar cada task antes de avançar
- **Commitar frequente**: um commit por task completada
- **Compactar quando necessário**: `/compact Foco no P1 Fase 2, tasks T1.10-T1.12`

### Paralelismo: O Que a Equipe Faz Enquanto Você Coda

Enquanto você executa as sessões acima, a equipe de campo executa as tarefas marcadas em cada plan file na seção "Dados que a Equipe de Campo Precisa Levantar". Essas tarefas NÃO dependem de código.

```
VOCÊ (dev)                    EQUIPE (campo)
─────────────                 ──────────────
Sprint 1: Schema + CRUDs  ←→  P1: Levantar espécies, custos, insumos
Sprint 2: Formulários      ←→  P2: Montar plaquinhas, contar lotes
Sprint 3: Precificação     ←→  P3: Registrar preços, pesquisar concorrentes
Sprint 4: Dashboard         ←→  P8: Criar Instagram, começar a postar
Sprint 5: WhatsApp          ←→  P4: Mapear perguntas, contratar API
Sprint 7: Site              ←→  P9: Textos, fotos, domínio, depoimentos
```
