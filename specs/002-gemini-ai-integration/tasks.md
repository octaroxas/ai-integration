---

description: "Tarefas da feature: Integração com o Gemini na API"
---

# Tasks: Integração com o Gemini na API

**Input**: Documentos de design em `/specs/002-gemini-ai-integration/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/data-analyst.md, quickstart.md

**Tests**: não solicitados (os testes automatizados com fake são o item 6 do backlog; princípio V proíbe chamar o provedor real em testes). A verificação é manual pelo `tinker`, conforme o [quickstart.md](quickstart.md).

**Organization**: tarefas agrupadas por user story. Todos os comandos rodam da raiz do repositório com o Compose de desenvolvimento, abreviado como `DC` = `docker compose -f docker-compose.dev.yaml`. Nada é instalado no host. Antes de rodar, exporte `UID` e `USER` no shell (`export UID USER`).

**Pré-requisito externo**: uma `GEMINI_API_KEY` válida do Google AI Studio, colocada só em `apps/api/.env`. As tarefas T011, T015, T016, T019 e T020 usam o Gemini real e consomem a cota gratuita. Nunca imprima, copie para outro arquivo nem cole a chave em comandos, logs ou na conversa.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta)
- **[Story]**: história a que a tarefa pertence (US1, US2, US3)

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: instalar o AI SDK e confirmar o que a pesquisa deixou em aberto

- [X] T001 Confirmar que a stack da spec 001 está no ar (`DC up -d`, `curl http://localhost:8002/api/health` → `200`) e que `apps/api/.env` existe e está no `.gitignore` (`git check-ignore apps/api/.env`). Perguntar ao usuário se a `GEMINI_API_KEY` já está em `apps/api/.env`, sem ler nem exibir o valor (checar só se a linha existe e não está vazia, por exemplo `grep -c '^GEMINI_API_KEY=.\+' apps/api/.env`).
- [X] T002 Instalar o SDK no container: `DC exec api composer require laravel/ai --no-interaction`. Confirmar em `apps/api/composer.json` a entrada `laravel/ai` e que `apps/api/composer.lock` foi atualizado. Não rodar `php artisan migrate` nesta fase.
- [X] T003 Publicar apenas a configuração do SDK em `apps/api/config/ai.php`: rodar `DC exec api php artisan vendor:publish --provider="Laravel\Ai\AiServiceProvider" --tag=<tag de configuração>` (listar as tags com `DC exec api php artisan vendor:publish --provider="Laravel\Ai\AiServiceProvider"` interativamente ou ler `vendor/laravel/ai/src/AiServiceProvider.php`). Se não houver tag só de configuração, publicar tudo e apagar o arquivo de migração publicado em `apps/api/database/migrations/` (tabelas `agent_conversations` e `agent_conversation_messages`; o projeto não usa conversas). Confirmar em `apps/api/vendor/laravel/ai/src/AiServiceProvider.php` se o pacote carrega migrações sozinho (`loadMigrationsFrom`): em caso afirmativo, registrar o achado e garantir, na T022, que `php artisan migrate` não cria tabelas de conversas; se criar, desativar o carregamento automático pela forma prevista no pacote (por exemplo `Ai::ignoreMigrations()` se existir) e registrar a decisão em `specs/002-gemini-ai-integration/research.md`, item 7.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: configuração e tipos de erro que todas as histórias usam

**⚠️ CRITICAL**: nenhuma user story começa antes desta fase.

- [X] T004 Ajustar `apps/api/config/ai.php`: provedor padrão de texto vindo de `env('AI_PROVIDER', 'gemini')` e modelo padrão de texto do provedor `gemini` vindo de `env('AI_MODEL')`, sem nome de modelo fixo como valor de fallback; a chave do provedor Gemini vindo de `env('GEMINI_API_KEY')`. Seguir a estrutura do arquivo publicado (confirmar onde ficam `default` e `providers.gemini.models.text.default`; ver research.md, item 2). Nenhum valor real de chave no arquivo.
- [X] T005 [P] Atualizar `apps/api/.env.example` acrescentando `GEMINI_API_KEY=` (vazia, sem valor), `AI_PROVIDER=gemini` e `AI_MODEL=gemini-3.8-flash`. Em seguida, copiar essas três linhas (a chave vazia incluída) para o `apps/api/.env` existente, que já foi criado e não é regenerado, e o usuário preenche a chave. Não apagar nem sobrescrever o que já existe no `.env`.
- [X] T006 [P] Criar o enum `App\Ai\Enums\TipoDeFalha` em `apps/api/app/Ai/Enums/TipoDeFalha.php` (enum com valor string) com exatamente os 8 casos de data-model.md: `EntradaVazia`, `ConfiguracaoAusente`, `Autenticacao`, `LimiteDeUso`, `TempoEsgotado`, `ModeloInvalido`, `RespostaVazia`, `Indisponivel`. Incluir um método `mensagem(): string` com a mensagem fixa em português de cada tipo (textos da tabela "Falha do provedor" em data-model.md, escritos como frases completas e sem detalhes internos).
- [X] T007 Criar `App\Ai\Exceptions\AnaliseFalhouException` em `apps/api/app/Ai/Exceptions/AnaliseFalhouException.php`, estendendo `RuntimeException`, com a propriedade pública somente leitura `TipoDeFalha $tipo` e construtor que recebe só o tipo e define a mensagem com `$tipo->mensagem()`. Não aceitar nem guardar exceção anterior (`previous`) nem texto do provedor (FR-004, FR-010). Depende de T006.

