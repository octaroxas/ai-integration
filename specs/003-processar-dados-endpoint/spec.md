# Feature Specification: Endpoint de processamento de dados

**Feature Branch**: `feat/enviroment` (branch atual; nenhuma branch nova foi criada)

**Created**: 2026-10-27

**Status**: Draft

**Input**: User description: "Endpoint `POST /api/processar-dados` (item 4 de `docs/ideias.md`). A web precisa de um contrato HTTP simples para enviar um texto e receber a análise do agente `DataAnalyst` (item 3, spec 002). A rota recebe `{ \"conteudo\": \"...\" }` e responde `{ \"sucesso\": true, \"analise\": ... }`. O conteúdo é validado (obrigatório, texto, com tamanho máximo definido nesta spec para proteger a cota). A rota só repassa o texto ao agente existente; nenhuma chamada ao provedor de IA acontece dentro da rota (princípio IV). Os erros têm formato consistente, com `sucesso: false` e mensagem em português: 422 para validação e 5xx/502 para falha do provedor (`AnaliseFalhouException`). O CORS libera só a origem do frontend (`http://localhost:3002` em dev). O contrato (requisição, resposta, erros) é documentado. Critério de aceite: um `curl` com texto válido devolve a análise; sem `conteudo` devolve 422; com o provedor indisponível devolve erro claro. Fora de escopo: a tela no Next.js (item 5) e os testes automatizados completos (item 6)."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Enviar um texto e receber a análise (Priority: P1)

O desenvolvedor (e, no item 5, a tela da web) envia por HTTP um texto à API e recebe de volta a análise gerada pelo modelo de IA: resumo, pontos principais e planos de ação, num envelope de resposta de sucesso.

**Why this priority**: é o contrato que fecha o caminho entre a web e o agente de IA já validado no item 3. Sem ele, a tela do item 5 não tem o que chamar.

**Independent Test**: com a stack no ar e uma chave válida, enviar um `curl` `POST` com um texto à rota e conferir `sucesso: true` e uma análise com resumo, pontos principais e planos de ação. Entrega por si só o contrato HTTP validado, sem tela.

**Acceptance Scenarios**:

1. **Given** a stack no ar e uma chave válida configurada, **When** o cliente envia `{ "conteudo": "<texto válido>" }` à rota `POST /api/processar-dados`, **Then** recebe sucesso (200) com `sucesso: true` e `analise` contendo resumo, pontos principais e planos de ação.
2. **Given** a mesma configuração, **When** o cliente envia textos diferentes, **Then** cada resposta reflete o texto enviado, não uma resposta fixa.
3. **Given** uma requisição bem-sucedida, **When** o desenvolvedor inspeciona a resposta, **Then** ela não contém a chave do provedor, nem o nome do modelo, nem a resposta bruta do provedor.

---

### User Story 2 - Entrada inválida é recusada antes de gastar cota (Priority: P2)

Quando o corpo da requisição não traz um `conteudo` aceitável (ausente, vazio, não textual ou grande demais), a API recusa com um erro de validação claro em português, sem chamar o provedor de IA.

**Why this priority**: o provedor gratuito tem cota limitada; textos inválidos ou enormes não podem consumi-la. Depende da rota existir (US1), mas é validável sozinho com entradas inválidas.

**Independent Test**: enviar requisições sem `conteudo`, com `conteudo` vazio, com valor que não seja texto e com texto acima do limite, e conferir em todas o status 422 com `sucesso: false` e uma mensagem em português, sem nenhuma chamada ao provedor.

**Acceptance Scenarios**:

1. **Given** a rota no ar, **When** o cliente envia o corpo sem `conteudo`, **Then** recebe 422 com `sucesso: false` e mensagem em português dizendo que o conteúdo é obrigatório.
2. **Given** a rota no ar, **When** o cliente envia `conteudo` vazio ou só com espaços, **Then** recebe 422 com `sucesso: false` e a mesma mensagem de obrigatoriedade.
3. **Given** a rota no ar, **When** o cliente envia `conteudo` que não seja texto (número, lista, objeto), **Then** recebe 422 com `sucesso: false` e mensagem indicando que o conteúdo deve ser um texto.
4. **Given** a rota no ar, **When** o cliente envia `conteudo` acima do limite de tamanho, **Then** recebe 422 com `sucesso: false` e mensagem informando o limite máximo.
5. **Given** qualquer uma das entradas inválidas acima, **When** a API responde, **Then** nenhuma chamada ao provedor de IA é feita.

