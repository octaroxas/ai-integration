---

description: "Tarefas da feature: Projetos da API e da Web no Docker"
---

# Tasks: Projetos da API e da Web no Docker

**Input**: Documentos de design em `/specs/001-api-web-scaffold/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/health.md, quickstart.md

**Tests**: não solicitados (fora de escopo da spec). A verificação é feita pelos passos do [quickstart.md](quickstart.md), incluídos nas fases de cada história.

**Organization**: tarefas agrupadas por user story. Todos os comandos rodam da raiz do repositório e usam o Compose de desenvolvimento, abreviado como `DC` = `docker compose -f docker-compose.dev.yaml`. Nada é instalado no host.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta)
- **[Story]**: história a que a tarefa pertence (US1, US2, US3)

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: preparar o ambiente para criar os projetos

- [X] T001 Criar `.env` na raiz a partir de `.env.example` (`cp .env.example .env`), sem sobrescrever se já existir; confirmar que `.env` continua ignorado pelo git.
- [X] T002 Validar a configuração do Compose com `DC config -q` em `docker-compose.dev.yaml` e construir as imagens `api` e `web` com `DC build api web`, usando `USER` e `UID` do host (1000).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: garantir pastas limpas e com o dono certo antes de gerar os projetos

**⚠️ CRITICAL**: nenhuma user story começa antes desta fase.

- [X] T003 Conferir que `apps/api` contém só `Dockerfile`, `.dockerignore` e `docker/`, e `apps/web` só `Dockerfile`, `.dockerignore` e `docker/`; confirmar com `find apps -not -user "$USER"` que nada pertence a outro usuário. Se houver arquivos de root, removê-los antes de seguir.

**Checkpoint**: ambiente pronto, projetos podem ser criados.

---

## Phase 3: User Story 1 - API responde dentro do Docker (Priority: P1) 🎯 MVP

**Goal**: API Laravel 13 com rotas `/api`, `GET /api/health` e conexão com o Postgres do Compose; migrações manuais sem erro.

**Independent Test**: `curl -i http://localhost:8002/api/health` devolve `200` com `{"status":"ok"}`, e `DC exec api php artisan migrate` termina sem erro.

### Implementation for User Story 1

- [X] T004 [US1] Criar o projeto Laravel em `apps/api` via container, sem scripts do esqueleto: `DC run --rm --no-deps --entrypoint "" api sh -c 'composer create-project laravel/laravel /tmp/app "^13.0" --no-scripts --no-interaction --prefer-dist && cp -a /tmp/app/. /var/www/html/'`. Conferir que `apps/api/composer.json` existe, exige `laravel/framework ^13` e que `Dockerfile` e `docker/` continuam intactos.
- [X] T005 [US1] Habilitar o roteamento de API em `apps/api/bootstrap/app.php`, adicionando `api: __DIR__.'/../routes/api.php'` ao `withRouting(...)` (prefixo `/api` padrão). Não executar `php artisan install:api` (evita Sanctum; ver research.md, item 3).
- [X] T006 [US1] Criar `apps/api/routes/api.php` com `Route::get('/health', fn () => response()->json(['status' => 'ok']));`, sem consulta ao banco, conforme `contracts/health.md`.
- [X] T007 [US1] Ajustar `apps/api/.env.example`: `DB_CONNECTION=pgsql`, `DB_HOST=db`, `DB_PORT=5432`, `DB_DATABASE=ai_test`, `DB_USERNAME=ai_test`, `DB_PASSWORD=ai_test` (iguais ao `.env.example` da raiz), `APP_URL=http://localhost:8002`, `SESSION_DRIVER=file`, `CACHE_STORE=file`, `QUEUE_CONNECTION=sync`. Não colocar nenhum segredo real.
- [X] T008 [US1] Subir banco e API (`DC up -d db api`) e acompanhar `DC logs api` até o servidor iniciar (o entrypoint roda `composer install`, cria `apps/api/.env` e gera a `APP_KEY`). Confirmar `curl -i http://localhost:8002/api/health` → `200` e `{"status":"ok"}`.
- [X] T009 [US1] Executar `DC exec api php artisan migrate` e confirmar que termina sem erro, provando a conexão com o Postgres (FR-006). Confirmar que a API não migra sozinha: depois de `DC restart api`, nenhuma migração nova é executada.