**Checkpoint**: configuração por ambiente e tipos de erro prontos.

---

## Phase 3: User Story 1 - Analisar um texto com o modelo de IA (Priority: P1) 🎯 MVP

**Goal**: chamar o agente no `tinker` com um texto e receber resumo estruturado e planos de ação do Gemini.

**Independent Test**: com a chave válida, `(new \App\Ai\Agents\DataAnalyst)->analisar('texto')` devolve um array com `resumo`, `pontos_principais` e `planos_de_acao` preenchidos em até 60 segundos, e muda conforme o texto.

### Implementation for User Story 1

- [X] T008 [US1] Gerar o agente com `DC exec api php artisan make:agent DataAnalyst --structured`, resultando em `apps/api/app/Ai/Agents/DataAnalyst.php`, que implementa `Agent` e `HasStructuredOutput` e usa `Promptable`. Não adicionar os atributos `#[Provider]` nem `#[Model]` (provedor e modelo vêm da configuração; research.md, item 2) e não definir `#[Timeout]` (vale o padrão de 60 s; item 8).
- [X] T009 [US1] Em `apps/api/app/Ai/Agents/DataAnalyst.php`, escrever `instructions()` em português do Brasil orientando o agente a analisar o conteúdo recebido e devolver um resumo, os pontos principais e planos de ação, e `schema(JsonSchema $schema)` com os três campos obrigatórios de data-model.md: `resumo` (string, "obrigatório; não vazio após `trim`"), `pontos_principais` (array de strings, "obrigatória; pelo menos 1 item não vazio") e `planos_de_acao` (array de strings, "obrigatória; pelo menos 1 item não vazio"). Marcar os três como `required()`.
- [X] T010 [US1] Em `apps/api/app/Ai/Agents/DataAnalyst.php`, implementar `public function analisar(string $conteudo): array`: chamar `$this->prompt($conteudo)` e devolver um array com exatamente as chaves `resumo`, `pontos_principais` e `planos_de_acao`, conforme `contracts/data-analyst.md`. Nesta tarefa só o caminho feliz; as validações e o tratamento de falhas entram na US2.
- [X] T011 [US1] Reiniciar a API para ler o `.env` (`DC restart api`) e validar no container: `DC exec api php artisan tinker` e chamar `(new \App\Ai\Agents\DataAnalyst)->analisar('Vendas caíram 12% em outubro. O estoque do produto A está parado há 60 dias e o atendimento teve 30 reclamações de atraso.')`. Conferir os três campos preenchidos e o tempo (SC-001). Repetir com outro texto e conferir que a resposta muda. Se o ID `gemini-3.8-flash` falhar por modelo inexistente, trocar `AI_MODEL` por `gemini-2.5-flash` no `apps/api/.env` e no `.env.example` e registrar o resultado em research.md, item 3. Conferir também a restrição do princípio III: `git status --short` não pode listar `apps/api/.env`.

**Checkpoint**: a integração funciona no caminho feliz (MVP).

---

## Phase 4: User Story 2 - Falhas do provedor viram erros claros (Priority: P2)

**Goal**: toda falha do provedor sai como `AnaliseFalhouException` tratada, sem detalhes internos, e a API continua funcionando.

**Independent Test**: com chave inválida, `analisar('teste')` lança `AnaliseFalhouException` com tipo `Autenticacao` e mensagem em português; sem chave, `ConfiguracaoAusente`; com texto em branco, `EntradaVazia`; depois de corrigir a configuração, a chamada seguinte funciona sem reiniciar a API.