---

### User Story 3 - Falhas do provedor viram erro claro e consistente (Priority: P3)

Quando o provedor de IA falha (chave inválida ou ausente, cota excedida, tempo esgotado, modelo inválido, resposta vazia ou indisponibilidade), a API responde com um erro HTTP de servidor, no mesmo formato dos demais erros (`sucesso: false` e mensagem em português), sem expor detalhes internos, e continua funcionando para a próxima requisição.

**Why this priority**: sem isso, a web receberia páginas de erro cruas ou rastros internos. Depende de a rota existir (US1); é validável com uma chave inválida ou removida.

**Independent Test**: configurar uma chave inválida, enviar um texto válido e conferir uma resposta de erro de servidor com `sucesso: false` e mensagem em português clara. Restaurar a chave e conferir que a requisição seguinte funciona sem reiniciar a API.

**Acceptance Scenarios**:

1. **Given** uma chave inválida ou ausente, **When** o cliente envia um texto válido, **Then** recebe erro de servidor (5xx) com `sucesso: false` e a mensagem em português correspondente à falha.
2. **Given** a cota do provedor esgotada, **When** o cliente envia um texto válido, **Then** recebe erro com `sucesso: false` e mensagem de limite de uso atingido.
3. **Given** o provedor demorando demais ou indisponível, **When** o cliente envia um texto válido, **Then** recebe erro com `sucesso: false` e mensagem clara de tempo esgotado ou indisponibilidade.
4. **Given** o provedor devolvendo resposta vazia ou incompleta, **When** o cliente envia um texto válido, **Then** recebe erro com `sucesso: false` e mensagem informando resposta vazia ou incompleta.
5. **Given** qualquer falha acima, **When** o desenvolvedor lê o corpo da resposta e os logs da API, **Then** não encontra a chave, rastros, caminhos, nem resposta bruta do provedor.
6. **Given** uma falha anterior, **When** a causa é corrigida e o cliente envia de novo, **Then** a requisição funciona sem reiniciar a API.

---

### User Story 4 - Só o frontend pode chamar a API pelo navegador (Priority: P4)

Um navegador executando a tela da web em `http://localhost:3002` consegue chamar a rota; páginas de outras origens não conseguem.

**Why this priority**: sem CORS correto, a tela do item 5 falha no navegador mesmo com o contrato certo; liberar demais expõe a cota a qualquer site. Pode ser validado sozinho com requisições simulando origens diferentes.

**Independent Test**: enviar uma requisição de pré-verificação (`OPTIONS`) e uma `POST` com o cabeçalho de origem `http://localhost:3002` e conferir que a origem é permitida; repetir com outra origem e conferir que não é permitida.

**Acceptance Scenarios**:

1. **Given** a API no ar em dev, **When** o navegador faz a pré-verificação para a rota a partir de `http://localhost:3002`, **Then** a resposta permite a origem, o método `POST` e o cabeçalho de tipo de conteúdo.
2. **Given** a API no ar, **When** a requisição vem de qualquer outra origem, **Then** a resposta não libera essa origem.
3. **Given** a origem do frontend configurada por variável de ambiente, **When** o valor muda (por exemplo, para o domínio de produção), **Then** a API passa a liberar a nova origem sem alteração de código.

---

### User Story 5 - Contrato documentado (Priority: P5)

O desenvolvedor encontra, num documento do repositório, o contrato da rota: requisição, resposta de sucesso, respostas de erro e exemplos de `curl`.

**Why this priority**: a tela do item 5 e quem estuda o projeto precisam saber o formato exato sem ler o código. Não bloqueia a validação do endpoint.

