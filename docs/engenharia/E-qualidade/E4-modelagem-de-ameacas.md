# E4 — Modelagem de ameaças e controles

> **Artefato:** Modelagem de ameaças · **Bloco:** E — Qualidade, riscos e segurança
> **Destino no TCC:** Capítulo 4, seção 4.6 — Segurança e controle de acesso
> **Fundamentação:** Sommerville (2011) classifica as ameaças em três tipos — à
> **confidencialidade**, à **integridade** e à **disponibilidade** — e os controles em três
> categorias: **prevenção de vulnerabilidade**, **detecção e neutralização de ataques** e
> **limitação de exposição e recuperação**. O autor apresenta, ainda, a análise de risco de ciclo de
> vida de um sistema cliente-servidor com autenticação por login e senha, identificando
> vulnerabilidades e definindo a redução de risco para cada uma. **Este documento é a aplicação
> direta daquele método ao sistema em projeto.**

---

## 1. Ativos a proteger

Antes das ameaças, o que há a perder. A coluna de sensibilidade orienta a prioridade dos controles.

| Ativo | Conteúdo | Sensibilidade |
|---|---|---|
| **Dados financeiros** | Lançamentos de nove contas, incluindo gasto pessoal da família e da clínica | **Máxima** — dado pessoal de terceiros não usuários do sistema |
| **Dados pessoais de clientes** | Nome, documento, telefone, endereço, correio eletrônico | **Alta** — sujeitos à legislação de proteção de dados |
| **Estrutura de custo e margem** | Custo unitário por espécie e margem por canal | **Alta** — informação concorrencialmente sensível |
| **Cadastro de fornecedores** | Contatos e preços da rede de terceiros | **Alta** — construída ao longo de anos, de difícil reconstituição |
| **Dados operacionais** | Produção, perdas, estoque | **Média** — sem valor externo, mas irreprodutíveis |
| **Credenciais de acesso** | Senhas e identificadores de sessão | **Máxima** — chave de todo o restante |

---

## 2. Ameaças e controles

Formato: ativo → ameaça → vulnerabilidade → impacto → controle, classificado pelo tipo de ameaça e
pelo tipo de controle de Sommerville.

### A-01 · Senha fraca escolhida pelo usuário

| | |
|---|---|
| **Tipo de ameaça** | Confidencialidade |
| **Vulnerabilidade** | Usuários sem formação técnica tendem a escolher senha curta e previsível |
| **Impacto** | Acesso completo ao perfil comprometido. Se for a chefia, inclui o financeiro |
| **Probabilidade** | Alta |

**Controles:**
- *Prevenção* — política de senha verificada no momento da definição, recusando as previsíveis.
- *Prevenção* — troca obrigatória no primeiro acesso (RF-02), para que a senha temporária comunicada
  verbalmente não permaneça em uso.
- *Detecção* — contagem de tentativas malsucedidas consecutivas, com bloqueio temporário.

> **Não adotada:** troca periódica obrigatória. Sommerville usa exatamente este caso como exemplo de
> falha originada em decisão de projeto — a senha trocada com frequência é anotada em papel, e o
> controle produz a vulnerabilidade que pretendia evitar.

### A-02 · Vazamento de credencial

| | |
|---|---|
| **Tipo de ameaça** | Confidencialidade |
| **Vulnerabilidade** | Senha compartilhada verbalmente entre colegas, ou anotada |
| **Impacto** | Acesso indevido indistinguível de acesso legítimo |
| **Probabilidade** | Média |

**Controles:**
- *Prevenção* — senha individual por pessoa, jamais compartilhada por perfil.
- *Detecção* — registro de toda tentativa de autenticação com origem e dispositivo (RF-04),
  permitindo identificar acesso de local ou aparelho incomum.
- *Limitação* — lista de sessões ativas com encerramento à distância (RF-07).

### A-03 · Aparelho perdido com sessão ativa

| | |
|---|---|
| **Tipo de ameaça** | Confidencialidade |
| **Vulnerabilidade** | Sessão de duração longa nos dispositivos de campo, adotada por razão de usabilidade |
| **Impacto** | Acesso ao perfil até que a sessão seja encerrada |
| **Probabilidade** | Média — celular em ambiente de trabalho rural |

**Controles:**
- *Limitação* — encerramento de sessão à distância pelo próprio usuário, sem depender de
  administrador (RF-07).
- *Detecção* — registro de dispositivo e origem em cada sessão, que permite reconhecer o aparelho na
  lista.
- *Prevenção* — o perfil colaborador não acessa preço, custo nem financeiro (ver
  [`D4`](../D-arquitetura/D4-matriz-rbac.md)), o que limita o alcance de um aparelho de campo
  comprometido.