### Implementation for User Story 2

- [X] T012 [US2] Em `apps/api/app/Ai/Agents/DataAnalyst.php`, no início de `analisar()`, lançar `AnaliseFalhouException` com `TipoDeFalha::EntradaVazia` quando `trim($conteudo)` for vazio e com `TipoDeFalha::ConfiguracaoAusente` quando a chave do provedor Gemini em `config('ai.providers.gemini.key')` for vazia, ambos antes de qualquer chamada ao provedor (FR-012). Depende de T007 e T010.
- [X] T013 [US2] Em `apps/api/app/Ai/Agents/DataAnalyst.php`, envolver a chamada ao provedor em `try/catch` e traduzir as falhas para `AnaliseFalhouException` seguindo o mapeamento previsto em research.md, item 6: `RateLimitedException` → `LimiteDeUso`; `ProviderOverloadedException` → `Indisponivel`; erro de conexão/timeout do cliente HTTP → `TempoEsgotado`; resposta HTTP 401/403 → `Autenticacao`; 404 no modelo → `ModeloInvalido`. Qualquer outra exceção também deve virar `AnaliseFalhouException` (usar `Indisponivel`) para que nada cru escape (contrato). Lançar sempre sem `previous` e sem repassar `getMessage()`. Em caso de log, registrar apenas o nome do tipo de falha, nunca a mensagem, a URL nem a resposta do provedor.
- [X] T014 [US2] Em `apps/api/app/Ai/Agents/DataAnalyst.php`, validar a resposta antes de devolver: se faltar `resumo`, `pontos_principais` ou `planos_de_acao`, ou se `resumo` for vazio após `trim`, ou se alguma das duas listas não tiver pelo menos 1 item não vazio, lançar `AnaliseFalhouException` com `TipoDeFalha::RespostaVazia` (FR-009; data-model.md).
- [X] T015 [US2] Confirmar o mapeamento contra o comportamento real do SDK com a chave de verdade, no `tinker`, usando `config()` em tempo de execução (as mudanças somem ao sair do `tinker`): (a) `config(['ai.providers.gemini.key' => 'chave-invalida'])` e capturar o que o SDK lança antes da tradução, imprimindo só `get_class($e)` e o código HTTP, nunca a mensagem; (b) idem com um modelo inexistente (a chave exata do config do modelo vem da T004). Ajustar o mapeamento de T013 aos tipos de exceção que apareceram de fato, e registrar as classes observadas em research.md, item 6. Um timeout real pode ser provocado reduzindo o tempo limite para o mínimo na configuração do cliente e anotado; se não for viável, deixar documentado que o mapeamento de `TempoEsgotado` não foi observado ao vivo.
- [X] T016 [US2] Validar os cenários da US2 no `tinker` conforme quickstart.md, passo 3: chave inválida → `Autenticacao`; chave vazia → `ConfiguracaoAusente` e sem chamada ao provedor; `analisar('   ')` → `EntradaVazia`; modelo inexistente → `ModeloInvalido`. Em cada caso capturar `AnaliseFalhouException` e imprimir `[$e->tipo, $e->getMessage()]`, e conferir que a mensagem está em português, é diferente por tipo (SC-003) e não contém a chave nem URL.
- [X] T017 [US2] Verificar vazamentos e recuperação: depois de T016, `grep -c "AIza" apps/api/storage/logs/laravel.log` deve dar `0` e a saída dos casos não pode conter o texto da chave; sair do `tinker`, abrir de novo e repetir a chamada válida da T011, que deve funcionar na primeira tentativa, sem reiniciar a API (SC-006, FR-011).

**Checkpoint**: as duas histórias funcionam de forma independente.

---

## Phase 5: User Story 3 - Trocar o modelo apenas por configuração (Priority: P3)

**Goal**: mudar o modelo alterando só uma variável de ambiente, sem tocar em código.

**Independent Test**: trocar `AI_MODEL` em `apps/api/.env`, reiniciar a API, chamar o agente e ver que usa o novo modelo; com um modelo inexistente, receber `ModeloInvalido`.

### Implementation for User Story 3

