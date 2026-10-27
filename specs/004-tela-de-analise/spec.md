# Feature Specification: Tela de análise de dados

**Feature Branch**: `feat/enviroment` (branch atual; nenhuma branch nova foi criada)

**Created**: 2026-10-27

**Status**: Draft

**Input**: User description: "Tela de análise no Next.js (item 5 de `docs/ideias.md`): página única em `apps/web` com `textarea` e botão \"Analisar Dados\" que envia o texto para `POST /api/processar-dados` (contrato em `specs/003-processar-dados-endpoint/contracts/processar-dados.md`). URL da API via `NEXT_PUBLIC_API_URL`, nunca fixa no código. Estado de carregamento: botão desabilitado e texto \"Processando com IA...\" durante a chamada, evitando envio duplicado. Exibir a análise estruturada (`resumo`, `pontos_principais`, `planos_de_acao`) preservando quebras de linha. Exibir erro visível quando a API falha ou fica inacessível. Validação no cliente: não enviar texto vazio (e respeitar o limite de 10.000 caracteres). Critério de aceite: colar um texto, clicar em \"Analisar Dados\" e ver a análise do Gemini na tela; em caso de falha, ver uma mensagem de erro em vez de nada."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Colar um texto e ver a análise na tela (Priority: P1)

O usuário abre a página, cola um texto no campo, clica em "Analisar Dados" e vê na mesma página a análise gerada pelo modelo de IA: o resumo, os pontos principais e os planos de ação.

**Why this priority**: fecha o ciclo ponta a ponta do projeto (entrada na web, API, modelo de IA, exibição na tela). Sem ela, o contrato HTTP do item 4 não tem consumidor e o fluxo não pode ser demonstrado.

**Independent Test**: com a stack no ar e uma chave válida, abrir a página, colar um texto, clicar em "Analisar Dados" e conferir que resumo, pontos principais e planos de ação aparecem na tela.

**Acceptance Scenarios**:

1. **Given** a página aberta e a API no ar, **When** o usuário cola um texto válido e clica em "Analisar Dados", **Then** a tela mostra o resumo, a lista de pontos principais e a lista de planos de ação devolvidos pela API.
2. **Given** uma análise já exibida, **When** o usuário altera o texto e envia de novo, **Then** a tela passa a mostrar apenas a análise do novo envio, sem restos da anterior.
3. **Given** um texto com várias linhas, **When** a análise é exibida, **Then** as quebras de linha do conteúdo devolvido são preservadas na leitura.
4. **Given** a análise exibida, **When** o usuário inspeciona a página, **Then** ela não revela chave do provedor, nome do modelo nem a resposta bruta do provedor.

---

### User Story 2 - Acompanhar o processamento sem enviar duas vezes (Priority: P2)

Enquanto a análise está sendo gerada (pode levar vários segundos), o usuário vê que o pedido está em andamento: o botão fica desabilitado e mostra "Processando com IA...". Ao terminar, o botão volta ao normal.

**Why this priority**: a chamada ao modelo é lenta e a cota gratuita é limitada; sem o indicativo, o usuário acha que travou e clica de novo, gastando cota. Depende da tela existir (US1).

**Independent Test**: enviar um texto e, durante a espera, conferir que o botão está desabilitado com o texto "Processando com IA..." e que cliques adicionais não geram novos envios; ao receber a resposta, o botão volta a "Analisar Dados".

**Acceptance Scenarios**:

1. **Given** um envio em andamento, **When** o usuário olha o botão, **Then** ele está desabilitado e exibe "Processando com IA...".
2. **Given** um envio em andamento, **When** o usuário tenta clicar de novo ou acionar o envio pelo teclado, **Then** nenhum segundo envio é feito.
3. **Given** um envio em andamento, **When** a resposta (sucesso ou erro) chega, **Then** o botão volta a "Analisar Dados" e fica habilitado.

---

### User Story 3 - Ver uma mensagem clara quando algo falha (Priority: P3)

