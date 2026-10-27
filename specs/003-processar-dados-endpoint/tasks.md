---

description: "Tarefas da feature: Endpoint de processamento de dados"
---

# Tasks: Endpoint de processamento de dados

**Input**: Documentos de design em `/specs/003-processar-dados-endpoint/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/processar-dados.md, quickstart.md

**Tests**: não solicitados (os testes automatizados com fake do cliente de IA são o item 6 do backlog; princípio V proíbe chamar o provedor real em testes). A verificação é manual com `curl`, conforme o [quickstart.md](quickstart.md).

**Organization**: tarefas agrupadas por user story. Todos os comandos rodam da raiz do repositório com o Compose de desenvolvimento, abreviado como `DC` = `docker compose -f docker-compose.dev.yaml`. Nada é instalado no host. Antes de rodar, exporte `UID` e `USER` no shell (`export UID USER`).

**Pré-requisito externo**: `GEMINI_API_KEY` válida em `apps/api/.env` (item 3). As tarefas T004, T008 e T011 usam o Gemini real e consomem a cota gratuita. Nunca imprima, copie para outro arquivo nem cole a chave em comandos, logs ou na conversa.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta)
- **[Story]**: história a que a tarefa pertence (US1 a US5)

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: confirmar o ponto de partida; nenhuma dependência nova é instalada

- [X] T001 Confirmar que a stack está no ar (`DC ps`; `curl -s http://localhost:8002/api/health` → `{"status":"ok"}`), que `apps/api/app/Ai/Agents/DataAnalyst.php` existe com `analisar(string): array` e que `apps/api/.env` tem a `GEMINI_API_KEY` preenchida, sem ler nem exibir o valor (`grep -c '^GEMINI_API_KEY=.\+' apps/api/.env` → `1`). Se a chave faltar, parar e avisar o usuário.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: não há pré-requisito bloqueante além do item 3 já entregue; o agente, o enum `TipoDeFalha` e a `AnaliseFalhouException` são reutilizados sem alteração.

**Checkpoint**: nada a fazer; as histórias podem começar após a T001.

---

## Phase 3: User Story 1 - Enviar um texto e receber a análise (Priority: P1) 🎯 MVP

**Goal**: `POST /api/processar-dados` com um texto devolve `{ "sucesso": true, "analise": {...} }`.

**Independent Test**: `curl` `POST` com um texto válido devolve 200, `sucesso: true` e `analise` com `resumo`, `pontos_principais` e `planos_de_acao` preenchidos, em até 60 segundos, sem chave nem nome do modelo na resposta.

### Implementation for User Story 1

- [X] T002 [US1] Criar o controller invocável com `DC exec api php artisan make:controller ProcessarDadosController --invokable`, resultando em `apps/api/app/Http/Controllers/ProcessarDadosController.php`. O `__invoke(Request $request, DataAnalyst $analista): JsonResponse` lê `$request->string('conteudo')->toString()`, chama `$analista->analisar(...)` e devolve `response()->json(['sucesso' => true, 'analise' => $analise])` com status 200. Nenhuma chamada ao provedor, nenhum `try/catch`, nenhuma regra de negócio no controller (FR-006, princípio IV). Usar `App\Ai\Agents\DataAnalyst` injetado pelo container.
- [X] T003 [US1] Registrar a rota em `apps/api/routes/api.php`: `Route::post('/processar-dados', ProcessarDadosController::class);`, mantendo a rota `GET /health` existente. Conferir com `DC exec api php artisan route:list --path=api` que `POST api/processar-dados` aparece.
- [X] T004 [US1] Validar com o Gemini real, conforme o passo 2 do quickstart: `curl -s -X POST http://localhost:8002/api/processar-dados -H 'Content-Type: application/json' -H 'Accept: application/json' -d '{"conteudo":"Vendas caíram 12% em outubro. O estoque do produto A está parado há 60 dias e o atendimento teve 30 reclamações de atraso."}'`. Conferir 200, `sucesso: true`, os três campos preenchidos, o tempo (SC-001) e que a resposta não contém a chave nem o nome do modelo. Repetir com outro texto e conferir que a resposta muda. Se o modelo configurado estiver sem cota ou indisponível, esperar ou trocar `AI_MODEL` no `apps/api/.env` (ver `specs/002-gemini-ai-integration/research.md`).

