# Implementation Plan: Projetos da API e da Web no Docker

**Branch**: `feat/enviroment` | **Date**: 2026-10-27 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-api-web-scaffold/spec.md`

## Summary

Criar os projetos Laravel 13 (`apps/api`) e Next.js 16 (App Router, React 19, `apps/web`) usando só containers, de modo que `docker compose -f docker-compose.dev.yaml up` suba banco, API e web sem erro. A API ganha o roteamento `/api` e a rota `GET /api/health` (sem tocar no banco), com `.env.example` apontando para o Postgres do Compose; as migrações são manuais. A web vem com a página inicial padrão e o `package-lock.json` versionado. Os arquivos gerados pelos containers pertencem ao usuário do host. Decisões e alternativas em [research.md](research.md).

## Technical Context

**Language/Version**: PHP 8.4 (imagem `php:8.4-cli-alpine`, Laravel 13 exige ^8.3); Node 24 (imagem `node:24-alpine`) com TypeScript

**Primary Dependencies**: `laravel/laravel` 13.x (framework ^13.17); Next.js 16.4 com React 19; Composer 2 e npm

**Storage**: PostgreSQL 16 (serviço `db` do Compose); sem tabelas de negócio, só as migrações do esqueleto

**Testing**: sem testes automatizados nesta feature (fora de escopo, item 6 do backlog); validação manual pelo [quickstart.md](quickstart.md)

**Target Platform**: Docker Compose em Linux para desenvolvimento local

**Project Type**: aplicação web em monorepo (API + web em `apps/`)

**Performance Goals**: N/A (scaffolding de desenvolvimento)

**Constraints**: nada de PHP/Node/Postgres no host; arquivos dos bind mounts com o dono do usuário do host; nenhum segredo versionado; sem Sanctum, sem autenticação

**Scale/Scope**: 1 desenvolvedor, 3 containers, 1 rota HTTP nova

## Constitution Check

*GATE: aprovado antes da pesquisa; reavaliado após o design.*

| Princípio | Avaliação |
|-----------|-----------|
| I. Simplicidade | Passa. Sem Sanctum, sem Tailwind, sem `src/`, sem sessão/cache em banco; só o necessário para o critério de aceite. |
| II. Fluxo ponta a ponta | Passa. Entrega a base de web e API rodando juntas, pré-requisito do ciclo completo; não constrói camada isolada. |
| III. Chave de API só no backend | Passa. Nenhuma chave de IA é criada; `.env` continua ignorado e só `.env.example` entra no git. |
| IV. IA isolada e substituível | Não se aplica. Sem integração com IA nesta feature. |
| V. Testes proporcionais | Não se aplica. Testes automatizados estão fora de escopo da spec (item 6 do backlog); a verificação é o quickstart. |
| Stack e restrições | Passa. Laravel 13, Next.js App Router/React 19, Postgres 16, tudo em Docker, portas 8002/3002/5436. |
| Fluxo de desenvolvimento | Passa. Alterações em arquivos de Docker serão validadas com `docker compose config` e `build`; nenhum commit automático. |

Reavaliação após o design: sem mudança. Nenhuma violação, então não há Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/001-api-web-scaffold/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── health.md
├── checklists/
│   └── requirements.md
└── tasks.md             # gerado por /speckit-tasks
```

### Source Code (repository root)

```text
apps/
├── api/                          # Laravel 13 (novo; Dockerfile e docker/ já existem)
│   ├── bootstrap/app.php         # registra routes/api.php
│   ├── routes/api.php            # GET /api/health
│   ├── .env.example              # Postgres do Compose, drivers file/sync
│   └── …                         # restante do esqueleto Laravel
└── web/                          # Next.js 16 (novo; Dockerfile e docker/ já existem)
    ├── app/                      # App Router, página inicial padrão
    ├── package.json
    ├── package-lock.json         # versionado
    └── …                         # restante do gerador
```

Fora de `apps/`, só podem mudar, se a validação exigir: `.gitignore`, `docker-compose.dev.yaml`, os `Dockerfile`/`entrypoint.dev.sh` de cada app e o `README.md`/`docs/ideias.md` (marcar o item 2 e o último checkbox do item 1).

**Structure Decision**: monorepo com `apps/api` e `apps/web`, já definido pela constituição; sem novas pastas na raiz.

## Complexity Tracking

Sem violações da constituição; nada a justificar.