**Independent Test**: seguir apenas o documento, sem ler o código, executar os exemplos de `curl` e obter as respostas descritas.

**Acceptance Scenarios**:

1. **Given** o documento do contrato, **When** o desenvolvedor executa o `curl` de sucesso, **Then** obtém uma resposta no formato descrito.
2. **Given** o documento do contrato, **When** o desenvolvedor executa os `curl` de erro (sem `conteudo`, chave inválida), **Then** obtém as respostas de erro descritas.
3. **Given** o documento do contrato, **When** o desenvolvedor procura os códigos de erro, **Then** encontra cada tipo de falha com seu status HTTP e sua mensagem.

---

### Edge Cases

- Corpo da requisição ausente, vazio ou JSON malformado: tratado como `conteudo` ausente, com 422 e o formato padrão de erro.
- `conteudo` com texto exatamente no limite de tamanho: aceito; um caractere acima: recusado.
- `conteudo` só com espaços ou quebras de linha: recusado como vazio, sem consumir cota.
- `conteudo` com caracteres acentuados, emojis ou quebras de linha: o tamanho conta caracteres, não bytes, e o texto chega íntegro ao agente.
- Cliente sem o cabeçalho que pede resposta em JSON: erros ainda saem em JSON, nunca como página HTML.
- Método diferente de `POST` na rota (por exemplo `GET`): resposta de erro padrão do framework em JSON, sem chamar o agente.
- Rota inexistente em `/api/*`: erro 404 em JSON.
- Requisições seguidas que estouram a cota: cada uma devolve o erro de limite de uso e a API continua de pé.
- Duas requisições simultâneas: cada uma é tratada de forma independente, sem estado compartilhado.
- Erro inesperado que não seja falha do provedor nem validação: resposta 500 no mesmo formato, com mensagem genérica em português, sem rastros.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A API MUST expor a rota `POST /api/processar-dados`, que aceita um corpo JSON com o campo `conteudo`.
- **FR-002**: Em caso de sucesso, a rota MUST responder 200 com `sucesso: true` e `analise` contendo o resultado do agente: resumo, pontos principais e planos de ação, na mesma estrutura devolvida pelo agente do item 3.
- **FR-003**: O campo `conteudo` MUST ser obrigatório, MUST ser texto e MUST ter no máximo 10.000 caracteres; texto vazio ou só com espaços MUST ser recusado.
- **FR-004**: A validação MUST ocorrer antes de qualquer chamada ao agente; entrada inválida MUST NOT consumir cota do provedor.
- **FR-005**: Entrada inválida MUST resultar em 422 com `sucesso: false`, uma mensagem geral em português e os erros por campo também em português.
- **FR-006**: A rota MUST apenas validar a entrada, repassar o texto ao agente do item 3 e devolver o resultado; nenhuma chamada ao provedor de IA, nenhuma regra de negócio e nenhum tratamento de resposta do modelo MUST existir na rota ou no controller.
- **FR-007**: Falhas tratadas do agente (`AnaliseFalhouException`) MUST virar resposta de erro com `sucesso: false` e a mensagem em português da própria falha, com status HTTP definido por tipo de falha: 502 para falhas do provedor ou da integração (autenticação, tempo esgotado, modelo inválido, resposta vazia, indisponibilidade), 503 para limite de uso e configuração ausente, e 422 para entrada vazia.
- **FR-008**: Todas as respostas de erro da rota (validação, falha do provedor, erro inesperado) MUST seguir o mesmo formato: `sucesso: false` e `mensagem`, mais `erros` por campo apenas nos erros de validação.
- **FR-009**: As respostas e as mensagens de erro MUST NOT conter a chave do provedor, rastros, caminhos internos, nome do modelo nem resposta bruta do provedor; os logs MUST NOT conter a chave nem a resposta bruta, e as falhas tratadas do provedor MUST NOT gerar rastro. O rastro de um erro inesperado (500) fica só no log do servidor.
- **FR-010**: Uma falha em uma requisição MUST NOT afetar as seguintes; corrigida a causa, a próxima requisição MUST funcionar sem reiniciar a API.
- **FR-011**: A API MUST responder JSON em todas as respostas de `/api/*`, inclusive erros, mesmo que o cliente não envie o cabeçalho que pede JSON.
- **FR-012**: O CORS MUST liberar apenas a origem do frontend, lida de variável de ambiente (default `http://localhost:3002` em dev), com o método `POST` e o cabeçalho de tipo de conteúdo; outras origens MUST NOT ser liberadas.
- **FR-013**: O contrato da rota (requisição, resposta de sucesso, respostas de erro por status e tipo de falha, exemplos de `curl`) MUST ser documentado em `docs/` ou no diretório da feature.
- **FR-014**: Esta feature MUST NOT incluir a tela no Next.js, autenticação, persistência, histórico, limitação de taxa por cliente, nem outros provedores de IA.

