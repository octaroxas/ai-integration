# Quickstart: validar a stack de ponta a ponta

Pré-requisito: apenas Docker e Docker Compose na máquina (sem PHP, Node ou Postgres no host).

## 1. Preparar o ambiente

```bash
cp .env.example .env
mkdir -p apps/web/node_modules apps/web/.next
```

O `mkdir` é necessário: `node_modules` e `.next` são pontos de montagem de volumes nomeados dentro do bind mount e, se não existirem, o Docker os cria como root no host (FR-009).

O `apps/api/.env` é criado pelo próprio container da API na primeira subida (a partir de `apps/api/.env.example`).

## 2. Subir a stack

```bash
docker compose -f docker-compose.dev.yaml up -d --build
docker compose -f docker-compose.dev.yaml ps
```

Esperado: `db` (healthy), `api` e `web` em execução. Na primeira vez a API roda `composer install` e a web roda `npm ci`; acompanhe com `docker compose -f docker-compose.dev.yaml logs -f api web`.

## 3. API responde (US1)

```bash
curl -i http://localhost:8002/api/health
```

Esperado: `200` e `{"status":"ok"}` (ver `contracts/health.md`).

## 4. Migrações no container (US1, FR-006)

```bash
docker compose -f docker-compose.dev.yaml exec api php artisan migrate
```

Esperado: termina sem erro. A API não roda esse comando sozinha.

## 5. Web exibe a página inicial (US2)

Abrir `http://localhost:3002` no navegador, ou `curl -i http://localhost:3002`. Esperado: `200` e a página inicial padrão do Next.js. Conferir que `apps/web/package-lock.json` existe e está no git.

## 6. Permissões (US3)

```bash
find apps/api apps/web -not -user "$USER" -not -path '*/node_modules/*' | head
```

Esperado: nenhuma linha. Depois da chamada do passo 3, `apps/api/storage/logs` e `apps/api/storage/framework` existem e são graváveis sem `sudo`. Também deve ser possível editar e apagar qualquer arquivo gerado sem privilégio elevado.

## 7. Portas alternativas (caso de borda)

Trocar `APP_PORT` e `WEB_PORT` no `.env` da raiz, rodar `docker compose -f docker-compose.dev.yaml up -d` e repetir os passos 3 e 5 nas novas portas.
