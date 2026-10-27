# Ideias e Backlog

> Documento vivo com o que deve ser implementado, **na ordem em que deve ser feito**. Cada seção depende da anterior. Origem: `projeto-ia-laravel-next.md`. Quando um item virar trabalho de verdade, ele é promovido para `specs/NNN-nome-da-feature/` via `/speckit-specify`. Princípios que valem para tudo: [constituição](../.specify/memory/constitution.md).

**Legenda**: ✅ item implementado · 🔸 item pendente · 🟢 seção inteira implementada · 🟡 seção com pendências.

---

## 1. Fundação do repositório e Docker 🟢

**Problema**: antes de qualquer código de aplicação, o monorepo precisa de estrutura, Docker e fluxo de trabalho definidos, no mesmo padrão do `doit`.

Ideias:

- [x] ✅ README com contexto, stack, estrutura planejada e fluxo da aplicação.
- [x] ✅ `docker-compose.dev.yaml` com `db` (Postgres 16), `api` e `web`; portas configuráveis (8002, 5436, 3002).
- [x] ✅ `Dockerfile` (target `dev`) e `entrypoint.dev.sh` de `apps/api` e `apps/web`, mais `.dockerignore`.
- [x] ✅ `.env.example` da raiz e `.gitignore`.
- [x] ✅ Spec Kit instalado e constituição v1.0.0.
- [x] ✅ Subir a stack completa de ponta a ponta (`docker compose -f docker-compose.dev.yaml up --build`), validado com os projetos do item 2.

**Critério de aceite**: `docker compose -f docker-compose.dev.yaml up -d --build` sobe os três serviços sem erro e sem exigir PHP, Node ou Postgres na máquina.

---

## 2. Criar os projetos Laravel e Next.js 🟢

**Problema**: `apps/api` e `apps/web` estão vazios, então os entrypoints do Docker ainda não têm o que instalar.

Ideias:

- [x] ✅ **Laravel 13 em `apps/api`**, criado via container (`composer create-project`), sem instalar PHP no host.
- [x] ✅ **Rotas de API**: `routes/api.php` registrado em `bootstrap/app.php`, sem `php artisan install:api` para não trazer o Sanctum (autenticação não é usada).
- [x] ✅ **Conexão com o Postgres** no `apps/api/.env.example` (`DB_HOST=db`, credenciais iguais às do `.env` da raiz) e `php artisan migrate` rodando no container (manual).
- [x] ✅ **Next.js em `apps/web`** (App Router, React 19), criado via container, com `package-lock.json` versionado.
- [x] ✅ Permissões dos bind mounts conferidas com `UID`/`USER` do host. As pastas `apps/web/node_modules` e `apps/web/.next` precisam existir antes do primeiro `up` (ver README), senão o Docker as cria como root.
- [x] ✅ Rota de saúde simples na API (`GET /api/health`) para confirmar que a stack responde.

**Critério de aceite**: `http://localhost:8002/api/health` responde pela API e `http://localhost:3002` exibe a página inicial do Next.js, ambos dentro do Docker.

---

## 3. Integração com o Gemini na API 🔸

**Problema**: o núcleo do projeto é a comunicação com o modelo de IA. Isso precisa funcionar e ficar isolado antes de existir qualquer tela ou endpoint público ([princípio IV](../.specify/memory/constitution.md)).

Ideias:

- [ ] 🔸 **Instalar e configurar o AI SDK do Laravel 13**, conferindo na documentação oficial do SDK o nome do pacote e o formato da configuração do provedor Gemini.
- [ ] 🔸 **Chave em `apps/api/.env`** (`GEMINI_API_KEY`), com a entrada vazia no `apps/api/.env.example`; nunca no frontend nem no git ([princípio III](../.specify/memory/constitution.md)).
- [ ] 🔸 **Modelo configurável por variável de ambiente** (ex.: `AI_MODEL`), sem nome fixo no código. O documento de origem cita Gemini 1.5 Flash, que pode estar defasado: conferir no Google AI Studio qual modelo gratuito está disponível hoje.
- [ ] 🔸 **Agente `DataAnalyst`** (`App\Ai\Agents\DataAnalyst`) com instruções de sistema: analisar o conteúdo e devolver resumo estruturado e planos de ação.
- [ ] 🔸 **Validar a chamada isolada** pelo `php artisan tinker` antes de criar o endpoint.
- [ ] 🔸 **Tratamento de falhas do provedor** (cota, timeout, chave inválida, resposta vazia) convertido em erro claro, sem expor detalhes internos.

**Critério de aceite**: no `tinker`, chamar o agente com um texto devolve a análise do Gemini; com a chave inválida, devolve um erro tratado, não uma exceção crua.

---

## 4. Endpoint `POST /api/processar-dados` 🔸

**Problema**: a web precisa de um contrato HTTP simples para enviar o texto e receber a análise.

Ideias:

- [ ] 🔸 **Rota `POST /api/processar-dados`** recebendo `{ "conteudo": "..." }` e respondendo `{ "sucesso": true, "analise": "..." }`.
- [ ] 🔸 **Validação** via Form Request: `conteudo` obrigatório, string e com tamanho máximo (definir o limite na spec, para proteger a cota).
- [ ] 🔸 **Controller fino** que só chama o agente do item 3; nenhuma chamada ao provedor dentro da rota ([princípio IV](../.specify/memory/constitution.md)).
- [ ] 🔸 **Respostas de erro** consistentes (422 para validação, 5xx/502 para falha do provedor) com `sucesso: false` e uma mensagem em português.
- [ ] 🔸 **CORS** liberando só a origem do frontend (`http://localhost:3002` em dev).
- [ ] 🔸 Documentar o contrato (request, response, erros) em `docs/` ou na spec da feature.

**Critério de aceite**: um `curl` para `/api/processar-dados` com texto válido devolve a análise; sem `conteudo`, devolve 422; com o provedor indisponível, devolve erro claro.

---

## 5. Tela de análise no Next.js 🔸

**Problema**: o usuário precisa colar um texto, enviar e ver a resposta, fechando o ciclo ponta a ponta ([princípio II](../.specify/memory/constitution.md)).

Ideias:

- [ ] 🔸 **Página única** com `textarea` e botão "Analisar Dados", em `apps/web`.
- [ ] 🔸 **URL da API por `NEXT_PUBLIC_API_URL`**, nunca fixa no código (o documento de origem usava `localhost:8000` direto).
- [ ] 🔸 **Estado de carregamento**: botão desabilitado e texto "Processando com IA..." durante a chamada, evitando envio duplicado.
- [ ] 🔸 **Exibição do resultado** preservando quebras de linha; avaliar renderizar Markdown se o modelo responder com ele.
- [ ] 🔸 **Exibição de erro** visível quando a API falha ou fica inacessível (o original só dava `console.error`).
- [ ] 🔸 **Validação no cliente**: não enviar texto vazio.

**Critério de aceite**: colar um texto, clicar em "Analisar Dados" e ver a análise do Gemini na tela; em caso de falha, ver uma mensagem de erro em vez de nada.

---

## 6. Testes automatizados 🔸

**Problema**: proteger o fluxo sem gastar a cota gratuita ([princípio V](../.specify/memory/constitution.md)).

Ideias:

- [ ] 🔸 **API**: testes de feature do endpoint com o cliente de IA substituído por fake — validação, caminho feliz e erro do provedor. Teste visto falhar antes.
- [ ] 🔸 **Web**: teste do fluxo principal (enviar, carregando, resultado, erro) com a API mockada.
- [ ] 🔸 Documentar no README como rodar os testes dentro do Docker.

**Critério de aceite**: a suíte roda sem chave de API e sem rede, e cobre os três cenários do endpoint e o fluxo da tela.

---

## 7. Deploy em VPS compartilhada 🔸

**Problema**: o ambiente final é uma VPS compartilhada, onde portas, proxy e permissões podem conflitar com outros usuários.

Ideias:

- [ ] 🔸 **`docker-compose.yaml` de produção** (targets `production` nos `Dockerfile`, sem bind mounts, sem portas de banco expostas).
- [ ] 🔸 **Conferir portas livres** no host e ajustar o mapeamento pelo `.env`.
- [ ] 🔸 **Proxy reverso**: Nginx global da VPS repassando os domínios para os containers.
- [ ] 🔸 **Permissões de volume** para logs e cache sem `Permission Denied`.
- [ ] 🔸 **Segredos em produção**: `GEMINI_API_KEY` e senha do banco só no servidor, nunca no repositório.
- [ ] 🔸 Guia em `docs/deploy.md`.

**Critério de aceite**: a aplicação responde pelo domínio público atrás do Nginx, com a chave de API configurada só no servidor.

---

## 8. Evoluções futuras (sem compromisso) 🔸

**Problema**: ideias de estudo que só fazem sentido depois do fluxo básico estável. Não entram antes de os itens 1 a 7 estarem prontos ([princípio I](../.specify/memory/constitution.md)).

Ideias:

- [ ] 🔸 **Outros provedores de IA** além do Gemini, trocando só o ponto de integração e a configuração, para comparar respostas.
- [ ] 🔸 **Streaming da resposta** na tela, em vez de esperar a resposta completa.
- [ ] 🔸 **Histórico de análises** no Postgres (primeira feature que realmente usa o banco).
- [ ] 🔸 **Busca semântica** com `pgvector`, usando embeddings dos textos analisados.
- [ ] 🔸 **Upload de arquivos** (CSV, texto) como entrada, em vez de só colar texto.
- [ ] 🔸 **Prompts configuráveis** (tipos de análise: resumo, plano de ação, extração de dados).