**Checkpoint**: o ciclo web → API → modelo funciona por `curl`, ainda sem validação nem erros no envelope.

---

## Phase 4: User Story 2 - Entrada inválida é recusada antes de gastar cota (Priority: P2)

**Goal**: `conteudo` ausente, vazio, não textual ou acima de 10.000 caracteres devolve 422 em português, sem chamar o provedor.

**Independent Test**: os `curl` do passo 4 do quickstart devolvem 422 com `sucesso: false`, `mensagem` e `erros.conteudo` em português, e nenhum deles gera chamada ao provedor.

### Implementation for User Story 2

- [X] T005 [US2] Criar o Form Request com `DC exec api php artisan make:request ProcessarDadosRequest`, resultando em `apps/api/app/Http/Requests/ProcessarDadosRequest.php`. Em `authorize()` devolver `true`; em `rules()`: `'conteudo' => ['required', 'string', 'max:10000']` (obrigatório; string; "no máximo 10.000 caracteres", contados em caracteres, não bytes; vazio ou só com espaços cai em `required` pelos middlewares `TrimStrings`/`ConvertEmptyStringsToNull`). Em `messages()` (português): `conteudo.required` → "O conteúdo é obrigatório.", `conteudo.string` → "O conteúdo deve ser um texto.", `conteudo.max` → "O conteúdo deve ter no máximo 10000 caracteres.". Sem `attributes()` nem locale novo (research.md, item 4).
- [X] T006 [US2] Trocar o `Request` do `__invoke` em `apps/api/app/Http/Controllers/ProcessarDadosController.php` por `ProcessarDadosRequest` e ler o texto com `$request->validated('conteudo')`. Depende de T005.
- [X] T007 [US2] Em `apps/api/bootstrap/app.php`, dentro de `->withExceptions()`, registrar com `$exceptions->render(...)` o tratamento de `ValidationException` só para `api/*` (`$request->is('api/*')`): resposta 422 com `['sucesso' => false, 'mensagem' => 'Os dados enviados são inválidos.', 'erros' => $e->errors()]`. Manter o `shouldRenderJsonWhen` existente. Para outras rotas (retornar `null`), o comportamento padrão continua.
- [X] T008 [US2] Validar o passo 4 do quickstart: corpo `{}`, `conteudo` só com espaços, `conteudo` numérico, 10.001 caracteres e JSON malformado devolvem 422 no envelope, em português, inclusive sem o cabeçalho `Accept` (FR-011); 10.000 caracteres exatos passam e chamam o Gemini (consome cota); repetir o limite com `á` (10.000 aceitos, 10.001 recusados), pois o tamanho conta caracteres e não bytes. Rodar também o passo 6 do quickstart: `GET /api/processar-dados` (405) e `GET /api/nao-existe` (404) devolvem o envelope JSON, nunca HTML nem rastro (descoberto na validação: o padrão do Laravel vazava rastro com `APP_DEBUG=true`, tratado em T010). Conferir que as recusas não geram chamada ao provedor (nenhuma linha de falha do provedor em `apps/api/storage/logs/laravel.log` e resposta imediata).

**Checkpoint**: a entrada é validada antes de qualquer chamada ao agente.

---

## Phase 5: User Story 3 - Falhas do provedor viram erro claro e consistente (Priority: P3)

**Goal**: toda `AnaliseFalhouException` vira 502/503/422 com `sucesso: false` e mensagem em português; qualquer outro erro vira 500 genérico no mesmo formato.

**Independent Test**: com chave inválida, o `curl` devolve 502 `{"sucesso":false,"mensagem":"A chave do provedor de IA é inválida ou não tem permissão."}`; com chave vazia, 503; restaurada a chave, a requisição seguinte funciona sem reiniciar a API.

### Implementation for User Story 3

