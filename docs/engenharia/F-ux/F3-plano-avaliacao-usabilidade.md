# F3 — Plano de avaliação de usabilidade

> **Artefato:** Plano de avaliação de usabilidade · **Bloco:** F — Usabilidade
> **Destino no TCC:** Capítulo 4, seção 4.7 — Verificação e validação
> **Fundamentação:** Nielsen (1993) estabelece que a usabilidade não é propriedade unidimensional,
> mas reúne cinco atributos — **aprendizado, eficiência, memorização, erros e satisfação** —, e que a
> combinação deles permite quantificar o nível de usabilidade de forma precisa e mensurável,
> normalmente por testes com usuários, observando comportamentos e as rotinas mais utilizadas.

---

## 1. O que este documento resolve

O §3.6 da metodologia promete avaliar a usabilidade segundo os cinco atributos de Nielsen, com
usuários reconhecidamente sem formação técnica, adotando **observação de uso assistido** e
descartando explicitamente o questionário estruturado.

Uma promessa dessa natureza só produz resultado se o instrumento existir **antes** da avaliação. Sem
métrica definida previamente, a observação produz impressão, e impressão de quem projetou o sistema
sobre usuários que são seus colegas de trabalho é exatamente o viés registrado em
[`E3`, R-03](../E-qualidade/E3-analise-de-riscos.md).

Este documento converte os cinco atributos em **números coletáveis com cronômetro e ficha de papel**.

---

## 2. Sujeitos

| Perfil | Pessoas | Escolaridade em tecnologia | Dispositivo |
|---|---:|---|---|
| **Chefia** | 1 | Sem formação técnica | Celular e computador |
| **Gerência** | 2 | Sem formação técnica | Celular |

**Três sujeitos.** O uso do sistema em campo pelos colaboradores está previsto para iteração
posterior, conforme registrado em [`A1`](../A-fundacao/A1-documento-de-visao.md), e por isso eles não
integram esta avaliação.

Nielsen observa que a maior parte dos problemas de usabilidade é revelada por um número pequeno de
usuários, o que torna três sujeitos suficientes para o propósito **diagnóstico** — identificar onde a
interface falha. Não é suficiente para inferência estatística, e este plano não a pretende: os
números aqui produzidos descrevem estes três usuários operando este sistema, e não uma população.

> **Registrar essa limitação é parte do rigor, não uma concessão.** Um trabalho que apresentasse
> média e desvio-padrão sobre três pessoas estaria dando aparência estatística a um resultado
> qualitativo.

---

## 3. Os cinco atributos operacionalizados

| Atributo | O que Nielsen define | Métrica adotada | Instrumento |
|---|---|---|---|
| **Aprendizado** | Facilidade de compreender o sistema, de modo que o usuário comece a trabalhar rapidamente | **Tempo até concluir a primeira execução da tarefa sem auxílio**, e número de intervenções necessárias | Cronômetro e contagem |
| **Eficiência** | Nível de produtividade alcançado depois que a curva de aprendizado se eleva | **Tempo por tarefa na terceira execução**, com o usuário já familiarizado | Cronômetro |
| **Memorização** | Facilidade de retomar o sistema após período sem uso | **Tempo e erros na reexecução após 15 dias**, sem reinstrução | Cronômetro e contagem |
| **Erros** | Quantidade de erros e facilidade de reversão | **Contagem de erros por tarefa**, classificados por gravidade | Ficha de registro |
| **Satisfação** | Quanto o usuário aprecia utilizar o sistema | **Pergunta estruturada ao fim da sessão**, em escala verbal de cinco pontos | Ficha de registro |

### Critério de conclusão de tarefa

Nielsen observa que a medição do aprendizado se dá pela verificação de que o usuário **consegue
realizar a tarefa por completo**, e não pelo domínio absoluto da atividade. Adota-se, portanto:

> Uma tarefa é **concluída** quando o usuário atinge o resultado pretendido sem auxílio, ainda que
> por caminho não previsto e ainda que com erros revertidos ao longo do percurso.

### Classificação de erro

| Gravidade | Definição | Exemplo |
|---|---|---|
| **Leve** | Percebido e revertido pelo próprio usuário, sem consequência | Selecionar a espécie errada e corrigir antes de confirmar |
| **Moderado** | Exige recomeçar a tarefa | Confirmar um registro com quantidade errada |
| **Grave** | Produz dado incorreto **que o usuário não percebe** | Registrar perda na espécie errada e seguir adiante |

