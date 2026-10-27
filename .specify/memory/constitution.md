<!--
Sync Impact Report
- Version change: (template não preenchido) → 1.0.0
- Princípios adicionados: I. Simplicidade Acima de Tudo; II. Fluxo Ponta a Ponta Primeiro;
  III. Chave de API Só no Backend; IV. Integração com IA Isolada e Substituível;
  V. Testes Proporcionais, Sem Chamadas Reais à IA
- Seções adicionadas: Stack e Restrições; Fluxo de Desenvolvimento
- Seções removidas: nenhuma
- Templates dependentes: nenhum alterado (leem a constituição em tempo de execução)
- TODOs adiados: nenhum
-->
# ai-project-integration-test Constitution

## Core Principles

### I. Simplicidade Acima de Tudo
Este é um projeto de estudos: o objetivo é aprender a integrar modelos de IA, não construir um
produto. Cada funcionalidade MUST ser a menor implementação que cumpre o requisito. Autenticação,
histórico, filas, cache, múltiplos usuários e qualquer abstração sem uso imediato MUST NOT ser
adicionados sem uma necessidade registrada na spec. Complexidade extra MUST ser justificada na
seção de complexidade do plano.

**Racional**: código mínimo deixa visível o que importa (a comunicação com o modelo) e facilita
estudar e reescrever.

### II. Fluxo Ponta a Ponta Primeiro
O núcleo do projeto é o ciclo completo: entrada do usuário na web, chamada à API, comunicação com
o modelo de IA, processamento simples da resposta e exibição na tela. Toda feature MUST entregar
ou preservar esse ciclo funcionando. Uma feature MUST ser entregue de forma fatiada, de modo que
o ciclo completo rode a cada etapa, em vez de construir camadas isoladas para juntá-las no fim.

**Racional**: validar a integração real cedo evita descobrir problemas de comunicação só no final.

### III. Chave de API Só no Backend
A chave do provedor de IA (`GEMINI_API_KEY` e equivalentes) MUST existir apenas no `.env` da API
(`apps/api/.env`) e MUST NOT ser versionada, exposta ao navegador, impressa em logs ou incluída em
respostas, specs, planos ou exemplos. O frontend MUST falar apenas com a API do próprio projeto,
nunca diretamente com o provedor de IA. Variáveis com prefixo `NEXT_PUBLIC_` MUST NOT conter
segredos. Arquivos `.env` MUST permanecer no `.gitignore`; só os `.env.example` são versionados,
sem valores reais.

**Racional**: qualquer valor que chega ao navegador é público; a chave tem cota e pertence ao dono.

### IV. Integração com IA Isolada e Substituível
O Gemini é o provedor primário, mas a integração MUST ficar isolada em um único ponto da API
(um agente ou serviço), sem espalhar chamadas ao provedor pelas rotas ou controllers. O modelo
e o provedor MUST ser configuráveis por variável de ambiente, sem nomes de modelo fixos no código.
Trocar ou adicionar um provedor MUST exigir mudanças apenas nesse ponto e na configuração. Falhas
do provedor (cota, timeout, chave inválida, resposta vazia) MUST virar uma resposta de erro clara
da API, sem derrubar a aplicação nem expor detalhes internos ao usuário.

**Racional**: modelos e SDKs mudam rápido; manter o acoplamento pequeno torna a troca barata e
permite comparar provedores.

### V. Testes Proporcionais, Sem Chamadas Reais à IA
Testes automatizados MUST NOT chamar o provedor de IA real (custo, cota e não determinismo); o
cliente de IA MUST ser substituído por um fake ou mock. A API MUST ter testes para validação de
entrada, caminho feliz e tratamento de erro do provedor. O frontend MUST ser verificado ao menos
pelo fluxo principal (enviar, carregar, exibir resultado ou erro). Não há meta de cobertura; o
critério é cobrir o comportamento descrito nas specs.

**Racional**: testes rápidos e determinísticos protegem o fluxo sem gastar a cota gratuita.

## Stack e Restrições

- **API**: Laravel 13 com o AI SDK nativo, em `apps/api`.
- **Web**: Next.js (App Router, React 19), em `apps/web`.
- **Banco**: PostgreSQL 16, usado só se uma feature realmente precisar de persistência.
- **IA**: Google Gemini via API Key gratuita do Google AI Studio; modelo definido por configuração.
- **Infraestrutura**: tudo roda em Docker Compose (`docker-compose.dev.yaml`); nenhuma dependência
  de PHP, Node ou Postgres MUST ser exigida na máquina host.
- **Monorepo**: aplicações dentro de `apps/`; Compose, `.env.example` e documentação na raiz.
- **Portas**: configuráveis pelo `.env` da raiz, com defaults que não colidam com outros projetos
  na mesma máquina (API 8002, web 3002, banco 5436).
- **Idioma**: documentação, specs e mensagens ao usuário em português do Brasil; código e
  identificadores seguem as convenções do Laravel e do Next.js.

## Fluxo de Desenvolvimento

- O trabalho segue o Spec Kit: `/speckit-specify` → `/speckit-plan` → `/speckit-tasks` →
  `/speckit-implement`. Mudanças de comportamento MUST começar por uma spec, não pelo código.
- Todo plano MUST passar por uma verificação explícita contra esta constituição antes de
  implementar, e os desvios MUST ser registrados como complexidade justificada.
- Mudanças nos arquivos de Docker MUST ser validadas com `docker compose config` e, quando
  afetarem imagens, com `docker compose build`.
- Commits são feitos pelo dono do repositório; nenhuma automação MUST commitar ou fazer push sem
  pedido explícito.

## Governance

Esta constituição prevalece sobre outras práticas do projeto. Emendas MUST ser feitas via
`/speckit-constitution`, com o Sync Impact Report atualizado e o motivo da mudança registrado.

Versionamento semântico: MAJOR para remoção ou redefinição incompatível de princípios; MINOR para
novo princípio, seção ou orientação materialmente ampliada; PATCH para esclarecimentos e ajustes
de redação.

Conformidade: specs, planos e implementações MUST ser conferidos contra os princípios acima.
Qualquer desvio MUST ser justificado por escrito no plano; sem justificativa, o desvio é um defeito.

**Version**: 1.0.0 | **Ratified**: 2026-10-27 | **Last Amended**: 2026-10-27