Quando a API devolve um erro (validação, cota do provedor, indisponibilidade, erro inesperado) ou não pode ser alcançada, o usuário vê uma mensagem de erro visível em português, em vez de uma tela que não muda.

**Why this priority**: sem isso, falhas parecem travamento. Depende de US1; é validável derrubando a API ou usando uma chave inválida.

**Independent Test**: com a API parada, enviar um texto e conferir uma mensagem de erro visível; com uma chave inválida, conferir a mensagem devolvida pela API; depois de restabelecer a causa, o envio seguinte funciona sem recarregar a página.

**Acceptance Scenarios**:

1. **Given** a API devolvendo erro com mensagem em português, **When** o usuário envia um texto, **Then** a tela mostra essa mensagem em destaque e nenhuma análise.
2. **Given** a API inacessível (parada ou sem rede), **When** o usuário envia um texto, **Then** a tela mostra uma mensagem clara de que não foi possível falar com o servidor.
3. **Given** uma resposta fora do formato esperado, **When** ela chega à tela, **Then** o usuário vê uma mensagem genérica de erro, nunca uma tela vazia ou quebrada.
4. **Given** um erro exibido, **When** o usuário envia de novo e dá certo, **Then** a mensagem de erro desaparece e a análise é mostrada.

---

### User Story 4 - Não enviar texto inválido (Priority: P4)

Antes de chamar a API, a tela recusa texto vazio (ou só com espaços) e texto acima de 10.000 caracteres, avisando o motivo ao usuário e sem fazer nenhuma requisição.

**Why this priority**: poupa uma ida à API e a cota; a API já valida (item 4), então esta é uma camada de conforto. Depende de US1.

**Independent Test**: clicar em "Analisar Dados" com o campo vazio, com só espaços e com mais de 10.000 caracteres; conferir o aviso em cada caso e que nenhuma requisição foi feita.

**Acceptance Scenarios**:

1. **Given** o campo vazio ou só com espaços, **When** o usuário clica em "Analisar Dados", **Then** a tela avisa que é preciso informar um texto e não envia nada.
2. **Given** um texto com mais de 10.000 caracteres, **When** o usuário clica em "Analisar Dados", **Then** a tela avisa o limite máximo e não envia nada.
3. **Given** um aviso de validação exibido, **When** o usuário corrige o texto e envia, **Then** o aviso desaparece e o envio acontece.

---

### Edge Cases