**Checkpoint**: a API funciona sozinha dentro do Docker (MVP).

---

## Phase 4: User Story 2 - Web exibe a página inicial (Priority: P2)

**Goal**: aplicação Next.js 16 (App Router, React 19) com a página inicial padrão e `package-lock.json` versionado.

**Independent Test**: abrir `http://localhost:3002` e ver a página inicial padrão; `apps/web/package-lock.json` existe e não está no `.gitignore`.

### Implementation for User Story 2

- [X] T010 [P] [US2] Criar o projeto Next.js em `apps/web` via container: `DC run --rm --no-deps --entrypoint "" web sh -c 'npx --yes create-next-app@latest /tmp/web --ts --eslint --app --no-tailwind --no-src-dir --import-alias "@/*" --use-npm --skip-install --yes && cp -a /tmp/web/. /app/'`. Conferir que `apps/web/package.json` lista `next` 16.x e `react`/`react-dom` 19.x, que `apps/web/app/page.tsx` existe e que `Dockerfile` e `docker/` continuam intactos. Se o gerador criar `.git` dentro de `apps/web`, remover essa pasta.
- [X] T011 [US2] Gerar o lock sem instalar: `DC run --rm --no-deps --entrypoint "" web npm install --package-lock-only --no-audit --no-fund`, resultando em `apps/web/package-lock.json` com pacotes reais (não o stub vazio). Confirmar que `git check-ignore apps/web/package-lock.json` não devolve nada.
- [X] T012 [US2] Subir a web (`DC up -d web`) e acompanhar `DC logs web` até o `npm ci` do entrypoint terminar e o servidor Next ficar pronto. Confirmar `curl -i http://localhost:3002` → `200` e abrir `http://localhost:3002` no navegador para ver a página inicial padrão.
- [X] T013 [US2] Confirmar a reprodutibilidade (SC-006): `DC down` mantendo volumes, apagar o volume `ai-test-dev_web_node_modules`, subir de novo e verificar que o entrypoint reinstala com `npm ci` e que `git status` não mostra mudança em `apps/web/package-lock.json`.

**Checkpoint**: as duas histórias funcionam de forma independente.

---

## Phase 5: User Story 3 - Arquivos gerados pertencem ao usuário do host (Priority: P3)

**Goal**: nenhum erro de permissão e nenhum arquivo de root nos bind mounts.

**Independent Test**: `find apps -not -user "$USER"` não lista nada; logs e cache da API são gravados sem erro; editar e apagar arquivos gerados no host funciona sem `sudo`.

### Implementation for User Story 3

- [X] T014 [US3] Com a stack no ar e após `curl` em `/api/health`, rodar `find apps/api apps/web -not -user "$USER" -not -path '*/node_modules/*'` e confirmar saída vazia. Listar `apps/api/storage/logs` e `apps/api/storage/framework`, confirmando que existem e pertencem ao usuário do host.
- [X] T015 [US3] Forçar uma gravação de log e de cache pela API (por exemplo `DC exec api php artisan tinker --execute="Log::info('teste'); Cache::put('k','v',60);"`) e confirmar que não há `Permission denied` em `DC logs api` nem na saída, e que `apps/api/storage/logs/laravel.log` aparece no host.
- [X] T016 [US3] Provar a edição sem privilégio elevado: criar, editar e apagar no host um arquivo gerado pelo container (por exemplo `touch apps/api/storage/logs/teste.log` por dentro do container com `DC exec api touch storage/logs/teste.log`, depois `rm apps/api/storage/logs/teste.log` no host sem `sudo`). Se falhar, corrigir `user`/`uid` nos `Dockerfile` ou `docker/entrypoint.dev.sh` de `apps/api` e `apps/web` e repetir T014 a T016.

