# Feature Specification: Projetos da API e da Web no Docker

**Feature Branch**: `feat/enviroment` (branch atual; nenhuma branch nova foi criada)

**Created**: 2026-10-27

**Status**: Draft

**Input**: User description: "Criar os projetos de aplicação do monorepo para que a stack de desenvolvimento em Docker suba de ponta a ponta. Hoje `apps/api` e `apps/web` contêm só a configuração de Docker, sem projeto dentro, então os containers não têm o que executar. Ao final, o desenvolvedor deve conseguir, sem ter PHP, Node ou Postgres instalados na máquina, rodar o `docker compose` de desenvolvimento e obter: (1) uma API Laravel com rotas de API habilitadas, conectada ao banco Postgres do compose, com as migrações rodando no container e uma rota de saúde (`GET /api/health`) que confirma que a API responde; (2) uma aplicação web Next.js (App Router, React 19) exibindo a página inicial padrão, com o arquivo de lock de dependências versionado; (3) arquivos gerados nos volumes montados com o dono do usuário do host, sem erros de permissão em logs, cache ou dependências. Critério de aceite: com a stack no ar, `http://localhost:8002/api/health` responde pela API e `http://localhost:3002` exibe a página inicial do Next.js. Não inclui integração com IA, endpoints de negócio, telas de análise, testes automatizados nem configuração de produção, tratados em itens seguintes."

## Clarifications

### Session 2026-10-27

- Q: As migrações do banco devem rodar automaticamente quando a API inicia, ou o desenvolvedor as executa manualmente? → A: Manualmente, por `php artisan migrate` no container; a API não as roda sozinha.
- Q: A rota `/api/health` deve confirmar só que a API está de pé, ou também a conexão com o banco? → A: Só a API; a rota não consulta o banco (a conexão é validada pelas migrações).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - API responde dentro do Docker (Priority: P1)

O desenvolvedor, em uma máquina sem PHP nem Postgres instalados, sobe a stack de desenvolvimento e consegue confirmar que a API está de pé, conectada ao banco, consultando a rota de saúde. As migrações iniciais rodam no container sem erro.

**Why this priority**: a API é a base de todo o fluxo ponta a ponta (entrada na web, chamada à API, resposta do modelo de IA). Sem uma API viva e ligada ao banco, nenhum item seguinte do backlog pode começar.

**Independent Test**: com o Docker disponível, subir a stack, acessar `http://localhost:8002/api/health` e rodar as migrações no container da API. Entrega por si só uma API verificável, mesmo sem a web.

**Acceptance Scenarios**:

1. **Given** a stack de desenvolvimento no ar, **When** o desenvolvedor faz uma requisição `GET` a `http://localhost:8002/api/health`, **Then** recebe uma resposta de sucesso que indica que a API está funcionando.
2. **Given** a stack no ar e o banco saudável, **When** o desenvolvedor executa manualmente as migrações no container da API, **Then** elas terminam sem erro, provando que a API alcança o banco do compose.
3. **Given** uma máquina sem PHP, Node ou Postgres instalados, **When** o desenvolvedor sobe a stack pela primeira vez, **Then** a API inicia sem que ele precise instalar nada no host além do Docker.

---

### User Story 2 - Web exibe a página inicial (Priority: P2)

O desenvolvedor abre `http://localhost:3002` no navegador e vê a página inicial padrão da aplicação web, servida pelo container.

**Why this priority**: fecha o segundo lado do ciclo ponta a ponta e valida que a stack completa sobe junta. Depende só da stack, não da API, mas tem menos valor sozinha que a API, por isso vem depois.

**Independent Test**: subir a stack e abrir `http://localhost:3002`. Entrega por si só uma aplicação web visível e com dependências reprodutíveis.

**Acceptance Scenarios**:

1. **Given** a stack no ar, **When** o desenvolvedor abre `http://localhost:3002` no navegador, **Then** vê a página inicial padrão da aplicação web, sem erro.
2. **Given** um clone novo do repositório, **When** a stack sobe pela primeira vez, **Then** as dependências da web são instaladas exatamente nas versões registradas no arquivo de lock versionado.

---

### User Story 3 - Arquivos gerados pertencem ao usuário do host (Priority: P3)

O desenvolvedor edita e apaga, no host, os arquivos criados pelos containers (código, logs, cache, dependências) sem precisar de `sudo` nem esbarrar em erros de permissão.

**Why this priority**: é uma qualidade de vida que evita travamentos, mas só pode ser verificada depois que os dois projetos existem e rodam. Sem ela a stack funciona, porém atrapalha o dia a dia.

**Independent Test**: depois de a stack subir e a API receber requisições, conferir que os arquivos em `apps/api` e `apps/web` pertencem ao usuário do host, que a API grava logs e cache sem erro e que o desenvolvedor consegue editar e apagar esses arquivos sem privilégio elevado.

**Acceptance Scenarios**:

1. **Given** a stack no ar e a API tendo atendido requisições, **When** o desenvolvedor lista os arquivos em `apps/api` e `apps/web`, **Then** todos pertencem ao seu usuário no host.
2. **Given** a API em execução, **When** ela grava logs e cache, **Then** não ocorre erro de permissão.
3. **Given** arquivos gerados pelos containers, **When** o desenvolvedor os edita ou apaga no host, **Then** consegue fazê-lo sem privilégio elevado.