- Texto com exatamente 10.000 caracteres: é aceito e enviado.
- Texto com espaços no início ou no fim: o conteúdo é enviado como digitado; só é recusado se, aparadas as pontas, estiver vazio.
- Clique duplo rápido no botão ou Enter repetido: apenas um envio é feito.
- A API demora muito ou a conexão cai no meio: o usuário vê o erro e o botão volta a ficar habilitado, sem precisar recarregar.
- A API devolve uma análise com listas vazias ou campos ausentes: tratado como resposta fora do formato (mensagem genérica de erro).
- Conteúdo devolvido com trechos que parecem HTML ou marcação: é mostrado como texto puro, nunca interpretado.
- Texto da análise muito longo: a página rola; o layout não quebra.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A aplicação web MUST ter uma única página com um campo de texto e um botão rotulado "Analisar Dados".
- **FR-002**: Ao clicar no botão com texto válido, a página MUST enviar o texto à API do projeto no formato descrito em `specs/003-processar-dados-endpoint/contracts/processar-dados.md`, e MUST NOT falar diretamente com o provedor de IA.
- **FR-003**: O endereço da API MUST vir de configuração de ambiente (`NEXT_PUBLIC_API_URL`), com entrada correspondente no `.env.example` da web, e MUST NOT estar fixo no código. Essa variável MUST NOT conter segredos.
- **FR-004**: Durante o envio, o botão MUST ficar desabilitado e exibir "Processando com IA...", e MUST NOT ser possível disparar um segundo envio até a resposta chegar (clique ou teclado).
- **FR-005**: Em caso de sucesso, a página MUST exibir o resumo, os pontos principais e os planos de ação da análise, cada um sob um título identificável, e MUST preservar as quebras de linha do texto.
- **FR-006**: Todo conteúdo vindo da API MUST ser exibido como texto puro, sem interpretar HTML ou marcação.
- **FR-007**: Quando a API responder com erro, a página MUST exibir a mensagem em português devolvida por ela, em destaque, e MUST NOT exibir análise.
- **FR-008**: Quando a API não puder ser alcançada, ou a resposta não tiver o formato esperado, a página MUST exibir uma mensagem de erro clara em português, em vez de ficar sem mudança.
- **FR-009**: Antes de enviar, a página MUST recusar texto vazio ou só com espaços e texto acima de 10.000 caracteres, exibindo o motivo, sem fazer requisição.
- **FR-010**: A cada novo envio, a página MUST limpar a análise e os erros anteriores, de modo que só o resultado mais recente apareça.
- **FR-011**: Depois de qualquer resultado (sucesso ou erro), a página MUST permitir novo envio sem recarregar.
- **FR-012**: Os textos da interface MUST estar em português do Brasil.
- **FR-013**: A página MUST ser utilizável com teclado e leitor de tela em nível básico: campo com rótulo, estado de carregamento e erros anunciados de forma perceptível.
- **FR-014**: O fluxo principal (enviar, carregando, resultado, erro) MUST funcionar na stack Docker de desenvolvimento, sem exigir Node na máquina host.

### Key Entities

- **Texto de entrada**: o conteúdo colado pelo usuário; obrigatório, com até 10.000 caracteres; não é guardado.
- **Análise**: resultado devolvido pela API, com um resumo (texto) e duas listas de textos (pontos principais e planos de ação); existe só na tela, enquanto o usuário não enviar outro texto.
- **Erro de envio**: mensagem em português mostrada ao usuário, originada da validação local, da resposta de erro da API ou da falha de comunicação.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um usuário que abre a página pela primeira vez consegue colar um texto e ver a análise sem instrução adicional, em um único envio.
- **SC-002**: Em 100% dos envios com a API no ar e chave válida, a análise exibida corresponde ao que a API devolveu (os três blocos presentes).
- **SC-003**: Em 100% das falhas simuladas (API parada, erro de validação, cota esgotada, resposta fora do formato), o usuário vê uma mensagem de erro em vez de nada.
- **SC-004**: Em qualquer sequência de cliques rápidos durante um envio, é feita no máximo uma requisição por texto enviado.
- **SC-005**: Entre o clique e o início do indicativo "Processando com IA...", o usuário percebe a mudança de imediato (sem espera visível), e o botão volta ao normal em até 1 segundo após a resposta ou erro.
- **SC-006**: Nenhum segredo (chave do provedor) aparece no código servido ao navegador nem no repositório.

## Assumptions

- A API do item 4 (`POST /api/processar-dados`) está implementada e o contrato documentado é a fonte da verdade sobre formatos de sucesso e de erro; esta feature não altera a API.
- O CORS da API já libera a origem da web em dev (`http://localhost:3002`); a web em dev roda nessa porta.
- Usuário único, sem autenticação, sem histórico: a análise vive só na tela e se perde ao recarregar (princípio I).
- Renderização de Markdown fica fora do escopo: a API devolve campos estruturados, não Markdown. Se o modelo passar a responder com Markdown, avaliar em feature futura.
- Cancelar uma análise em andamento fica fora do escopo.
- Os testes automatizados do fluxo da tela pertencem ao item 6; nesta feature a verificação é manual contra a stack real, mais a checagem de tipos e lint do projeto web.
- Layout simples e responsivo básico; sem biblioteca de componentes nem redesenho visual além do necessário para legibilidade.
- A mensagem para falha de comunicação é definida por esta feature, pois a API não responde nesse caso.