- [X] T018 [US3] Provar que não há nome de modelo fixo no código: `grep -rniE "gemini-[0-9]" apps/api/app apps/api/config` não deve listar o nome de nenhum modelo (só `.env.example` pode ter o valor de exemplo). Se aparecer, mover para a configuração.
- [X] T019 [US3] Trocar `AI_MODEL` no `apps/api/.env` para outro modelo gratuito de research.md, item 3 (por exemplo `gemini-2.5-flash`), rodar `DC restart api`, repetir a chamada da T011 e confirmar que funciona sem alterar nenhum arquivo de código (SC-005: `git status --short apps/api/app apps/api/config` não mostra mudança nova). Voltar ao valor original depois.
- [X] T020 [US3] Colocar um valor de modelo inexistente em `AI_MODEL` (por exemplo `modelo-que-nao-existe`), reiniciar a API, chamar o agente e confirmar `ModeloInvalido` tratado (US3, cenário 2); restaurar o valor original e repetir a chamada válida.

**Checkpoint**: as três histórias validadas.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: validação final, segredos e documentação

- [X] T021 Conferir segredos e arquivos no git: `git status --short` não pode listar `apps/api/.env`; `git grep -n "AIza"` não pode achar nada; `apps/api/.env.example` tem `GEMINI_API_KEY=` vazia. Conferir que nenhuma chave aparece em `specs/` nem em exemplos.
- [X] T022 Rodar `DC exec api php artisan migrate:status` e confirmar que nenhuma migração nova do SDK (tabelas de conversas) está pendente nem foi criada; se foi, aplicar a correção descrita na T003.
- [X] T023 [P] Atualizar `docs/ideias.md`: marcar os checkboxes do item 3 como feitos (`[x] ✅`), o título do item 3 para `🟢`, e anotar o modelo gratuito efetivamente usado e que a validação foi feita no `tinker`.
- [X] T024 [P] Atualizar `README.md`: seção curta de configuração da IA (`GEMINI_API_KEY`, `AI_PROVIDER`, `AI_MODEL` em `apps/api/.env`) e o comando de teste no `tinker`, sem nenhum valor real de chave. Atualizar a linha de status do topo para indicar que a integração com o Gemini existe no `tinker` e que o endpoint ainda não existe.
- [X] T025 Regressão: `curl http://localhost:8002/api/health` devolve `200 {"status":"ok"}` e `http://localhost:3002` responde `200`. Percorrer [quickstart.md](quickstart.md) do passo 1 ao 6 e confirmar que cada resultado esperado bate com o ambiente real.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências; T001 → T002 → T003.
- **Foundational (Phase 2)**: depende da Setup; bloqueia as histórias. T004 depende de T003; T005 e T006 são independentes; T007 depende de T006.
- **US1 (P1)**: depende da Foundational. É o MVP.
- **US2 (P2)**: depende da US1 (edita o mesmo método `analisar()` do mesmo arquivo).
- **US3 (P3)**: depende da US1 para ter a chamada funcionando; é independente da US2 em termos de lógica, mas T020 espera `ModeloInvalido`, que vem da T013.
- **Polish**: depende das três histórias.

### Within Each User Story

- US1: T008 → T009 → T010 → T011.
- US2: T012 → T013 → T014 (mesmo arquivo, sequencial) → T015 → T016 → T017.
- US3: T018 → T019 → T020.

### Parallel Opportunities

- T005 e T006 (arquivos diferentes) podem andar juntas depois da T003.
- T023 e T024 (documentação) são independentes entre si.
- As tarefas de código de US1 e US2 mexem no mesmo arquivo, então não são paralelas. A US3 (T018, T019) pode começar assim que a US1 estiver validada.

### Parallel Example: Foundational

```text
Depois de T003:   T004 (config/ai.php)
                  T005 [P] (.env.example)     T006 [P] (TipoDeFalha) → T007 (exceção)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Setup e Foundational.
2. US1 (T008 a T011).
3. **Parar e validar**: o agente devolve a análise do Gemini no `tinker`. Já destrava o endpoint do item 4, mesmo sem tratamento de erros completo.

### Incremental Delivery

1. Setup + Foundational.
2. US1 → validar a análise.
3. US2 → validar as falhas tratadas e a ausência de vazamentos.
4. US3 → validar a troca de modelo.
5. Polish → segredos, migrações, documentação e regressão.

---

## Notes

- Nenhum commit automático (constituição): as mudanças ficam no working tree para o dono do repositório commitar.
- A cota gratuita é limitada: evitar rodar as chamadas reais em loop e juntar as verificações que usam o provedor.
- Não registrar a chave em nenhum arquivo além de `apps/api/.env`, nem em comandos, saídas coladas na conversa ou mensagens de commit.
- Os casos `LimiteDeUso`, `TempoEsgotado` e `RespostaVazia` não são provocáveis de forma confiável contra o provedor real; ficam cobertos pelo mapeamento no código e, no item 6, por testes com fake.