- [X] T009 [US3] Em `apps/api/bootstrap/app.php`, dentro de `->withExceptions()`, registrar com `$exceptions->render(...)` o tratamento de `App\Ai\Exceptions\AnaliseFalhouException` só para `api/*`: resposta `['sucesso' => false, 'mensagem' => $e->getMessage()]` com o status por `$e->tipo`, via `match` (data-model.md): `EntradaVazia` → 422; `LimiteDeUso`, `ConfiguracaoAusente` → 503; `Autenticacao`, `TempoEsgotado`, `ModeloInvalido`, `RespostaVazia`, `Indisponivel` → 502. Não incluir o tipo, a exceção original nem nada além da mensagem fixa na resposta (FR-009). Marcar a exceção com `$exceptions->dontReport(AnaliseFalhouException::class)`: o agente já registra só o tipo no log, e o `report()` padrão gravaria o rastro. Manter o mapeamento fora de `app/Ai/` (research.md, item 1).
- [X] T010 [US3] Em `apps/api/bootstrap/app.php`, registrar por último um `$exceptions->render(...)` genérico para `Throwable` só em `api/*`, que devolve `null` (deixando o padrão do Laravel) para `HttpExceptionInterface` e `ValidationException`, e 500 com `['sucesso' => false, 'mensagem' => 'Ocorreu um erro inesperado. Tente novamente.']` nos demais casos, sem rastro mesmo com `APP_DEBUG=true`. O `report()` padrão continua gravando a exceção no log do servidor (research.md, item 6).
- [X] T011 [US3] Validar o passo 3 do quickstart sem editar o `.env` real: subir uma segunda API temporária com `GEMINI_API_KEY=chave-invalida` e conferir 502 com a mensagem de autenticação; repetir com `GEMINI_API_KEY=` (vazia) e conferir 503 de configuração ausente, sem chamar o provedor. Encerrar a API temporária e repetir a T004 na API normal para confirmar que funciona sem reiniciá-la (SC-007). Se `docker compose run` com `-p` não funcionar no ambiente, usar `DC exec -e GEMINI_API_KEY=... api php artisan serve --port=8003` e `docker exec` + `curl` de dentro do container.
- [X] T012 [US3] Conferir o 500 genérico provocando um erro inesperado temporário (por exemplo, `throw new \RuntimeException('segredo')` no início do `__invoke`): a resposta deve ser 500 no envelope, sem a palavra "segredo", sem rastro e sem caminhos, com `APP_DEBUG=true`. Remover o `throw` em seguida e confirmar com `git diff apps/api/app/Http/Controllers/ProcessarDadosController.php` que ele não ficou.

**Checkpoint**: nenhum erro do provedor chega ao cliente como exceção crua ou página HTML.

---

## Phase 6: User Story 4 - Só o frontend pode chamar a API pelo navegador (Priority: P4)

**Goal**: a API libera no CORS apenas a origem do frontend, lida de `CORS_ALLOWED_ORIGIN`.

**Independent Test**: o `OPTIONS` com `Origin: http://localhost:3002` devolve `Access-Control-Allow-Origin: http://localhost:3002`; com outra origem, a resposta não traz esse cabeçalho.

### Implementation for User Story 4

- [X] T013 [US4] Publicar a configuração com `DC exec api php artisan config:publish cors`, resultando em `apps/api/config/cors.php`, e ajustar: `'paths' => ['api/*']`, `'allowed_origins' => [env('CORS_ALLOWED_ORIGIN', 'http://localhost:3002')]`, `'allowed_methods' => ['POST']`, `'allowed_headers' => ['Content-Type', 'Accept']`, `'supports_credentials' => false`, demais chaves vazias/zeradas. Sem `'*'` em lugar nenhum (FR-012). Depende de nenhuma outra tarefa de código.
- [X] T014 [P] [US4] Acrescentar `CORS_ALLOWED_ORIGIN=http://localhost:3002` ao `apps/api/.env.example`, com um comentário em português de uma linha acima ("Única origem liberada pelo CORS; em produção, o domínio do frontend."), logo depois do bloco de IA. Não alterar o `apps/api/.env` real: o default do `config/cors.php` cobre o dev.
- [X] T015 [US4] Limpar o cache de configuração se houver (`DC exec api php artisan config:clear`) e validar o passo 5 do quickstart: `OPTIONS` com `Origin: http://localhost:3002` devolve 204 e `Access-Control-Allow-Origin: http://localhost:3002`, `Access-Control-Allow-Methods` com `POST` e `Access-Control-Allow-Headers` com `content-type`; com `Origin: http://evil.example` o `Access-Control-Allow-Origin` continua sendo `http://localhost:3002` e nunca a origem alheia, o que faz o navegador bloquear. Conferir que a resposta do `POST` real com a origem permitida também traz o cabeçalho.

