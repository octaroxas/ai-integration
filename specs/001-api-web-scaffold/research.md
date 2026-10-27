# Research: Projetos da API e da Web no Docker

Data: 2026-10-27. Versões conferidas no Packagist e no npm na data.

## 1. Versão do Laravel

- **Decision**: `laravel/laravel` v13.x (último 13.11.0, `laravel/framework ^13.17`, PHP ^8.3).
- **Rationale**: o Laravel 13 existe e é o exigido pela constituição. A imagem `php:8.4-cli-alpine` do Dockerfile atende ao PHP ^8.3.
- **Alternatives considered**: Laravel 12 (rejeitado: a constituição pede 13 e o AI SDK nativo é do 13).

## 2. Como criar o projeto Laravel sem PHP no host

- **Decision**: rodar o `composer create-project laravel/laravel` com `--no-scripts` dentro de um container da imagem `dev` da API (`docker compose run --rm --no-deps --entrypoint ""`), em um diretório temporário (`/tmp/app`), e copiar o resultado para `/var/www/html` (o bind mount de `apps/api`).
- **Rationale**: `create-project` exige diretório vazio, e `apps/api` já tem `Dockerfile`, `docker/` e `.dockerignore`. O container roda com o UID do host (build arg `uid`), então os arquivos copiados já nascem com o dono certo (FR-009). `--no-scripts` evita o `post-create-project-cmd` do esqueleto, que cria um SQLite e roda `migrate`; o `.env` e a `APP_KEY` já são gerados pelo `entrypoint.dev.sh`.
- **Alternatives considered**: instalar PHP/Composer no host (viola FR-002); `composer create-project` direto em `apps/api` (falha por diretório não vazio); mover os arquivos de Docker para fora e de volta (mais passos e risco de perdê-los).

## 3. Rotas de API

- **Decision**: não usar `php artisan install:api`. Habilitar o roteamento de API registrando `routes/api.php` em `bootstrap/app.php` (`api: __DIR__.'/../routes/api.php'`, prefixo `/api` padrão) e criar o arquivo com a rota de saúde.
- **Rationale**: `install:api` instala o Sanctum e publica a migração `personal_access_tokens`, ou seja, autenticação que o projeto não usa (Princípio I). A ligação manual são duas linhas e entrega o mesmo `routes/api.php`.
- **Alternatives considered**: `install:api` (rejeitado por trazer dependência e tabela de autenticação sem uso); manter só `routes/web.php` com prefixo manual (foge do padrão do Laravel e do critério `/api/health`).

## 4. Rota de saúde

- **Decision**: `GET /api/health` devolve `200` com JSON `{"status":"ok"}`, sem tocar no banco (decisão da clarificação de 2026-10-27).
- **Rationale**: mínimo suficiente para o critério de aceite; a conexão com o banco é validada pelas migrações (FR-006).
- **Alternatives considered**: checar o banco na rota (rejeitado na clarificação); resposta em texto puro (JSON é o padrão das rotas de API).

## 5. Banco e variáveis de ambiente da API

- **Decision**: ajustar `apps/api/.env.example` para `DB_CONNECTION=pgsql`, `DB_HOST=db`, `DB_PORT=5432`, `DB_DATABASE=ai_test`, `DB_USERNAME=ai_test`, `DB_PASSWORD=ai_test` (mesmos defaults do `.env.example` da raiz), `APP_URL=http://localhost:8002` e `SESSION_DRIVER=file`, `CACHE_STORE=file`, `QUEUE_CONNECTION=sync`.
- **Rationale**: o esqueleto vem com SQLite e drivers `database` para sessão, cache e fila. Com `file`/`sync`, a API sobe e responde sem que as migrações tenham rodado, coerente com migrações manuais e com `/api/health` sem banco. O `docker-compose.dev.yaml` já injeta `DB_*` no container, então `.env.example` e Compose ficam coerentes.
- **Alternatives considered**: manter os drivers `database` (rejeitado: a rota `/` e qualquer rota `web` quebram antes do `migrate`, o que complica a primeira subida).

## 6. Versão e criação do Next.js

- **Decision**: `create-next-app@latest` (Next 16.4, aceita `react ^19`) em `/tmp/web` dentro de um container da imagem `dev` da web, com `--ts --eslint --app --no-tailwind --no-src-dir --import-alias "@/*" --use-npm --skip-install --yes`; copiar para `/app`; gerar o lock com `npm install --package-lock-only`.
- **Rationale**: App Router e React 19 vêm por padrão no Next atual. `--skip-install` evita instalar dentro do container de criação; o `--package-lock-only` produz o `package-lock.json` versionado (FR-008) sem popular `node_modules`, que fica no volume nomeado e é instalado pelo `entrypoint.dev.sh` com `npm ci`. Sem Tailwind e sem `src/` para manter o projeto mínimo (Princípio I); TypeScript e ESLint ficam por serem o padrão do gerador.
- **Alternatives considered**: criar direto em `/app` (o gerador recusa diretório com arquivos conflitantes e a pasta tem `Dockerfile`/`docker/`); instalar e versionar `node_modules` (inadequado); JavaScript sem TypeScript (foge do padrão do gerador atual).

## 7. Permissões dos bind mounts

- **Decision**: manter a abordagem atual dos Dockerfiles (usuário com o `uid` do host, build args `user`/`uid` vindos de `${USER}`/`${UID}`) e executar os comandos de criação nesses mesmos containers. Se `UID` não estiver exportado no shell, o default 1000 vale. Validar com `stat -c %U` nos arquivos gerados e com uma requisição à API que grave log.
- **Rationale**: o `.env.example` da raiz já documenta que o bash exporta `USER` mas não `UID`. O host deste projeto tem UID 1000, igual ao default, então não exige ajuste. Volumes nomeados (`web_node_modules`, `web_next`) herdam o dono criado no Dockerfile.
- **Alternatives considered**: `chmod -R 777` em `storage` (rejeitado: esconde o problema em vez de resolvê-lo); `user:` no Compose (redundante com o build arg).

## 8. Itens já resolvidos

- Formato do corpo de `/api/health`: `{"status":"ok"}` (item 4).
- Nenhum `NEEDS CLARIFICATION` restante.