> Este é o caso em que o compromisso entre proteção e produtividade foi resolvido a favor da
> produtividade — e o controle compensatório é o que torna a decisão defensável.

### A-04 · Escalada de privilégio

| | |
|---|---|
| **Tipo de ameaça** | Confidencialidade e integridade |
| **Vulnerabilidade** | Verificação de permissão feita apenas na interface, e não na operação |
| **Impacto** | Perfil operacional alcançando dados financeiros ou de margem |
| **Probabilidade** | Baixa, dado o controle adotado |

**Controles:**
- *Prevenção* — verificação de permissão **a cada operação**, e não por ocultação de elementos da
  interface (RF-06). Ocultar um botão não é controle de acesso.
- *Prevenção* — regras de acesso executadas exclusivamente no servidor (RNF-12).
- *Prevenção* — nenhum perfil de negócio administra usuários ou perfis, o que remove a escalada do
  conjunto de caminhos de uso normal.

### A-05 · Injeção de comando em consulta ao banco

| | |
|---|---|
| **Tipo de ameaça** | Confidencialidade e integridade |
| **Vulnerabilidade** | Concatenação de entrada do usuário em consulta |
| **Impacto** | Leitura ou destruição de qualquer dado do sistema |
| **Probabilidade** | Baixa, dado o controle adotado |

**Controles:**
- *Prevenção* — consultas parametrizadas em todo acesso ao banco, sem exceção. Entrada de usuário é
  sempre parâmetro, nunca texto concatenado à consulta.
- *Prevenção* — validação de tipo nas entradas antes de chegarem à camada de dados.

### A-06 · Exposição de credencial de banco no código

| | |
|---|---|
| **Tipo de ameaça** | Confidencialidade |
| **Vulnerabilidade** | Credencial versionada por engano, ou entregue ao navegador |
| **Impacto** | Acesso direto ao banco, contornando todo o controle da aplicação |
| **Probabilidade** | Média — é erro comum e de consequência máxima |

**Controles:**
- *Prevenção* — credenciais em configuração de ambiente, jamais no código (RNF-22).
- *Prevenção* — acesso ao banco restrito à camada de servidor; o navegador nunca recebe credencial
  (RNF-12).
- *Detecção* — verificação automática antes de cada envio ao repositório, que bloqueia o envio ao
  identificar arquivo sensível (RNF-21).

> A detecção automática é o controle que importa aqui, porque este é um risco de **erro humano**, e
> não de ataque. Sommerville observa que a maioria das falhas de segurança decorre de erro humano —
> o controle eficaz é o que não depende de o humano lembrar.

### A-07 · Interceptação de tráfego

| | |
|---|---|
| **Tipo de ameaça** | Confidencialidade |
| **Vulnerabilidade** | Uso em rede sem fio de terceiros, fora do viveiro |
| **Impacto** | Leitura de dados em trânsito, incluindo identificador de sessão |
| **Probabilidade** | Baixa |

**Controles:**
- *Prevenção* — comunicação cifrada obrigatória em todas as fronteiras (RNF-13).
- *Prevenção* — cookie de sessão marcado para trafegar somente por canal cifrado e para não ser
  legível por código de página (RNF-11).

### A-08 · Dado sensível retido no dispositivo

| | |
|---|---|
| **Tipo de ameaça** | Confidencialidade |
| **Vulnerabilidade** | Aplicação que funciona sem conexão precisa reter dado localmente |
| **Impacto** | Dado acessível a quem tenha o aparelho |
| **Probabilidade** | Média |

**Controles:**
- *Prevenção* — a fila local retém **apenas registros pendentes de envio**, e não cópia do banco. Um
  registro de perda em fila não revela custo, margem nem dado de cliente.
- *Prevenção* — o dispositivo do colaborador não recebe dado financeiro nem de precificação, por
  decisão da matriz de acesso.

> É a razão de a sincronização ser por fila e não por réplica local do banco. A réplica seria mais
> confortável de programar e colocaria a base inteira em seis celulares que circulam em campo.

### A-09 · Alteração indevida de dado financeiro consolidado

| | |
|---|---|
| **Tipo de ameaça** | Integridade |
| **Vulnerabilidade** | Edição de lançamento de período já conferido |
| **Impacto** | Divergência entre saldo do sistema e saldo do banco, que invalida os indicadores |
| **Probabilidade** | Média — o risco é de erro, não de má-fé |