### Key Entities

- **Requisição de análise**: corpo enviado pelo cliente, com o campo `conteudo` (texto de 1 a 10.000 caracteres). Não é persistida.
- **Resposta de sucesso**: envelope com `sucesso: true` e `analise` (resumo, pontos principais, planos de ação). Não é persistida.
- **Resposta de erro**: envelope com `sucesso: false`, `mensagem` em português e, na validação, `erros` por campo.
- **Tipo de falha**: classificação da falha do provedor já definida no item 3, associada aqui a um status HTTP e a uma mensagem.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Com chave válida e provedor disponível, 100% das requisições com texto válido devolvem `sucesso: true` com resumo, pontos principais e planos de ação, em até 60 segundos.
- **SC-002**: 100% das requisições sem `conteudo`, vazias, não textuais ou acima do limite devolvem 422 em português, e 0 delas consomem cota do provedor.
- **SC-003**: 100% das falhas do provedor (chave inválida, cota, tempo esgotado, resposta vazia) devolvem erro com mensagem própria em português e 0 exceções cruas ou páginas HTML chegam ao cliente.
- **SC-004**: 0 ocorrências da chave do provedor, de rastros internos ou de respostas brutas do provedor em respostas HTTP e em logs, inclusive nos cenários de falha.
- **SC-005**: Uma requisição vinda de `http://localhost:3002` é permitida pelo navegador e 100% das requisições de outras origens deixam de ser liberadas.
- **SC-006**: Um desenvolvedor reproduz os três cenários do critério de aceite (texto válido, sem `conteudo`, provedor indisponível) em até 5 minutos seguindo apenas o documento do contrato.
- **SC-007**: Depois de qualquer falha tratada, a requisição seguinte com a causa corrigida funciona na primeira tentativa, sem reiniciar a API.

## Assumptions

- O agente `DataAnalyst` e a exceção `AnaliseFalhouException` do item 3 (spec 002) já existem e são reutilizados sem alteração de comportamento; esta feature só os conecta a uma rota HTTP.
- O campo `analise` carrega a estrutura completa do agente (resumo, pontos principais e planos de ação), e não um texto único: o item 5 decide como exibi-la. O exemplo `"analise": "..."` do backlog é tratado como ilustrativo e o backlog será atualizado ao implementar.
- O limite de 10.000 caracteres é um valor de partida razoável para proteger a cota gratuita e pode ser ajustado no plano; vale como constante de validação, sem exigir variável de ambiente.
- Os status por tipo de falha (FR-007) seguem a convenção "502 para falha do provedor, 503 para indisponibilidade temporária por limite de uso ou configuração".
- A origem liberada pelo CORS vem de uma variável de ambiente da API, com o default de desenvolvimento, para que o deploy do item 7 só mude o `.env`.
- Não há autenticação nem limitação de taxa: o projeto é de estudos e roda localmente (princípio I); a proteção da cota é o limite de tamanho e o CORS restrito.
- A validação com o provedor real é manual (`curl`) e consome a cota gratuita; os testes automatizados com o cliente de IA substituído por fake ficam para o item 6, conforme o princípio V.
- Fora de escopo, tratado em itens seguintes: tela de análise (item 5), testes automatizados completos (item 6), deploy (item 7) e evoluções futuras como streaming e histórico (item 8).
