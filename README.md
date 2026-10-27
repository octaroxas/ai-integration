# ai-project-integration-test

Aplicação mínima para testar a integração de um backend Laravel com modelos de Inteligência Artificial. O usuário cola um texto (dados, relatórios, anotações) numa página web, o backend envia o conteúdo ao modelo e devolve um resumo estruturado com planos de ação.

O objetivo é de aprendizado: validar o fluxo completo (web → API → modelo de IA → web) com o menor código possível, sem autenticação, sem histórico e sem recursos além do necessário.

> Status: **esqueleto rodando no Docker**. Os projetos Laravel (`apps/api`) e Next.js (`apps/web`) existem e sobem juntos com o banco; a rota `GET /api/health` responde. O agente `DataAnalyst` conversa com o Gemini e é exposto por `POST /api/processar-dados`, e a web tem a tela de análise que fecha o ciclo ponta a ponta. Faltam os testes automatizados e o deploy.

## Stack

| Camada | Tecnologia |
|---|---|
| API | Laravel 13 com o AI SDK nativo |
| Web | Next.js (App Router, React 19) |
| Banco de dados | PostgreSQL 16 (preparado para `pgvector`, caso surjam buscas semânticas) |
| Modelo de IA | Google Gemini, via API Key gratuita do [Google AI Studio](https://aistudio.google.com/) |
| Infraestrutura | Docker e Docker Compose |

## Estrutura planejada

Monorepo no mesmo padrão do projeto `doit`: Docker Compose na raiz e as aplicações dentro de `apps/`.

```text
apps/api/                  API Laravel
apps/web/                  Frontend Next.js
docker-compose.dev.yaml    stack de desenvolvimento
docker-compose.yaml        stack de produção
.env.example               variáveis da raiz (portas do host, credenciais do Postgres)
```

## Fluxo da aplicação

1. A página web exibe um `textarea` e um botão **Analisar Dados**.
2. Ao enviar, o frontend faz `POST /api/processar-dados` com `{ "conteudo": "..." }`.
3. A API valida o payload e repassa o texto a um agente (`App\Ai\Agents\DataAnalyst`) do Laravel AI SDK, configurado para o Gemini.
4. O modelo devolve um resumo estruturado e planos de ação, e a API responde `{ "sucesso": true, "analise": { "resumo": "...", "pontos_principais": [...], "planos_de_acao": [...] } }`.
5. O frontend exibe o resultado abaixo do formulário.

## Configuração

A chave do Gemini fica apenas no `.env` da API, que não deve ser versionado:

```env
GEMINI_API_KEY=sua_chave_do_google_ai_studio
AI_PROVIDER=gemini
AI_MODEL=gemini-3.5-flash-lite
CORS_ALLOWED_ORIGIN=http://localhost:3002
```

O frontend recebe só a URL da API, por meio de `NEXT_PUBLIC_API_URL` (injetada pelo `docker-compose.dev.yaml` e documentada em `apps/web/.env.example`). Essa variável é pública, então nunca coloque segredos nela. A chave nunca vai para o navegador.

O modelo é definido por `AI_MODEL`, sem nome fixo no código. Na camada gratuita a disponibilidade e a cota variam por modelo e por dia; se aparecer erro de limite de uso ou de indisponibilidade, espere ou troque o modelo. Depois de editar o `apps/api/.env`, reinicie a API (`docker compose -f docker-compose.dev.yaml restart api`).

Para testar o agente sem endpoint (consome a cota gratuita real):

```bash
docker compose -f docker-compose.dev.yaml exec api php artisan tinker
```

```php
(new \App\Ai\Agents\DataAnalyst)->analisar('Vendas caíram 12% em outubro e o estoque do produto A está parado há 60 dias.');
```

A resposta é um array com `resumo`, `pontos_principais` e `planos_de_acao`. Falhas do provedor viram `App\Ai\Exceptions\AnaliseFalhouException`, com o tipo em `$e->tipo` e uma mensagem em português.

## Endpoint `POST /api/processar-dados`

```bash
curl -s -X POST http://localhost:8002/api/processar-dados \
  -H 'Content-Type: application/json' -H 'Accept: application/json' \
  -d '{"conteudo":"Vendas caíram 12% em outubro e o estoque do produto A está parado há 60 dias."}'
```

`conteudo` é obrigatório, texto, com até 10.000 caracteres. Sucesso devolve 200 com `sucesso: true` e `analise`; erros devolvem `sucesso: false` e `mensagem` em português (422 validação, 502/503 falha do provedor, 500 inesperado). O CORS libera só a origem de `CORS_ALLOWED_ORIGIN`. Contrato completo: [specs/003-processar-dados-endpoint/contracts/processar-dados.md](specs/003-processar-dados-endpoint/contracts/processar-dados.md).

## Docker

Três serviços:

| Serviço | Origem | Porta padrão do host |
|---|---|---|
| `db` | `postgres:16-alpine` | 5436 |
| `api` | `apps/api` | 8002 |
| `web` | `apps/web` | 3002 |

Os defaults evitam colidir com o `doit` (8001, 5435, 3001) rodando na mesma máquina e são configuráveis no `.env` da raiz (`APP_PORT`, `DB_PORT`, `WEB_PORT`).

Pontos de atenção em ambiente compartilhado (VPS):

- **Conflito de portas:** confirme que as portas acima estão livres e ajuste o mapeamento do host se necessário (por exemplo `8500:8000`). Deixe as portas configuráveis pelo `.env` da raiz.
- **Proxy reverso:** em produção, o Nginx do servidor recebe o tráfego dos domínios e repassa para as portas dos containers.
- **Permissões de volume:** as pastas `apps/api` e `apps/web` precisam permitir escrita pelo usuário do container, para evitar `Permission Denied` em logs e caches.

## Rodando em desenvolvimento

Só Docker e Docker Compose são necessários (sem PHP, Node ou Postgres no host).

```bash
cp .env.example .env
mkdir -p apps/web/node_modules apps/web/.next   # evita que o Docker crie essas pastas como root
docker compose -f docker-compose.dev.yaml up -d --build
docker compose -f docker-compose.dev.yaml exec api php artisan migrate
```

- API: <http://localhost:8002/api/health> responde `{"status":"ok"}`.
- Web: <http://localhost:3002> exibe a tela de análise.

Na primeira subida a API roda `composer install` e a web roda `npm ci`; acompanhe com `docker compose -f docker-compose.dev.yaml logs -f api web`. As migrações são manuais e não rodam sozinhas ao iniciar a API. Se o seu `UID` não for 1000, exporte `UID` e `USER` antes do `up --build` para que os arquivos gerados fiquem com o seu dono.

## Usando a tela de análise

1. Abra <http://localhost:3002>, cole um texto (até 10.000 caracteres) e clique em **Analisar Dados**.
2. Enquanto a IA responde, o botão fica desabilitado com "Processando com IA...".
3. A tela mostra o resumo, os pontos principais e os planos de ação; se algo falhar (API fora do ar, cota do provedor, texto inválido), aparece uma mensagem de erro em vez do resultado.

## Próximos passos

1. Testes automatizados com o cliente de IA substituído por fake.