**Erro grave tem peso distinto dos demais.** Um erro que o usuário percebe custa tempo; um erro que
ele não percebe corrompe o dado — e um sistema cujo propósito é substituir a estimativa pela medição
não pode produzir medição errada silenciosamente. Um único erro grave reprova a tarefa,
independentemente do tempo.

---

## 4. Tarefas avaliadas

Selecionadas por frequência de uso e por custo do erro, e correspondentes aos casos de uso
especificados em [`C2`](../C-modelagem/C2-especificacao-casos-de-uso.md).

### Chefia

| # | Tarefa | Caso de uso | Frequência real |
|---|---|---|---|
| **T-01** | Registrar um pedido de três itens para cliente novo | UC-24 | Diária |
| **T-02** | Fechar um pedido verificado, definindo preço e nota fiscal | UC-26 | Diária |
| **T-03** | Consultar o custo unitário e a margem de uma espécie | UC-11 | Semanal |
| **T-04** | Classificar cinco lançamentos financeiros pendentes | UC-36 | Semanal |
| **T-05** | Emitir uma cotação a dois fornecedores | UC-32 | Semanal |

### Gerência

| # | Tarefa | Caso de uso | Frequência real |
|---|---|---|---|
| **T-06** | Verificar a disponibilidade de um pedido com item parcial | UC-25 | Diária |
| **T-07** | Registrar uma contagem de estoque | UC-16 | Semanal |
| **T-08** | Registrar uma perda em campo | UC-17 | Diária |
| **T-09** | Consultar as perdas do mês e identificar a espécie com maior mortalidade | UC-18 | Mensal |

**As tarefas são executadas com dados reais da empresa**, não com dados fabricados para o teste. Um
pedido de teste é um pedido de verdade; uma perda registrada é uma perda que ocorreu. A razão é dupla:
o comportamento sob dado real difere do comportamento sob dado inventado, e a sessão de avaliação
aproveita para produzir trabalho útil, o que reduz a resistência a concedê-la
([`E3`, R-04](../E-qualidade/E3-analise-de-riscos.md)).

---

## 5. Protocolo das sessões

### Sessão 1 — Aprendizado e erros

| Aspecto | Definição |
|---|---|
| **Momento** | Primeiro contato do usuário com a funcionalidade |
| **Condição** | Sem treinamento prévio, sem manual, sem demonstração |
| **Papel do observador** | Observar e registrar. **Não auxiliar**, salvo bloqueio total |
| **Bloqueio total** | Usuário parado por mais de dois minutos sem ação produtiva. O auxílio é prestado, cronometrado à parte e contado como intervenção |
| **Registro** | Tempo por tarefa, número de intervenções, erros por gravidade, percurso seguido |

> A regra de não auxiliar é a mais difícil de cumprir, e a mais determinante. O avaliador é também o
> projetista do sistema e colega dos sujeitos — a tendência natural é apontar o caminho. **Cada
> auxílio prestado destrói a medição de aprendizado daquela tarefa**, e é por isso que a intervenção
> é contada como dado e não como cortesia.

### Sessão 2 — Eficiência

| Aspecto | Definição |
|---|---|
| **Momento** | Terceira execução da mesma tarefa, no uso corrente |
| **Condição** | Uso normal, sem observador interferindo no ritmo |
| **Registro** | Tempo por tarefa, erros por gravidade |

### Sessão 3 — Memorização

| Aspecto | Definição |
|---|---|
| **Momento** | **Quinze dias** após a sessão 2, sem uso da funcionalidade no intervalo |
| **Condição** | Sem reinstrução de qualquer espécie |
| **Registro** | Tempo por tarefa, erros, e as perguntas espontâneas do usuário |

**Por que quinze dias.** O intervalo precisa exceder a frequência real de uso da tarefa para que a
memorização seja de fato testada. Quinze dias cobrem as tarefas semanais e mensais — que são
precisamente aquelas em que a memorização importa, e onde Nielsen observa que o atributo é mais
relevante: rotinas esporádicas e usuários casuais.

Tarefas diárias não são reavaliadas quanto à memorização: quem as executa todo dia não as esquece, e
medir isso não produz informação.

### Complemento — Satisfação

Ao fim de cada sessão, três perguntas em escala verbal de cinco pontos:

