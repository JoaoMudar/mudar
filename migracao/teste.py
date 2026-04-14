import tiktoken

def num_tokens_from_string(string: str, encoding_name: str) -> int:
    """Você é um especialista em estratégia de negócios, modelagem financeira e transformação digital aplicada ao agronegócio. Sua tarefa é construir um Modelo de Negócios completo (Business Model Canvas) com nível técnico compatível a um Trabalho de Conclusão de Curso em Sistemas de Informação.

OBJETIVO PRINCIPAL

Estruturar um modelo de negócio que maximize a lucratividade de um viveiro de mudas nativas através do uso de tecnologia (IA + automação), corrigindo falhas operacionais e estratégicas atuais.

1. CONTEXTO DO NEGÓCIO

O empreendimento é um viveiro de mudas nativas com as seguintes características:





Atua majoritariamente no atacado



Possui baixa margem de lucro



Não possui controle preciso de custos



Processo de vendas manual via WhatsApp



Não utiliza dados para tomada de decisão

2. PROBLEMAS CRÍTICOS (ANALISAR PROFUNDAMENTE)

Você deve tratar esses problemas como centrais no modelo:





Vendas com margem negativa ou muito baixa



Custos logísticos não incorporados ao preço (frete, manutenção, depreciação)



Gargalo operacional no atendimento manual



Ausência de análise de lucratividade por cliente, pedido ou espécie



Falta de previsibilidade de demanda

3. SOLUÇÃO TECNOLÓGICA (CORE DO MODELO)

O modelo de negócio deve ser orientado por uma camada de inteligência:





Agente de Decisão (LLM): Avalia pedidos com base em:





Espécie



Quantidade



Preço



Distância/logística → Retorna: ACEITAR / NEGAR / AJUSTAR PREÇO



Automação com n8n:





Orquestração de pedidos



Integração WhatsApp + sistema interno



Registro automático de dados



Precificação Inteligente:





Preço mínimo viável



Preço ideal por canal (varejo vs atacado)



Margem mínima obrigatória



Logística Estratégica:





Frete incluso / dividido / retirada



Otimização de rotas



Consolidação de pedidos

4. SEGMENTOS DE CLIENTES

Analise e estruture:





Atual:





Reflorestamento



Grandes projetos (atacado)



Expansão:





Paisagismo premium



Empresas com foco em ESG

5. CANAIS

Definir transição de:





WhatsApp manual → sistema automatizado



Integração com dashboard de gestão



Possível expansão para e-commerce no futuro

6. ESTRUTURA OBRIGATÓRIA DA RESPOSTA

Construa o Business Model Canvas com:





Proposta de Valor



Segmentos de Clientes



Canais



Relacionamento com Clientes



Fontes de Receita



Recursos-Chave



Atividades-Chave



Parcerias-Chave



Estrutura de Custos

7. DIFERENCIAL (OBRIGATÓRIO)

Você DEVE incluir:





Comparação ANTES vs DEPOIS da implementação da IA



Como o uso de dados muda a tomada de decisão



Indicadores de desempenho (KPIs), como:





Margem por pedido



Custo logístico por km



Ticket médio



Taxa de pedidos rejeitados pelo sistema

8. VIABILIDADE FINANCEIRA

Considere:





Referência de viabilidade baseada em estudos (Embrapa / UFSC)



Projeção de aumento de margem com precificação inteligente



Redução de desperdícios operacionais



Ganho de escala com automação

9. PROFUNDIDADE ESPERADA





Evite respostas genéricas



Traga lógica de negócio aplicável



Estruture como um modelo que poderia ser implementado na prática



Sempre conecte tecnologia com impacto financeiro"""
    encoding = tiktoken.get_encoding(encoding_name)
    num_tokens = len(encoding.encode(string))
    return num_tokens

# Exemplo de uso
print(num_tokens_from_string("Olá, como você está?", "cl100k_base"))