**Controles:**
- *Prevenção* — mês fechado não aceita alteração (RF-60). A reabertura é ato explícito e registrado.
- *Prevenção* — descrição e data de movimentação nunca são editáveis: são a prova de que a linha veio
  do banco.
- *Detecção* — conferência do saldo calculado contra o saldo do extrato no fechamento.

### A-10 · Perda de dados por falha de infraestrutura

| | |
|---|---|
| **Tipo de ameaça** | **Disponibilidade** |
| **Vulnerabilidade** | Ponto único de falha na aplicação em nuvem, aceito em [`D3`](../D-arquitetura/D3-diagrama-implantacao.md) |
| **Impacto** | Perda do levantamento primário, irreprodutível a custo razoável |
| **Probabilidade** | Baixa |

**Controles:** *limitação de exposição e recuperação* — ver
[`E6`](E6-plano-backup-recuperacao.md).

### A-11 · Indisponibilidade temporária do sistema

| | |
|---|---|
| **Tipo de ameaça** | **Disponibilidade** |
| **Vulnerabilidade** | Dependência de conexão e de provedor externo |
| **Impacto** | Registros adiados; operação do viveiro não interrompida |
| **Probabilidade** | Média |

**Controles:**
- *Limitação* — a fila local permite continuar registrando em campo durante a indisponibilidade.
- *Aceitação declarada* — o sistema é ferramenta de gestão, não de controle de processo em tempo
  real. Algumas horas fora do ar adiam registro, não param a produção de mudas.

---

## 3. Síntese pelos três tipos de ameaça

| Tipo (Sommerville) | Ameaças | Concentração dos controles |
|---|---|---|
| **Confidencialidade** | A-01, A-02, A-03, A-04, A-05, A-06, A-07, A-08 | Prevenção, com detecção onde o erro humano é a causa provável |
| **Integridade** | A-04, A-05, A-09 | Prevenção por restrição estrutural — o dado consolidado simplesmente não é editável |
| **Disponibilidade** | A-10, A-11 | Limitação e recuperação; nenhuma prevenção, por decisão de custo |

**Oito das onze ameaças são de confidencialidade.** A concentração reflete a natureza do sistema:
seu ativo mais sensível não é a operação, é o dado financeiro que mistura empresa e família — e o
risco predominante é de acesso indevido, não de destruição.

---

## 4. Síntese pelos três tipos de controle

| Tipo (Sommerville) | Exemplos neste sistema |
|---|---|
| **Prevenção de vulnerabilidade** | Senha e sessão armazenadas apenas como resumo; verificação de permissão por operação; consultas parametrizadas; cifra em trânsito; dado consolidado não editável; fila local sem cópia do banco |
| **Detecção e neutralização** | Registro de tentativas de autenticação; bloqueio por tentativas sucessivas; verificação automática de arquivo sensível antes do envio; conferência de saldo no fechamento |
| **Limitação de exposição e recuperação** | Encerramento de sessão à distância; restrição do alcance de cada perfil; backup e procedimento de restauração |

---

## 5. O que este sistema deliberadamente não faz

Registrar os controles **descartados** e o motivo evita que a ausência seja lida como esquecimento.

| Controle não adotado | Motivo |
|---|---|
| **Autenticação em dois fatores** | Nove usuários sem formação técnica, em ambiente rural com conexão instável. O custo em produtividade excede o ganho, e a alternativa provável seria o compartilhamento de aparelho |
| **Troca periódica obrigatória de senha** | Produz a vulnerabilidade que pretende evitar — o próprio Sommerville o exemplifica |
| **Restrição de acesso por dispositivo previamente aprovado** | Sommerville a menciona como redução de risco possível. Descartada porque a equipe troca de aparelho sem aviso e a administração recairia sobre quem não tem perfil técnico |
| **Cifra dos dados em repouso, além da já provida pelo serviço** | O ganho marginal não compensa a complexidade de gestão de chaves num projeto sem administrador dedicado |
| **Redundância de infraestrutura** | Ponto único de falha aceito e declarado, por incompatibilidade com o orçamento de uma microempresa |

---

## 6. Rastreabilidade

| Ameaça | Requisitos que a tratam |
|---|---|
| A-01 | RF-02, RNF-09 |
| A-02 | RF-04, RF-07, RNF-09 |
| A-03 | RF-07, RF-04, RF-62 |
| A-04 | RF-06, RNF-12 |
| A-05 | RNF-12 |
| A-06 | RNF-12, RNF-21, RNF-22 |
| A-07 | RNF-11, RNF-13 |
| A-08 | RNF-05, RF-62 |
| A-09 | RF-59, RF-60, RF-61 |
| A-10 | RNF-14 |
| A-11 | RNF-05 |
