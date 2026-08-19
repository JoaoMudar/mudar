# E5 — Mapeamento de tratamento de dados pessoais (LGPD)

> **Artefato:** Mapeamento LGPD · **Bloco:** E — Qualidade, riscos e segurança
> **Destino no TCC:** Capítulo 4, seção 4.6 — Segurança e controle de acesso
> **Fundamentação:** Lei nº 13.709/2018 (Lei Geral de Proteção de Dados Pessoais).
> ⚠️ **Exige acréscimo ao Capítulo 2.5 do TCC** — o referencial atual não menciona a legislação de
> proteção de dados. O texto proposto está em [`../word/`](../word/).

---

## 1. Por que este artefato existe

O sistema trata dados pessoais de três grupos distintos — clientes, fornecedores e os próprios
usuários — e um deles inclui **pessoas que não são usuárias do sistema nem clientes da empresa**: as
contrapartes que aparecem nos lançamentos financeiros, incluindo membros da família e pacientes
identificáveis por transferência recebida na conta da clínica.

Essa última categoria é a que torna o mapeamento necessário e não meramente formal. Um sistema que
importa nove extratos bancários pessoais e empresariais trata dado pessoal de terceiros que jamais
consentiram nada — e a análise de quem são, para quê e por quanto tempo precisa ser feita antes de o
sistema entrar em operação, não depois.

---

## 2. Inventário do tratamento

### 2.1 Dados de clientes

| Dado | Finalidade | Base legal | Retenção |
|---|---|---|---|
| Nome | Identificação comercial e emissão de nota fiscal | Execução de contrato (art. 7º, V) | Enquanto houver relação comercial; dado fiscal, 5 anos |
| Telefone | Contato sobre pedidos e entregas | Execução de contrato (art. 7º, V) | Idem |
| CPF ou CNPJ | Emissão de nota fiscal | **Obrigação legal** (art. 7º, II) | 5 anos, por exigência fiscal |
| Razão social, inscrição estadual | Emissão de nota fiscal a pessoa jurídica | Obrigação legal (art. 7º, II) | 5 anos |
| Endereço completo | Emissão de nota fiscal e entrega | Execução de contrato e obrigação legal | 5 anos |
| Correio eletrônico | Envio de documentos da venda | Execução de contrato (art. 7º, V) | Enquanto houver relação comercial |

**Titulares:** clientes pessoa física. Clientes pessoa jurídica não são titulares — mas o nome do
contato e o documento do responsável, quando informados, são dado pessoal.

**Minimização aplicada:** os campos fiscais são **todos opcionais** no cadastro. Só são exigidos
quando há nota fiscal a emitir (RF-40). O cliente de atacado que não pede nota permanece cadastrado
apenas com nome e telefone — coleta-se o mínimo necessário à finalidade, e apenas quando a finalidade
existe.

### 2.2 Dados de fornecedores

| Dado | Finalidade | Base legal | Retenção |
|---|---|---|---|
| Nome, contato, telefone, mensageria | Consulta de preço e disponibilidade | **Legítimo interesse** (art. 7º, IX) | Enquanto houver relação, ou até oposição do titular |
| Correio eletrônico, perfil em rede social | Idem | Legítimo interesse (art. 7º, IX) | Idem |
| Cidade e estado | Cálculo de distância e apresentação em mapa | Legítimo interesse (art. 7º, IX) | Idem |
| Coordenadas geográficas | Idem — obtidas por geocodificação da cidade | Legítimo interesse (art. 7º, IX) | Idem |

**Ponto de atenção — legítimo interesse exige contrapartida.** O contato comercial com fornecedores
apoia-se em legítimo interesse, e não em consentimento. A lei condiciona essa base à garantia do
**direito de oposição** do titular, e o sistema o implementa de forma estrutural:

- O cadastro de fornecedor tem um estado **"não contatar"**, que registra a oposição manifestada.
- Fornecedor nesse estado é **excluído da seleção de cotação pelo sistema**, e não apenas sinalizado
  — ver [`C2`, UC-32, FE-1](../C-modelagem/C2-especificacao-casos-de-uso.md).
- O envio de qualquer mensagem é **ação manual do usuário**, jamais disparo automático. Não existe
  caminho pelo qual o sistema contate alguém sozinho.

> A geocodificação merece registro específico: cidade e estado do fornecedor são enviados a serviço
> externo para obter coordenadas. É **transferência de dado a terceiro**, ainda que de granularidade
> municipal e não de endereço. O resultado é armazenado localmente justamente para que a consulta
> ocorra uma única vez por fornecedor, e não a cada exibição do mapa.

### 2.3 Dados de usuários do sistema

| Dado | Finalidade | Base legal | Retenção |
|---|---|---|---|
| Nome de exibição e identificador de acesso | Identificação no sistema | Execução de contrato de trabalho (art. 7º, V) | Enquanto durar o vínculo |
| Resumo criptográfico da senha | Autenticação | Execução de contrato (art. 7º, V) | Idem |
| Endereço de origem e descrição do dispositivo | **Segurança da informação** — auditoria de acesso e identificação de aparelho | Legítimo interesse (art. 7º, IX) | 12 meses |
| Registro de tentativas de autenticação | Detecção de acesso indevido | Legítimo interesse (art. 7º, IX) | 12 meses |

**Transparência devida.** O registro de endereço de acesso e de dispositivo é monitoramento de
pessoa identificada, ainda que com finalidade de segurança. Os usuários devem ser informados de que
esse registro existe, do que ele contém e de por quanto tempo é mantido. A tela de sessões ativas
cumpre parte dessa transparência ao exibir ao próprio usuário os dados registrados sobre ele.

