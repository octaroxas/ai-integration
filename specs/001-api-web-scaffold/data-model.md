# Data Model: Projetos da API e da Web no Docker

A feature **não introduz entidades de domínio** (spec, seção Key Entities).

O único efeito sobre o banco vem das migrações que acompanham o esqueleto do Laravel (`users`, `password_reset_tokens`, `sessions`, `cache`, `cache_locks`, `jobs`, `job_batches`, `failed_jobs`). Elas são executadas manualmente por `php artisan migrate` e servem apenas para provar que a API alcança o Postgres (FR-006). Nenhuma tabela de negócio é criada e nenhuma delas é usada por esta feature: sessão, cache e fila ficam em `file`/`sync` (ver `research.md`, item 5).

Não há validações nem transições de estado a documentar.