**Checkpoint**: o navegador consegue chamar a rota a partir do frontend e de nenhuma outra origem.

---

## Phase 7: User Story 5 - Contrato documentado (Priority: P5)

**Goal**: o contrato está escrito, conferido contra o comportamento real, e o README e o backlog refletem o endpoint.

**Independent Test**: seguir apenas `contracts/processar-dados.md` e o quickstart, sem ler o código, reproduz as respostas descritas.

### Implementation for User Story 5

- [X] T016 [US5] Conferir cada exemplo de `specs/003-processar-dados-endpoint/contracts/processar-dados.md` contra as respostas reais obtidas nas tarefas T004, T008, T011 e T015 (status, campos e mensagens) e corrigir o documento onde divergir. Incluir no documento um `curl` de sucesso e um de erro 422 prontos para copiar, se ainda não houver.
- [X] T017 [P] [US5] Atualizar o `README.md`: na seção da API (ou onde o `/api/health` é descrito), acrescentar o endpoint `POST /api/processar-dados`, um `curl` de exemplo, a variável `CORS_ALLOWED_ORIGIN` e o link para `specs/003-processar-dados-endpoint/contracts/processar-dados.md`. Seguir o estilo e a densidade do README atual.
- [X] T018 [P] [US5] Atualizar o `docs/ideias.md`: marcar os seis itens da seção 4 com `[x] ✅`, trocar o 🔸 do título da seção por 🟢, anotar que `analise` é o objeto estruturado do agente (e não um texto) e que o limite é de 10.000 caracteres, e registrar os status 422/502/503. Mesmo estilo das seções 1 a 3.

**Checkpoint**: contrato, README e backlog conferem com o comportamento real.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [X] T019 Formatar o código novo com o Pint dentro do container: `DC exec api ./vendor/bin/pint app/Http bootstrap/app.php routes/api.php config/cors.php`, e conferir o diff.
- [X] T020 Passar a suíte existente para garantir que nada quebrou (`DC exec api php artisan test`); ela não chama o provedor.
- [X] T021 Rodar o passo 7 do quickstart (segredos e logs): `git status --short` não lista `apps/api/.env`; `grep -cF` da chave em `apps/api/storage/logs/laravel.log` devolve 0; nenhuma resposta das tarefas anteriores continha a chave, `gemini` ou rastros (SC-004). Ao final, conferir `git status --short` e listar os arquivos alterados. Não commitar (constituição).

---

## Dependencies & Execution Order

- **Setup (T001)** → histórias.
- **US1 (T002–T004)**: base de tudo; T003 depende de T002; T004 depende de T003.
- **US2 (T005–T008)**: depende da US1 (altera o controller). T006 depende de T005; T007 é independente de T005/T006 (mesmo arquivo `bootstrap/app.php` das US3: sequenciar T007 → T009 → T010); T008 depende de T006 e T007.
- **US3 (T009–T012)**: depende da US1 e do `bootstrap/app.php` já tocado na T007.
- **US4 (T013–T015)**: independente das US2/US3 (arquivos próprios); só precisa da rota da US1 para a validação final.
- **US5 (T016–T018)**: depende das validações das US1 a US4 (T016); T017 e T018 podem ser feitas a qualquer momento depois de definidos o contrato e a variável.
- **Polish (T019–T021)**: depois de todas as histórias.

## Parallel Opportunities

- T014 (`.env.example`) em paralelo com T013 (`config/cors.php`).
- T017 (`README.md`) e T018 (`docs/ideias.md`) em paralelo entre si e com T016.
- A US4 inteira pode andar em paralelo com a US2/US3, pois só toca `config/cors.php` e `.env.example`.
- Tarefas que editam `bootstrap/app.php` (T007, T009, T010) são sequenciais.

## Implementation Strategy

- **MVP**: Setup + US1 (T001–T004) já fecha o ciclo web → API → modelo por `curl`.
- **Entrega incremental**: US2 (proteger a cota) → US3 (erros claros) → US4 (CORS para a tela do item 5) → US5 (documentação). Cada história é validada por `curl` antes de seguir.
- **Fora do escopo**: tela no Next.js (item 5), testes automatizados (item 6), deploy (item 7).