### 2.4 Dados de contrapartes financeiras — **o caso mais sensível**

| Dado | Finalidade | Base legal | Retenção |
|---|---|---|---|
| Nome da contraparte do lançamento | Classificação do gasto por destinatário | Legítimo interesse e obrigação legal contábil | 5 anos |
| Documento da contraparte, quando informado | Identificação inequívoca | Legítimo interesse (art. 7º, IX) | 5 anos |
| Descrição original do lançamento bancário | **Prova de origem** — jamais editada | Obrigação legal (art. 7º, II) | 5 anos |

Três características tornam este o tratamento de maior risco do sistema:

1. **A coleta não é declarada pelo titular.** O nome entra pela importação do extrato, escrito pelo
   banco. Ninguém preencheu formulário algum.
2. **O escopo excede a atividade empresarial.** A base cobre nove contas, das quais parte é pessoal.
   Aparecem nela pessoas sem qualquer relação com o viveiro — familiares, prestadores de serviço
   pessoal, e transferências recebidas na conta da clínica de fonoaudiologia, que podem identificar
   pacientes.
3. **Dado de paciente é dado sensível.** Informação referente à saúde recebe proteção reforçada pelo
   art. 11 da lei. Uma transferência recebida de pessoa física na conta da clínica, ainda que o
   sistema não registre diagnóstico algum, associa uma pessoa a um serviço de saúde.

**Controles aplicados:**

- **Acesso exclusivo da chefia e do administrador à base bancária** (RF-62): extrato, lançamento,
  compra, custo fixo e fechamento. Gerência e colaborador não abrem nenhuma dessas telas, nem em
  leitura — é a restrição mais rígida do sistema, e sua motivação é de privacidade, não de escopo
  funcional. O que **deriva** dessa base sem expô-la — custo unitário, margem, preço, indicadores
  operacionais — permanece legível para a gerência: são agregados que não dizem para quem se pagou
  (ver [`D4 §3.2`](../D-arquitetura/D4-matriz-rbac.md)).
- **Esquema de banco separado**, o que torna a fronteira de acesso estrutural e não apenas
  procedimental (ver [`C6`, §3.5](../C-modelagem/C6-modelo-entidade-relacionamento.md)).
- **Separação por centro de custo**, que permite distinguir o que é da empresa do que é pessoal — e
  é pré-requisito para qualquer decisão futura de restringir ou eliminar o tratamento do que não é
  empresarial.

> **Recomendação registrada:** a conta da clínica deveria ficar **fora do escopo de importação**. Sua
> presença acrescenta dado potencialmente sensível a um sistema de gestão de viveiro, sem
> contrapartida — a clínica não é objeto deste trabalho, e sua exclusão não prejudica nenhum
> indicador do viveiro. É decisão do titular do negócio, e fica aqui documentada como recomendação
> técnica.

---

## 3. Direitos dos titulares e como o sistema os atende

| Direito (art. 18) | Situação no sistema |
|---|---|
| **Confirmação e acesso** | Consulta ao cadastro atende. Não há tela de autoatendimento — a solicitação é processada manualmente pela chefia |
| **Correção** | Cadastros de cliente e fornecedor são editáveis |
| **Anonimização ou eliminação** | Parcialmente atendido. O arquivamento lógico preserva o dado; a eliminação efetiva depende de operação manual no banco |
| **Portabilidade** | Não implementado. Registrado como pendência |
| **Informação sobre compartilhamento** | Este documento identifica o único compartilhamento: cidade e estado enviados ao serviço de geocodificação |
| **Revogação de consentimento** | Não aplicável — nenhum tratamento se apoia em consentimento |
| **Oposição** | Atendido para fornecedores, pelo estado "não contatar" |

### Pendências reconhecidas

Registrá-las é preferível a declarar conformidade que não existe:

1. **Não há rotina de eliminação por prazo de retenção.** Os prazos estão declarados neste documento;
   sua aplicação é manual.
2. **Não há aviso de privacidade apresentado aos titulares.** Clientes e fornecedores não são
   informados formalmente sobre o tratamento.
3. **Portabilidade não implementada.**
4. **A transparência aos usuários sobre o registro de acesso é parcial**, limitada à tela de sessões
   ativas.

Nenhuma das quatro impede a operação, e todas são de baixo custo de implementação. Ficam registradas
como escopo de continuidade.

---

## 4. Síntese das bases legais

| Base legal | Onde se aplica |
|---|---|
| **Obrigação legal** (art. 7º, II) | Documento fiscal do cliente, dados de nota fiscal, guarda de registro contábil |
| **Execução de contrato** (art. 7º, V) | Nome, contato e endereço de cliente; dados de usuário do sistema |
| **Legítimo interesse** (art. 7º, IX) | Contato de fornecedor, registro de acesso, classificação de contraparte financeira |
| **Consentimento** | **Não utilizado em nenhum tratamento** |

A ausência de consentimento como base é deliberada e vale explicitar: consentimento exige coleta,
registro e possibilidade de revogação, e é a base mais frágil quando o tratamento é necessário à
operação. Onde o tratamento é indispensável ao contrato ou à obrigação fiscal, a base adequada é
outra — e apoiá-lo em consentimento criaria a situação absurda de o cliente poder revogar o dado
exigido pela nota fiscal que ele mesmo pediu.
