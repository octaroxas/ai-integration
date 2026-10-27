# Implementation Plan: Integração com o Gemini na API

**Branch**: `feat/enviroment` | **Date**: 2026-10-27 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/002-gemini-ai-integration/spec.md`

## Summary

Instalar o Laravel AI SDK (`laravel/ai`) em `apps/api` e criar o agente `App\Ai\Agents\DataAnalyst`, o único ponto que fala com o Gemini. O agente tem instruções de sistema e saída estruturada (`resumo`, `pontos_principais`, `planos_de_acao`) e expõe `analisar(string): array`. A chave vem de `GEMINI_API_KEY` no `apps/api/.env`; provedor e modelo vêm de `AI_PROVIDER` e `AI_MODEL` (exemplo gratuito: `gemini-3.5-flash-lite`). Toda falha do provedor vira uma `AnaliseFalhouException` tratada, com tipo e mensagem fixa em português, sem vazar chave, URL ou resposta bruta. Validação manual pelo `tinker`; sem endpoint, tela ou testes automatizados. Decisões em [research.md](research.md).

## Technical Context

**Language/Version**: PHP 8.4 (imagem `php:8.4-cli-alpine`); Laravel 13

**Primary Dependencies**: `laravel/ai` v1.x (exige PHP ^8.3 e `illuminate/*` ^13); Gemini como provedor; `laravel/tinker` já presente

**Storage**: nenhum (a análise não é persistida); o armazenamento de conversas do SDK não é usado

**Testing**: sem testes automatizados nesta feature (item 6 do backlog, com fake do cliente de IA); validação manual pelo [quickstart.md](quickstart.md), com chamada real ao Gemini

**Target Platform**: Docker Compose em Linux para desenvolvimento (container `api`)

**Project Type**: aplicação web em monorepo; esta feature só toca `apps/api`

**Performance Goals**: resposta em até 60 segundos (timeout padrão do SDK de 60 s)

**Constraints**: chave só em `apps/api/.env`; modelo e provedor por variável de ambiente; nenhuma chamada ao provedor fora do agente; mensagens de erro sem detalhes internos; cota gratuita do Gemini

**Scale/Scope**: 1 desenvolvedor; ~4 classes novas; 0 rotas

## Constitution Check

*GATE: aprovado antes da pesquisa; reavaliado após o design.*

| Princípio | Avaliação |
|-----------|-----------|
| I. Simplicidade | Passa. Um agente, uma exceção e um enum; sem serviço extra, sem conversas persistidas, sem failover entre provedores, sem atributos que fixem modelo. |
| II. Fluxo ponta a ponta | Passa. Entrega o elo central do ciclo (API → modelo) de forma fatiada, antes de endpoint e tela, como pede o backlog. |
| III. Chave só no backend | Passa. `GEMINI_API_KEY` só em `apps/api/.env`; `.env.example` com a entrada vazia; a exceção não carrega `previous` nem texto do provedor, e não há log da chave. |
| IV. IA isolada e substituível | Passa. `DataAnalyst` é o único ponto; provedor e modelo vêm de `AI_PROVIDER`/`AI_MODEL`, sem nome fixo no código; falhas viram `AnaliseFalhouException`. |
| V. Testes proporcionais | Passa com ressalva. Nenhuma chamada real em testes automatizados (não há testes aqui); a validação manual usa o provedor real por exigência do critério de aceite. Os testes com fake ficam no item 6. |
| Stack e restrições | Passa. Laravel 13, AI SDK nativo, Gemini, tudo em Docker, mensagens em português. |
| Fluxo de desenvolvimento | Passa. Mudanças validadas no container; nenhum commit automático. |

Reavaliação após o design: sem mudança. Sem violações, então não há Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/002-gemini-ai-integration/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── data-analyst.md
├── checklists/
│   └── requirements.md
└── tasks.md             # gerado por /speckit-tasks
```

### Source Code (repository root)

```text
apps/api/
├── app/Ai/
│   ├── Agents/DataAnalyst.php             # agente: instruções, schema, analisar()
│   ├── Enums/TipoDeFalha.php              # tipos de falha tratada
│   └── Exceptions/AnaliseFalhouException.php
├── config/ai.php                          # publicado pelo SDK; provedor e modelo por env
├── composer.json / composer.lock          # + laravel/ai
└── .env.example                           # + GEMINI_API_KEY (vazia), AI_PROVIDER, AI_MODEL
```

Fora de `apps/api`, só mudam o `README.md` e o `docs/ideias.md` (marcar o item 3).

**Structure Decision**: tudo em `apps/api/app/Ai/`, o namespace que o backlog e a documentação do SDK já usam (`App\Ai\Agents\DataAnalyst`). Sem novas pastas na raiz e sem mudanças no Docker.

## Complexity Tracking

Sem violações da constituição; nada a justificar.
