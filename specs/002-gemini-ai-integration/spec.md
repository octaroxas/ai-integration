# Feature Specification: Integração com o Gemini na API

**Feature Branch**: `feat/enviroment` (branch atual; nenhuma branch nova foi criada)

**Created**: 2026-10-27

**Status**: Draft

**Input**: User description: "Integrar a API do projeto a um modelo de IA (Google Gemini, via chave gratuita do Google AI Studio) de forma isolada, antes de existir qualquer endpoint público ou tela. O desenvolvedor deve poder chamar um agente de análise de dados, passando um texto (dados, relatório, anotações), e receber um resumo estruturado e planos de ação gerados pelo modelo. A chave do provedor existe somente na configuração privada da API (nunca versionada, nunca exposta ao navegador, nunca impressa em logs ou mensagens), e o repositório traz apenas uma entrada vazia de exemplo. O modelo usado é definido por configuração, sem nome de modelo fixo no código, e o modelo gratuito disponível hoje no Google AI Studio deve ser conferido. Falhas do provedor (cota excedida, tempo esgotado, chave inválida, resposta vazia) devem virar um erro claro e tratado, sem expor detalhes internos nem derrubar a aplicação. A validação é feita no console interativo da API: chamar o agente com um texto devolve a análise do modelo, e com uma chave inválida devolve o erro tratado, não uma exceção crua. Não inclui o endpoint HTTP `POST /api/processar-dados`, a tela de análise, testes automatizados nem outros provedores de IA, tratados em itens seguintes."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Analisar um texto com o modelo de IA (Priority: P1)

O desenvolvedor, no console interativo da API, chama o agente de análise passando um texto (dados, relatório, anotações) e recebe de volta a análise gerada pelo modelo: um resumo estruturado e planos de ação.

**Why this priority**: é o núcleo do projeto (a comunicação com o modelo de IA). Sem essa chamada funcionando e isolada, o endpoint e a tela dos itens seguintes não têm o que expor.

**Independent Test**: com uma chave válida configurada na API, abrir o console interativo, chamar o agente com um texto e conferir que a resposta traz o resumo estruturado e os planos de ação. Entrega por si só a integração validada, sem endpoint nem tela.

**Acceptance Scenarios**:

1. **Given** a stack no ar e uma chave válida configurada na API, **When** o desenvolvedor chama o agente com um texto no console interativo, **Then** recebe uma análise que contém um resumo estruturado e planos de ação.
2. **Given** a mesma configuração, **When** o desenvolvedor chama o agente com textos diferentes, **Then** cada resposta reflete o conteúdo do texto enviado e não uma resposta genérica fixa.
3. **Given** o repositório recém-clonado, **When** o desenvolvedor abre o arquivo de variáveis de exemplo da API, **Then** encontra a entrada da chave vazia, sem nenhum valor real.

---

### User Story 2 - Falhas do provedor viram erros claros (Priority: P2)

Quando o provedor de IA falha (chave inválida, cota excedida, tempo esgotado ou resposta vazia), o desenvolvedor recebe um erro claro e tratado, sem detalhes internos, e a aplicação continua funcionando para a próxima chamada.

**Why this priority**: o provedor gratuito tem cota e falha com frequência; sem tratamento, as camadas seguintes (endpoint e tela) herdariam exceções cruas e possível vazamento de informação. Depende da chamada da US1 existir, mas é validável sozinho com uma chave inválida.

**Independent Test**: configurar uma chave inválida, chamar o agente no console interativo e conferir que o retorno é um erro tratado com mensagem clara, sem rastros internos nem a chave. Em seguida, restaurar a chave válida e conferir que a chamada seguinte funciona.

**Acceptance Scenarios**:

1. **Given** uma chave inválida configurada, **When** o desenvolvedor chama o agente, **Then** recebe um erro tratado que indica problema de autenticação com o provedor, não uma exceção crua.
2. **Given** a cota do provedor esgotada, **When** o desenvolvedor chama o agente, **Then** recebe um erro tratado que indica limite de uso atingido.
3. **Given** o provedor demorando além do tempo limite, **When** o desenvolvedor chama o agente, **Then** recebe um erro tratado que indica tempo esgotado.
4. **Given** o provedor respondendo sem conteúdo, **When** o desenvolvedor chama o agente, **Then** recebe um erro tratado que indica resposta vazia.
5. **Given** qualquer uma das falhas acima, **When** o desenvolvedor lê a mensagem de erro e os logs da API, **Then** não encontra a chave, detalhes técnicos internos nem respostas brutas do provedor.
6. **Given** uma falha anterior já tratada, **When** o desenvolvedor chama o agente de novo com a configuração corrigida, **Then** a chamada funciona normalmente, sem precisar reiniciar a API.

---

### User Story 3 - Trocar o modelo apenas por configuração (Priority: P3)

O desenvolvedor muda o modelo de IA usado alterando só uma variável de ambiente, sem editar código, e a chamada seguinte usa o novo modelo.

**Why this priority**: modelos mudam rápido e o gratuito disponível hoje pode não ser o mesmo amanhã. É um refinamento de manutenção, não bloqueia a validação da integração.

**Independent Test**: alterar o valor do modelo na configuração privada da API, chamar o agente de novo e conferir que a chamada usa o modelo novo, sem nenhuma mudança em arquivos de código.

**Acceptance Scenarios**:

1. **Given** um modelo definido na configuração, **When** o desenvolvedor troca o valor por outro modelo disponível e chama o agente, **Then** a chamada usa o novo modelo sem nenhuma alteração de código.
2. **Given** um modelo inexistente ou indisponível na configuração, **When** o desenvolvedor chama o agente, **Then** recebe um erro tratado e claro, não uma exceção crua.

---

### Edge Cases

