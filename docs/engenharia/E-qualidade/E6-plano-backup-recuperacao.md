# E6 — Plano de backup e recuperação

> **Artefato:** Plano de backup e recuperação · **Bloco:** E — Qualidade, riscos e segurança
> **Destino no TCC:** Capítulo 4, seção 4.6 — Segurança e controle de acesso
> **Fundamentação:** Sommerville (2011) classifica como **limitação de exposição e recuperação** os
> controles voltados à recuperação de dados, exemplificando-os com backup automatizado e
> espelhamento de informações, capazes de cobrir os custos de um ataque bem-sucedido. Este documento
> é a aplicação desse tipo de controle, e fecha o princípio de **disponibilidade** enunciado no
> Capítulo 2.5.1.
> ⚠️ **Exige acréscimo ao Capítulo 2.5 do TCC** — o texto proposto está em [`../word/`](../word/).

---

## 1. O que se perde, e por que importa

O sistema torna-se progressivamente a **única fonte de dados que a empresa jamais teve**. A distinção
relevante não é entre dado importante e dado secundário, mas entre **dado reproduzível** e **dado
irreproduzível**.

| Conjunto de dados | Reprodutível? | Custo de reconstituição |
|---|---|---|
| **Levantamento primário** — consumo de insumo por espécie, tempos de produção, custos de coleta | **Não** | Meses de nova medição em campo |
| **Histórico de perdas e produção** | **Não** | Impossível. O evento passou |
| **Classificação financeira** | **Não** | A memória do gasto se perde em semanas — é a razão da rotina semanal |
| **Pedidos e clientes** | Parcialmente | Reconstituível a partir de conversas e notas fiscais, a custo alto |
| **Cadastro de fornecedores** | Parcialmente | Rede construída ao longo de anos |
| **Catálogo de espécies e recipientes** | Sim | Recadastramento trabalhoso, mas viável |

**As três primeiras linhas são o que este plano protege.** Perdê-las não significa refazer trabalho —
significa que o dado deixa de existir, e com ele o objetivo do trabalho.

---

## 2. Objetivos declarados

| Métrica | Objetivo | Significado |
|---|---|---|
| **RPO** — perda máxima aceitável | **24 horas** | Em um desastre, admite-se perder até um dia de registros |
| **RTO** — tempo máximo de restabelecimento | **8 horas** | Prazo para o sistema voltar a operar |
| **Retenção** | **30 dias** de cópias diárias | Janela para detectar e reverter corrupção não percebida de imediato |

### Por que estes números

**RPO de 24 horas** é adequado ao volume real: o viveiro gera dezenas de registros por dia, não
milhares. Um dia perdido é reconstituível pela memória recente da equipe — a perda de uma semana não
seria. O número não é ambicioso porque não precisa ser, e um RPO menor exigiria arquitetura de custo
incompatível com o porte da empresa.

**RTO de 8 horas** decorre da natureza do sistema: é ferramenta de gestão, não de controle de
processo em tempo real. Um dia sem o sistema adia registros — que a fila local do dispositivo
preserva — e não interrompe a produção de mudas nem a expedição.

**Retenção de 30 dias** é dimensionada pelo modo de falha mais provável, que **não é o desastre**. É
a corrupção silenciosa: uma importação de extrato equivocada, uma exclusão em massa por engano, um
erro de migração. Esse tipo de falha é percebido dias depois, e a cópia de ontem já a contém. Trinta
dias cobrem o intervalo entre o erro e sua percepção.

---

## 3. Estratégia

### 3.1 Cópia automatizada do banco

Cópia diária automática mantida pelo serviço gerenciado de banco de dados, com retenção de 30 dias.
Sendo automática e externa à aplicação, não depende de ninguém lembrar de executá-la — o que é
decisivo numa organização sem administrador de sistemas.

Complementarmente, **exportação mensal completa armazenada fora do provedor**. Esta é a cópia que
protege contra o modo de falha que a cópia do próprio provedor não cobre: perda da conta,
encerramento do serviço ou indisponibilidade prolongada do fornecedor. Uma cópia que vive apenas
dentro do sistema que ela deveria substituir não é cópia de segurança.

### 3.2 Fotografias das espécies

Armazenadas junto ao código, e portanto versionadas e replicadas com ele. Não dependem do backup do
banco.

### 3.3 Código e estrutura do banco

O repositório é distribuído por natureza: cada cópia de trabalho é uma réplica completa do histórico.
As migrações versionadas permitem reconstruir a estrutura do banco do zero — o que significa que a
recuperação precisa restaurar **dados**, nunca esquema.