**Checkpoint**: as três histórias validadas.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: validação final e documentação

- [X] T017 Validar do zero (SC-001): `DC down -v`, remover `apps/api/vendor`, `apps/api/.env` e `apps/web/node_modules` do host se existirem, rodar `DC up -d --build` e conferir `ps`, `/api/health`, `DC exec api php artisan migrate` e `http://localhost:3002`. Salvar as saídas relevantes só no terminal, sem criar arquivos.
- [X] T018 Conferir segredos e ignores em `.gitignore`: `git status --short` não deve listar `.env`, `apps/api/.env`, `apps/api/vendor`, `apps/web/node_modules`, `apps/web/.next` nem `apps/web/next-env.d.ts`; `apps/api/.env.example` e `apps/web/package-lock.json` devem aparecer como novos arquivos. Ajustar `.gitignore` apenas se algo indevido aparecer.
- [X] T019 [P] Atualizar `docs/ideias.md`: marcar os checkboxes do item 2 como feitos (`[x] ✅`, trocando `🔸` pela legenda correspondente), o título do item 2 para `🟢`, o último checkbox do item 1 como feito e o título do item 1 para `🟢`. Para o item "Rotas de API", registrar que o roteamento foi habilitado manualmente em vez de `install:api`.
- [X] T020 [P] Atualizar `README.md` com os comandos de subida (`DC up -d --build`), de migração (`DC exec api php artisan migrate`) e as URLs `http://localhost:8002/api/health` e `http://localhost:3002`, mantendo o estilo do arquivo.
- [X] T021 Percorrer [quickstart.md](quickstart.md) do passo 1 ao 7 e confirmar que cada resultado esperado bate com o ambiente real.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências.
- **Foundational (Phase 2)**: depende da Setup; bloqueia todas as histórias.
- **US1 (P1)**: depende da Foundational. Não depende de US2.
- **US2 (P2)**: depende da Foundational. Não depende de US1 (a web só exibe a página padrão).
- **US3 (P3)**: depende de US1 e US2 terem rodado, porque verifica os arquivos que elas geram.
- **Polish**: depende das três histórias.

### Within Each User Story

- US1: T004 → T005, T006, T007 (arquivos diferentes, mas após o projeto existir) → T008 → T009.
- US2: T010 → T011 → T012 → T013.
- US3: T014 → T015 → T016.

### Parallel Opportunities

- US1 e US2 podem andar em paralelo (pastas diferentes): T010 [P] roda junto com T004. Como ambos usam o Docker, dá para rodar em dois terminais.
- T005, T006 e T007 tocam arquivos diferentes de `apps/api` e podem ser feitas juntas depois de T004.
- T019 e T020 (documentação) são independentes entre si.

### Parallel Example: User Story 1 e 2

```text
Terminal 1: T004 (criar Laravel)      Terminal 2: T010 (criar Next.js)
Depois:     T005, T006, T007           Depois:     T011
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Setup e Foundational.
2. US1 (T004 a T009).
3. **Parar e validar**: `/api/health` e `migrate` funcionam. A API sozinha já destrava o item 3 do backlog.

### Incremental Delivery

1. Setup + Foundational.
2. US1 → validar.
3. US2 → validar a stack inteira com `up`.
4. US3 → validar permissões.
5. Polish → validar do zero e atualizar a documentação.

---

## Notes

- Nenhum commit automático (constituição): as mudanças ficam no working tree para o dono do repositório commitar.
- Se `create-project` ou `create-next-app` falharem por falta de extensão PHP, ferramenta ou rede, corrigir o `Dockerfile` correspondente e refazer o `build` (T002) antes de repetir a tarefa.
- Se `UID` ou `USER` do host forem diferentes de 1000/`octacilio`, exportá-los no shell ou definir no `.env` antes de T002.