- Chave ausente (variável não definida ou vazia): o agente devolve um erro tratado que indica configuração ausente, sem chamar o provedor.
- Texto vazio ou só com espaços: a chamada é recusada com erro claro antes de consumir cota; limites de tamanho e formato de entrada ficam para o endpoint (item 4).
- Texto muito longo, acima do que o modelo aceita: o erro vem do provedor e é tratado como as demais falhas, sem exceção crua.
- Modelo respondendo em formato inesperado (sem resumo ou sem planos de ação): a resposta é tratada como inválida ou incompleta, com erro claro, em vez de passar adiante como se estivesse correta.
- A chave nunca aparece em mensagens de erro, logs, respostas, specs ou exemplos, nem nos casos de "chave inválida".
- Chamadas seguidas que estouram a cota: cada uma devolve o erro tratado de limite de uso, e a API continua de pé.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O desenvolvedor MUST poder chamar um agente de análise de dados passando um texto e receber a análise gerada pelo modelo de IA.
- **FR-002**: A análise devolvida MUST conter duas partes distintas: um resumo estruturado do conteúdo e planos de ação.
- **FR-003**: A comunicação com o provedor de IA MUST ficar isolada em um único ponto da API; nenhuma rota ou controller pode chamar o provedor diretamente.
- **FR-004**: A chave do provedor MUST existir apenas na configuração privada da API (`apps/api/.env`) e MUST NOT ser versionada, exposta ao navegador, impressa em logs ou incluída em mensagens de erro, respostas, specs ou exemplos.
- **FR-005**: O repositório MUST trazer em `apps/api/.env.example` a entrada da chave vazia, sem valor real.
- **FR-006**: O modelo de IA MUST ser definido por variável de ambiente, sem nome de modelo fixo no código.
- **FR-007**: O valor de exemplo do modelo no `apps/api/.env.example` MUST corresponder a um modelo gratuito efetivamente disponível no Google AI Studio na data da implementação.
- **FR-008**: As instruções do agente MUST orientá-lo a analisar o conteúdo recebido e devolver o resumo estruturado e os planos de ação.
- **FR-009**: Falhas do provedor (chave inválida, cota excedida, tempo esgotado, resposta vazia) MUST virar um erro claro e tratado, distinguível por tipo de falha.
- **FR-010**: Os erros tratados MUST NOT expor detalhes internos (rastros, caminhos, respostas brutas do provedor) nem a chave.
- **FR-011**: Uma falha do provedor MUST NOT derrubar a API; a chamada seguinte MUST funcionar normalmente assim que a causa for corrigida, sem reiniciar.
- **FR-012**: A API MUST responder com erro tratado quando a chave estiver ausente ou o modelo configurado não existir, sem chamar o provedor no primeiro caso.
- **FR-013**: Esta feature MUST NOT incluir o endpoint `POST /api/processar-dados`, a tela de análise, testes automatizados nem outros provedores de IA.

### Key Entities

- **Análise**: resultado devolvido pelo agente para um texto de entrada; composto por um resumo estruturado e por planos de ação. Não é persistida.
- **Falha do provedor**: situação em que o modelo de IA não entrega uma análise utilizável; classificada por tipo (autenticação, limite de uso, tempo esgotado, resposta vazia ou inválida) e apresentada ao desenvolvedor como erro tratado.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Com uma chave válida e disponibilidade do provedor, 100% das chamadas com um texto não vazio devolvem uma análise com resumo estruturado e planos de ação, em até 60 segundos.
- **SC-002**: Com uma chave inválida, 100% das chamadas devolvem um erro tratado e 0 exceções cruas chegam ao desenvolvedor.
- **SC-003**: Cada uma das 4 falhas do provedor (chave inválida, cota excedida, tempo esgotado, resposta vazia) produz uma mensagem de erro própria e compreensível, sem consultar código ou logs para entender a causa.
- **SC-004**: 0 ocorrências da chave do provedor no git, em logs, em respostas e em mensagens de erro, inclusive nos cenários de falha.
- **SC-005**: Trocar o modelo exige alterar 1 variável de ambiente e 0 arquivos de código.
- **SC-006**: Depois de qualquer falha tratada, a chamada seguinte com a configuração corrigida funciona na primeira tentativa, sem reiniciar a API.

## Assumptions

- O desenvolvedor tem uma chave gratuita do Google AI Studio e a coloca em `apps/api/.env`; a validação consome a cota gratuita real, então só a validação manual (US1) e o cenário de chave inválida (US2) usam o provedor.
- A pilha é a da constituição (Laravel 13 com o AI SDK nativo, Gemini como provedor primário); o nome do pacote, o formato da configuração e o modelo exato são decididos no plano, após conferir a documentação oficial.
- "Resumo estruturado" significa um resumo organizado em partes identificáveis (por exemplo, tópicos); o formato exato é detalhe de plano ou de clarificação.
- O idioma das respostas e das mensagens de erro é o português do Brasil, conforme a constituição.
- O limite de tempo de 60 segundos do SC-001 é um valor de partida razoável para o modelo gratuito e pode ser ajustado no plano.
- O erro tratado é entregue ao chamador como um tipo de erro próprio do projeto (ou resultado equivalente) que o item 4 converterá em resposta HTTP; o formato exato é decidido no plano ou na clarificação.
- A validação de tamanho e formato da entrada, o contrato HTTP e a exibição ao usuário final ficam para os itens 4 e 5 do backlog.
- Os testes automatizados da integração, com o cliente de IA substituído por um fake, ficam para o item 6, conforme o princípio V da constituição.
- Fora de escopo, tratado em itens seguintes: endpoint `POST /api/processar-dados`, tela de análise, testes automatizados, outros provedores de IA, streaming e histórico de análises.