---

### Edge Cases

- Banco ainda não saudável quando a API inicia: a stack deve esperar o banco ficar pronto antes de a API aceitar tráfego, em vez de falhar na primeira requisição.
- Portas padrão (8002, 3002, 5436) já ocupadas no host: o desenvolvedor consegue trocá-las pelo `.env` da raiz, e a rota de saúde e a página inicial passam a responder nas novas portas.
- Stack reiniciada ou recriada: o projeto da API e o da web não são recriados nem sobrescritos, e as dependências já instaladas continuam válidas.
- Pastas `apps/api` e `apps/web` com arquivos de root deixados por execuções anteriores: não devem impedir a criação dos projetos nem a edição dos arquivos pelo desenvolvedor.
- Variáveis de ambiente de exemplo: devem ser suficientes para a API conectar ao banco do compose sem o desenvolvedor editar nada, e não podem conter segredos reais.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O repositório MUST conter um projeto de API em `apps/api` e um projeto web em `apps/web`, de modo que os containers do Compose de desenvolvimento tenham o que executar.
- **FR-002**: Ambos os projetos MUST poder ser criados e executados usando só o Docker, sem exigir PHP, Node ou Postgres instalados no host.
- **FR-003**: A API MUST expor rotas de API (prefixo `/api`) habilitadas.
- **FR-004**: A API MUST responder `GET /api/health` com um status de sucesso que confirme que a aplicação está no ar, sem consultar o banco, acessível em `http://localhost:8002/api/health` na configuração padrão.
- **FR-005**: A API MUST conectar-se ao banco do Compose usando valores de exemplo versionados em `apps/api/.env.example`, coerentes com as credenciais do `.env` da raiz.
- **FR-006**: As migrações do banco MUST executar sem erro dentro do container da API quando o desenvolvedor as dispara manualmente; a API MUST NOT rodá-las sozinha ao iniciar.
- **FR-007**: A aplicação web MUST exibir a página inicial padrão em `http://localhost:3002` na configuração padrão.
- **FR-008**: O arquivo de lock de dependências da web MUST estar versionado, para que instalações sejam reprodutíveis.
- **FR-009**: Arquivos criados pelos containers nos volumes montados (código, logs, cache, dependências) MUST pertencer ao usuário do host, sem erros de permissão e sem exigir privilégio elevado para editar ou apagar.
- **FR-010**: Subir a stack de desenvolvimento completa (banco, API e web) com um único comando `docker compose` MUST funcionar sem erro, validando o último item pendente da fundação do repositório.
- **FR-011**: Nenhum segredo MUST ser versionado: arquivos `.env` permanecem ignorados pelo git e apenas os `.env.example`, sem valores reais, entram no repositório.
- **FR-012**: Esta feature MUST NOT incluir integração com IA, endpoints de negócio, telas de análise, testes automatizados nem configuração de produção.

### Key Entities

Não se aplica: a feature não introduz entidades de domínio nem dados de negócio.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um desenvolvedor com apenas o Docker instalado, partindo de um clone novo, consegue ter a stack completa no ar com um único comando e sem passos manuais além de copiar os arquivos de ambiente de exemplo (as migrações do banco são um passo manual separado e não fazem parte da subida da stack).
- **SC-002**: `http://localhost:8002/api/health` responde com sucesso em 100% das tentativas depois que a stack termina de subir.
- **SC-003**: `http://localhost:3002` exibe a página inicial padrão da aplicação web em 100% das tentativas depois que a stack termina de subir.
- **SC-004**: As migrações rodam no container da API com 0 erros.
- **SC-005**: 0 erros de permissão ao gravar logs e cache e ao editar ou apagar, no host, qualquer arquivo gerado pelos containers, sem uso de `sudo`.
- **SC-006**: Uma segunda instalação das dependências da web, a partir do arquivo de lock, resulta nas mesmas versões da primeira.

## Assumptions

- O desenvolvedor tem Docker e Docker Compose instalados e uma cópia do `.env` da raiz, criada a partir do `.env.example`.
- A pilha tecnológica é a definida na constituição do projeto (Laravel 13 e Next.js com App Router e React 19); a escolha de versões exatas e dos comandos de criação fica para o plano.
- A estrutura de Docker do item 1 do backlog (`docker-compose.dev.yaml`, `Dockerfile` e scripts de entrada de `apps/api` e `apps/web`) já existe e pode ser ajustada se necessário para esta feature.
- "Página inicial padrão" significa a página gerada pelo próprio projeto novo, sem conteúdo ou design customizado.
- O formato exato do corpo da resposta de `/api/health` é detalhe de plano; basta indicar sucesso e que a API está no ar. A rota não verifica o banco; a conexão com ele é validada pelas migrações.
- O banco é apenas conectado e migrado nesta feature; nenhuma tabela de negócio é criada, apenas as migrações iniciais que acompanham o projeto novo.
- As pastas `apps/api` e `apps/web` podem ser tratadas como vazias de projeto (só há configuração de Docker); o `package-lock.json` provisório do commit anterior foi removido.
- Portas padrão (API 8002, web 3002, banco 5436) são as da constituição e podem ser trocadas pelo `.env` da raiz.
- Fora de escopo, tratado em itens seguintes: integração com o Gemini, endpoint `POST /api/processar-dados`, tela de análise, testes automatizados e deploy em produção.
