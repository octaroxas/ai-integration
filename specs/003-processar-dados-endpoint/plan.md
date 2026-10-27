# Implementation Plan: Endpoint de processamento de dados

**Branch**: `feat/enviroment` | **Date**: 2026-10-27 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/003-processar-dados-endpoint/spec.md`

## Summary

Expor `POST /api/processar-dados` em `apps/api`: um controller invocável fino (`ProcessarDadosController`) recebe um Form Request (`ProcessarDadosRequest`: `conteudo` obrigatório, string, máximo de 10.000 caracteres), chama `DataAnalyst::analisar()` do item 3 e devolve `{ "sucesso": true, "analise": {...} }`. Os erros saem todos no envelope `{ "sucesso": false, "mensagem": "...", "erros"?: {...} }`, montado em `bootstrap/app.php`: `ValidationException` vira 422, `AnaliseFalhouException` vira 502/503/422 conforme o `TipoDeFalha`, e qualquer outra exceção vira 500 genérico. O CORS usa o middleware nativo do Laravel com um `config/cors.php` publicado, que libera só a origem de `CORS_ALLOWED_ORIGIN` (default `http://localhost:3002`). O contrato fica em [contracts/processar-dados.md](contracts/processar-dados.md). Sem tela, testes automatizados, autenticação, persistência ou limitação de taxa. Decisões em [research.md](research.md).

## Technical Context

**Language/Version**: PHP 8.4 (imagem `php:8.4-cli-alpine`); Laravel 13

**Primary Dependencies**: nenhuma nova; usa `laravel/ai` via `DataAnalyst` (item 3), o `HandleCors` e o Form Request nativos do Laravel

**Storage**: nenhum (requisição e resposta não são persistidas)

**Testing**: sem testes automatizados nesta feature (item 6 do backlog, com fake do cliente de IA); validação manual com `curl`, descrita no [quickstart.md](quickstart.md)

**Target Platform**: Docker Compose em Linux para desenvolvimento (container `api`, porta 8002 no host)

**Project Type**: aplicação web em monorepo; esta feature só toca `apps/api` e a documentação

**Performance Goals**: resposta em até 60 segundos, o tempo do agente (a rota não acrescenta latência relevante)

**Constraints**: nenhuma chamada ao provedor fora do agente; respostas e logs sem chave, rastros, nome do modelo nem resposta bruta; CORS só para a origem do frontend; JSON em todo `/api/*`

**Scale/Scope**: 1 desenvolvedor; 2 classes novas (controller e Form Request), 1 rota, 1 config publicada, ajustes em `bootstrap/app.php`

## Constitution Check

*GATE: aprovado antes da pesquisa; reavaliado após o design.*

| Princípio | Avaliação |
|-----------|-----------|
| I. Simplicidade | Passa. Controller invocável de uma linha útil, um Form Request, tratamento de erro num só lugar (`bootstrap/app.php`). Sem service, resource, middleware próprio, autenticação, rate limit nem variável para o limite de tamanho. |
| II. Fluxo ponta a ponta | Passa. Fatia o ciclo: entrega o elo web → API → modelo (menos a tela), validável com `curl` contra o Gemini real, como pede o backlog. |
| III. Chave só no backend | Passa. A rota nunca lê a chave; as respostas não a incluem; os erros usam só as mensagens fixas do `TipoDeFalha`. O CORS restrito impede que outro site use a API pelo navegador. |
| IV. IA isolada e substituível | Passa. O controller só chama `DataAnalyst::analisar()`; nenhuma chamada ao provedor, nome de modelo ou tratamento de resposta do modelo na rota. Falhas viram resposta clara pela `AnaliseFalhouException`. |
| V. Testes proporcionais | Passa com ressalva, como na spec 002. A constituição pede testes de validação, caminho feliz e erro do provedor na API; o backlog os agrupa no item 6, com o fake do cliente de IA, e a spec os deixa fora. Aqui a validação é manual com `curl`, e nada automatizado chama o provedor. |
| Stack e restrições | Passa. Laravel 13, tudo em Docker, mensagens em português. |
| Fluxo de desenvolvimento | Passa. Spec antes do código; nenhum commit automático. |

Reavaliação após o design: sem mudança. Sem violações de princípio MUST além do adiamento do princípio V descrito acima.

## Project Structure

### Documentation (this feature)

```text
specs/003-processar-dados-endpoint/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── processar-dados.md
├── checklists/
│   └── requirements.md
└── tasks.md             # gerado por /speckit-tasks
```

### Source Code (repository root)

```text
apps/api/
├── app/Http/
│   ├── Controllers/ProcessarDadosController.php   # invocável: chama DataAnalyst::analisar()
│   └── Requests/ProcessarDadosRequest.php         # regras e mensagens em português
├── bootstrap/app.php                              # envelope de erro: validação, AnaliseFalhouException, 500
├── config/cors.php                                # publicado; só a origem do frontend
├── routes/api.php                                 # + POST /processar-dados
└── .env.example                                   # + CORS_ALLOWED_ORIGIN
```

Fora de `apps/api`, mudam o `README.md` (endpoint e variável de CORS) e o `docs/ideias.md` (marcar o item 4). O `apps/api/.env` real, privado, recebe a nova variável só se o desenvolvedor quiser outra origem; o default já cobre o dev.

**Structure Decision**: segue as pastas padrão do Laravel (`Http/Controllers`, `Http/Requests`); o código de IA continua só em `app/Ai/` (item 3), sem alteração. O mapeamento de `TipoDeFalha` para status HTTP fica no tratamento de exceções em `bootstrap/app.php`, e não no enum, para que `app/Ai/` não conheça HTTP.

## Complexity Tracking

| Desvio | Por que | Alternativa mais simples rejeitada |
|---|---|---|
| Sem testes automatizados da API (princípio V) | O backlog agrupa os testes com fake do cliente de IA no item 6, e esta feature os exclui do escopo; o precedente é a spec 002. | Escrever os testes aqui: antecipa o item 6 e mistura duas fatias. O desvio dura até o item 6 e a validação manual cobre os mesmos cenários. |