### 3.4 O que não é copiado, e por quê

| Item | Motivo |
|---|---|
| Fila local de sincronização nos dispositivos | Transitória por natureza. Seu conteúdo é enviado em minutos, e sua perda equivale à perda de um registro não enviado |
| Sessões ativas | Reconstituíveis por nova autenticação. Restaurá-las seria restaurar credencial antiga |
| Arquivos de extrato originais | Rebaixáveis do banco a qualquer momento. A informação relevante já está nos lançamentos |

---

## 4. Procedimento de recuperação

Sequência a executar. Escrita em passos verificáveis porque, no momento em que for necessária, quem a
executar estará sob pressão.

| # | Passo | Verificação |
|---|---|---|
| 1 | **Identificar o momento a restaurar.** Em desastre, a cópia mais recente. Em corrupção, a última cópia anterior ao erro | Momento escolhido é anterior ao primeiro registro corrompido |
| 2 | **Restaurar em instância nova**, sem sobrescrever a existente | A instância original permanece intacta e disponível para comparação |
| 3 | **Conferir a integridade** contando registros das entidades críticas: espécies, lançamentos, pedidos, perdas | As contagens são compatíveis com o esperado para a data |
| 4 | **Conferir o saldo financeiro** do último mês fechado contra o extrato bancário | Os saldos coincidem — é a verificação mais forte, porque confronta o sistema com fonte externa |
| 5 | **Apontar a aplicação** para a instância restaurada | Sistema responde e autentica |
| 6 | **Verificar as migrações pendentes** e aplicá-las, se a cópia for anterior a alguma alteração de esquema | Estrutura compatível com a versão do código em produção |
| 7 | **Comunicar a equipe** sobre o intervalo perdido, para relançamento manual | Equipe sabe o que precisa relançar |

**O passo 4 é o que valida a restauração.** As contagens do passo 3 detectam perda grosseira; a
conferência do saldo contra o extrato é a única verificação que confronta o sistema com uma fonte
externa e independente. É, não por acaso, o mesmo princípio que sustenta todo o subsistema
financeiro.

---

## 5. Teste de restauração

**Backup não testado não é backup.** Uma cópia que nunca foi restaurada é uma hipótese, não um
controle — e o momento de descobrir que ela não funciona não pode ser o do desastre.

| Aspecto | Definição |
|---|---|
| **Periodicidade** | Semestral, e obrigatoriamente após qualquer alteração relevante de infraestrutura |
| **Escopo** | Procedimento completo da seção 4, em instância descartável |
| **Critério de aprovação** | Sistema operante, contagens compatíveis e **saldo do último mês fechado coincidente com o extrato** |
| **Registro** | Data, momento restaurado, tempo decorrido e resultado |

O tempo decorrido no teste é o que valida — ou refuta — o RTO declarado de 8 horas. Um objetivo de
recuperação nunca medido é uma intenção.

---

## 6. Relação com os riscos e ameaças

| Origem | Item tratado |
|---|---|
| [`E3`](E3-analise-de-riscos.md) | **R-07** — perda de dados, impacto crítico |
| [`E4`](E4-modelagem-de-ameacas.md) | **A-10** — perda por falha de infraestrutura, ameaça à disponibilidade |
| [`E4`](E4-modelagem-de-ameacas.md) | **A-09** — alteração indevida de dado consolidado; a retenção de 30 dias é o que permite reverter |
| [`B2`](../B-requisitos/B2-especificacao-requisitos.md) | **RNF-14** — rotina de backup com objetivos declarados |
| [`D3`](../D-arquitetura/D3-diagrama-implantacao.md) | Ponto único de falha aceito; este plano é a contrapartida que torna a aceitação defensável |

---

## 7. Limites deste plano

Declarados para que a proteção não seja lida como maior do que é:

- **Não há alta disponibilidade.** Falha do provedor derruba o sistema até que a restauração termine.
  A aceitação é declarada em [`D3`](../D-arquitetura/D3-diagrama-implantacao.md).
- **O RPO de 24 horas admite perda real.** Registros de um dia podem se perder, e o passo 7 do
  procedimento existe justamente para tratá-la.
- **A restauração é manual.** Não existe automação de recuperação; o procedimento depende de uma
  pessoa executá-lo.
- **O teste semestral é o único que valida a cadeia.** Entre dois testes, a confiança no backup é
  presumida, não verificada.
