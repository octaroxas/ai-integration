# ai-project-integration-test

Aplicação mínima para testar a integração de um backend Laravel com modelos de Inteligência Artificial. O usuário cola um texto (dados, relatórios, anotações) numa página web, o backend envia o conteúdo ao modelo e devolve um resumo estruturado com planos de ação.

O objetivo é de aprendizado: validar o fluxo completo (web → API → modelo de IA → web) com o menor código possível, sem autenticação, sem histórico e sem recursos além do necessário.

> Status: **somente documentação**. Nenhum código foi criado ainda; este README descreve o escopo e a estrutura planejada.

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
4. O modelo devolve um resumo estruturado e planos de ação, e a API responde `{ "sucesso": true, "analise": "..." }`.
5. O frontend exibe o resultado abaixo do formulário.

## Configuração

A chave do Gemini fica apenas no `.env` da API, que não deve ser versionado:

```env
GEMINI_API_KEY=sua_chave_do_google_ai_studio
```

O frontend recebe só a URL da API, por meio de `NEXT_PUBLIC_API_URL`. A chave nunca vai para o navegador.

## Docker

Três serviços:

| Serviço | Origem | Porta padrão do host |
|---|---|---|
| `postgres` | `postgres:16-alpine` | 5432 |
| `api` | `apps/api` | 8000 |
| `web` | `apps/web` | 3000 |

Pontos de atenção em ambiente compartilhado (VPS):

- **Conflito de portas:** confirme que as portas acima estão livres e ajuste o mapeamento do host se necessário (por exemplo `8500:8000`). Deixe as portas configuráveis pelo `.env` da raiz.
- **Proxy reverso:** em produção, o Nginx do servidor recebe o tráfego dos domínios e repassa para as portas dos containers.
- **Permissões de volume:** as pastas `apps/api` e `apps/web` precisam permitir escrita pelo usuário do container, para evitar `Permission Denied` em logs e caches.

## Próximos passos

1. Criar `docker-compose.dev.yaml` e os `Dockerfile` de `apps/api` e `apps/web`.
2. Instalar o Laravel 13 em `apps/api` e configurar o AI SDK com o Gemini.
3. Criar o agente `DataAnalyst` e o endpoint `POST /api/processar-dados`.
4. Criar a página em `apps/web` e conectá-la à API.
5. Configurar CORS na API para a origem do frontend.