1. *Foi fácil ou difícil fazer isso?*
2. *Você preferiria fazer essa tarefa por este sistema ou do jeito antigo?*
3. *Teve algum momento em que você não soube o que fazer?*

A segunda pergunta é a que mais informa: compara o sistema com a alternativa real — que é a memória e
o WhatsApp —, e não com um ideal abstrato. É a pergunta cuja resposta negativa prevê o abandono
registrado como risco em [`E3`, R-05](../E-qualidade/E3-analise-de-riscos.md).

---

## 6. Critérios de aprovação

| Atributo | Critério |
|---|---|
| **Aprendizado** | Todas as tarefas concluídas na primeira sessão, com **no máximo uma intervenção** por tarefa |
| **Eficiência** | Tempo da terceira execução **inferior à metade** do tempo da primeira |
| **Memorização** | Tarefa reexecutada após quinze dias **sem intervenção** e com tempo até 50% superior ao da sessão 2 |
| **Erros** | **Nenhum erro grave** em nenhuma tarefa. Erros leves não reprovam |
| **Satisfação** | Nenhum usuário responde que preferiria o método anterior |

**Reprovação não é resultado negativo do trabalho — é resultado do trabalho.** Uma tarefa reprovada
identifica onde a interface falha, gera correção e nova avaliação. O que invalidaria a pesquisa
seria a aprovação sem medição.

---

## 7. Ficha de registro

Uma por sujeito e por sessão. Preenchida em papel durante a observação, porque preencher no celular
distrai o observador do que ele deveria estar observando.

```
AVALIAÇÃO DE USABILIDADE — Viveiro Mudar
Sujeito: ______________________  Perfil: _______________
Sessão:  ( ) 1 aprendizado  ( ) 2 eficiência  ( ) 3 memorização
Data: ____/____/______   Dispositivo: _______________
Observador: ______________________

┌──────┬─────────┬──────────────┬─────────────────────┬───────────┐
│Tarefa│ Tempo   │ Intervenções │ Erros               │ Concluída │
│      │ (min:s) │              │ leve / mod. / grave │  S  /  N  │
├──────┼─────────┼──────────────┼─────────────────────┼───────────┤
│ T-__ │    :    │              │    __ / __ / __     │           │
│ T-__ │    :    │              │    __ / __ / __     │           │
│ T-__ │    :    │              │    __ / __ / __     │           │
└──────┴─────────┴──────────────┴─────────────────────┴───────────┘

PERCURSO INESPERADO — por onde o usuário tentou antes de acertar
_______________________________________________________________
_______________________________________________________________

VERBALIZAÇÕES — o que o usuário disse em voz alta
_______________________________________________________________
_______________________________________________________________

SATISFAÇÃO
1. Fácil ou difícil?     muito difícil (1) 2  3  4  5 (muito fácil)
2. Este sistema ou o jeito antigo?   ( ) sistema  ( ) antigo  ( ) tanto faz
3. Momento em que não soube o que fazer? ______________________

OBSERVAÇÕES DO AVALIADOR
_______________________________________________________________
```

**Os campos de percurso inesperado e verbalizações são os mais valiosos do instrumento.** O tempo diz
que houve dificuldade; o percurso diz **onde**, e a verbalização diz **por quê**. Um usuário que
procura o registro de perda dentro da tela de estoque revela um problema de organização da navegação
que nenhum cronômetro identificaria.

---

## 8. Relação com os requisitos e com os testes de aceite

Cada critério de aprovação verifica um requisito não funcional de usabilidade:

| Critério | Requisito verificado |
|---|---|
| Aprendizado sem intervenção | RNF-08 — vocabulário da empresa na interface |
| Eficiência em campo | RNF-01, RNF-02 — limite de campos e listas fechadas |
| Ausência de erro grave | RNF-02, RNF-04 — listas fechadas e confirmação imediata |
| Execução no celular, em campo | RNF-03, RNF-06 — alvo de toque e concepção móvel |
| Conclusão sob conexão instável | RNF-05, RNF-07 — uso sem conexão e sob rede lenta |

As sessões são conduzidas **junto à execução dos casos de aceite** de
[`E2`](../E-qualidade/E2-casos-de-teste-de-aceite.md): as mesmas tarefas servem à verificação
funcional e à medição de usabilidade. Uma sessão, dois resultados — decisão tomada porque a
disponibilidade dos usuários é o recurso mais escasso do projeto.
