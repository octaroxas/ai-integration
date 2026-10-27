---

description: "Tarefas da feature: Tela de análise de dados"
---

# Tasks: Tela de análise de dados

**Input**: Documentos de design em `/specs/004-tela-de-analise/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/tela-de-analise.md, quickstart.md

**Tests**: não solicitados (os testes automatizados do fluxo da tela são o item 6 do backlog). A verificação é `npm run lint`, `npx tsc --noEmit` e os cenários manuais do [quickstart.md](quickstart.md).

**Organization**: tarefas agrupadas por user story. Todos os comandos rodam da raiz do repositório com o Compose de desenvolvimento, abreviado como `DC` = `docker compose -f docker-compose.dev.yaml`. Nada é instalado no host; nenhuma dependência nova é adicionada. Antes de rodar, exporte `UID` e `USER` no shell (`export UID USER`).

**Next.js**: esta versão (16.4.3) tem mudanças em relação ao que se conhece. Em dúvida sobre uma API, consultar a documentação dentro do container: `DC exec web ls node_modules/next/dist/docs/01-app`.

**Pré-requisito externo**: `GEMINI_API_KEY` válida em `apps/api/.env` (item 3) para os cenários que usam o Gemini real; eles consomem a cota gratuita. Nunca imprima, copie nem cole a chave.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta)
- **[Story]**: história a que a tarefa pertence (US1 a US4)

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: confirmar o ponto de partida e preparar a configuração da URL da API

- [X] T001 Confirmar que a stack está no ar (`DC ps` mostra `web`, `api` e `db`; `curl -s http://localhost:8002/api/health` responde) e que `POST /api/processar-dados` existe (`DC exec api php artisan route:list --path=api`). Confirmar que o serviço `web` em `docker-compose.dev.yaml` já define `NEXT_PUBLIC_API_URL` (`http://localhost:${APP_PORT:-8002}`); não alterar o Compose.
- [X] T002 [P] Criar `apps/web/.env.example` com um comentário em português e a linha `NEXT_PUBLIC_API_URL=http://localhost:8002` (URL pública da API, sem segredos; o Compose de dev já injeta o valor). Em `apps/web/.gitignore`, logo abaixo da linha `.env*`, acrescentar `!.env.example`, senão o arquivo novo seria ignorado. Conferir com `git status --short apps/web` que `.env.example` aparece como novo.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: ajustes globais da página que todas as histórias usam

- [X] T003 Em `apps/web/app/layout.tsx`, trocar `lang="en"` por `lang="pt-BR"` e o `metadata` por `title: "Análise de dados com IA"` e `description: "Cole um texto e receba um resumo, pontos principais e planos de ação gerados por IA."`. Manter as fontes Geist como estão.

**Checkpoint**: a página já carrega com idioma e título corretos; as histórias podem começar.

---

## Phase 3: User Story 1 - Colar um texto e ver a análise na tela (Priority: P1) 🎯 MVP

**Goal**: colar um texto, clicar em "Analisar Dados" e ver resumo, pontos principais e planos de ação na tela.

**Independent Test**: com a stack e uma chave válidas, abrir `http://localhost:3002`, colar "Vendas caíram 12% em outubro. O estoque do produto A está parado há 60 dias.", clicar em "Analisar Dados" e ver os três blocos (cenários 1 e 3 do quickstart).

### Implementation for User Story 1

- [X] T005 [US1] Criar `apps/web/app/lib/api.ts` com: o tipo `Analise` (`resumo: string`, `pontos_principais: string[]`, `planos_de_acao: string[]`), a classe `ErroDeAnalise extends Error` e `export async function analisarTexto(conteudo: string): Promise<Analise>`. A função lê `process.env.NEXT_PUBLIC_API_URL` de forma **literal** (leitura dinâmica não é embutida no bundle); se estiver vazia, lança `ErroDeAnalise("A URL da API não está configurada.")`. Faz `fetch` `POST` em `${url}/api/processar-dados` com `Content-Type: application/json`, `Accept: application/json` e corpo `JSON.stringify({ conteudo })`; em resposta 200, lê o JSON, valida o formato (`sucesso === true`; `resumo` string não vazia; `pontos_principais` e `planos_de_acao` arrays **não vazios** de strings, pois o contrato garante os três campos sempre preenchidos) e devolve `analise`; qualquer outro caso lança `ErroDeAnalise("A resposta do servidor veio em um formato inesperado.")`. O tratamento de erros HTTP, rede e timeout vem na US3.
- [X] T006 [US1] Criar `apps/web/app/analisador.tsx` com `'use client'` no topo e o componente `Analisador`: `<form>` com `<label htmlFor>` "Texto para analisar" ligado a um `<textarea>`, botão `type="submit"` "Analisar Dados" e, abaixo, a região de resultado. Estado com `useState`: `texto`, `analise` (`Analise | null`). No `onSubmit` (`preventDefault`), chamar `analisarTexto(texto)` e guardar o resultado. A região de resultado, quando houver análise, mostra três blocos com títulos "Resumo" (parágrafo), "Pontos principais" (`<ul>`) e "Planos de ação" (`<ul>`). Exibir tudo como texto puro (JSX normal; **nunca** `dangerouslySetInnerHTML`) e aplicar a classe com `white-space: pre-wrap` para preservar quebras de linha (FR-005, FR-006). Ao iniciar um envio, limpar `analise` (FR-010). Textos da interface em português conforme `contracts/tela-de-analise.md`.
- [X] T007 [US1] Reescrever `apps/web/app/page.tsx` como server component simples: `<main className={styles.main}>` com `<h1>Análise de dados com IA</h1>`, um parágrafo curto explicando o uso e `<Analisador />`; remover o boilerplate do template (imagens `next.svg`/`vercel.svg` e links). Reescrever `apps/web/app/page.module.css` com os estilos mínimos da tela (coluna centralizada de até ~720px, textarea de largura total e ~10 linhas, botão, blocos de resultado, classe `.textoPreservado { white-space: pre-wrap; overflow-wrap: anywhere; }`, legível em tema claro e escuro e em telas estreitas). Sem biblioteca de UI.
- [X] T008 [US1] Verificar: `DC exec web npm run lint` e `DC exec web npx tsc --noEmit` sem erros; abrir `http://localhost:3002`, executar os cenários 1 e 3 do quickstart com o Gemini real e conferir resumo, pontos e planos na tela e que a análise muda com o texto. Se o modelo estiver sem cota ou indisponível, ver `specs/002-gemini-ai-integration/research.md`.

**Checkpoint**: o ciclo completo tela → API → Gemini → tela funciona no caminho feliz.

---

## Phase 4: User Story 2 - Acompanhar o processamento sem enviar duas vezes (Priority: P2)

**Goal**: durante o envio, botão desabilitado com "Processando com IA..." e nenhum segundo envio possível.

**Independent Test**: cenário 2 do quickstart: cliques repetidos durante o carregamento geram uma única requisição; ao fim, o botão volta a "Analisar Dados".

### Implementation for User Story 2

- [X] T009 [US2] Em `apps/web/app/analisador.tsx`, acrescentar o estado `carregando` (boolean) e um `useRef<boolean>` de bloqueio. No `onSubmit`: se o ref já estiver `true`, retornar sem fazer nada; senão, marcar o ref `true` e `carregando` `true`, e desfazer ambos num `finally` ao fim da chamada (sucesso ou falha). Renderizar o botão com `disabled={carregando}`, `aria-busy={carregando}` e texto "Processando com IA..." enquanto carregando, "Analisar Dados" caso contrário; desabilitar também o `textarea` durante o envio. Adicionar estilo visual de botão desabilitado em `apps/web/app/page.module.css` (cursor e opacidade).
- [X] T010 [US2] Verificar: lint e `tsc` sem erros; cenário 2 do quickstart (aba Rede do navegador mostra uma única requisição `processar-dados` mesmo com cliques/Enter repetidos; o botão volta ao normal ao terminar).

**Checkpoint**: sem envio duplicado e com feedback imediato de carregamento.

---

## Phase 5: User Story 3 - Ver uma mensagem clara quando algo falha (Priority: P3)

**Goal**: toda falha (erro da API, API parada, timeout, formato inesperado) vira uma mensagem visível em português.

**Independent Test**: cenários 7, 8 e 9 do quickstart: API parada mostra a mensagem de servidor inacessível; chave inválida mostra a mensagem da API; religada a API, o envio seguinte funciona e o erro some.

### Implementation for User Story 3

- [X] T011 [US3] Em `apps/web/app/lib/api.ts`, completar o tratamento conforme a tabela "Tradução de resultados" de `contracts/tela-de-analise.md`: envolver o `fetch` em `try/catch` e lançar `ErroDeAnalise("Não foi possível falar com o servidor. Verifique se a API está no ar e tente novamente.")` em falha de rede; usar `signal: AbortSignal.timeout(60_000)` e, quando o erro for `TimeoutError`, lançar `ErroDeAnalise("A análise demorou demais. Tente novamente.")`; para resposta com `response.ok === false`, tentar ler o JSON e lançar `ErroDeAnalise` com `erros.conteudo[0]` (quando existir e for texto) ou com `mensagem` (quando for texto não vazio); se o corpo não for JSON ou não trouxer mensagem, lançar `ErroDeAnalise("A resposta do servidor veio em um formato inesperado.")`. Nunca incluir status HTTP, rastros nem corpo bruto na mensagem.
- [X] T012 [US3] Em `apps/web/app/analisador.tsx`, acrescentar o estado `erro` (`string | null`), limpo no início de cada tentativa de envio (junto com `analise`, FR-010). No `catch`, guardar `error.message` se for `ErroDeAnalise`, senão a mensagem "Ocorreu um erro inesperado. Tente novamente.". Renderizar o erro numa caixa de destaque com `role="alert"` acima do resultado, e estilizá-la em `apps/web/app/page.module.css` (borda e cor de erro, legível nos dois temas). O botão deve voltar a "Analisar Dados" após o erro (já garantido pelo `finally` da T009).
- [X] T013 [US3] Verificar: lint e `tsc` sem erros; cenários 7, 8 e 9 do quickstart. Restaurar a `GEMINI_API_KEY` correta e religar a API ao final.

**Checkpoint**: nenhuma falha deixa a tela sem resposta.

---

## Phase 6: User Story 4 - Não enviar texto inválido (Priority: P4)

**Goal**: texto vazio ou acima de 10.000 caracteres é recusado na tela, sem requisição.

**Independent Test**: cenários 4, 5 e 6 do quickstart: avisos corretos, nenhuma requisição na aba Rede, e 10.000 caracteres exatos são enviados.

### Implementation for User Story 4

- [X] T014 [US4] Em `apps/web/app/lib/api.ts`, exportar `LIMITE_CARACTERES = 10000` e `validarTexto(texto: string): string | null`, que devolve "Informe um texto para analisar." quando `texto.trim()` é vazio, "O texto deve ter no máximo 10000 caracteres." quando `[...texto].length > LIMITE_CARACTERES` (contagem por pontos de código, igual à da API) e `null` caso contrário. O conteúdo enviado continua sendo o texto como digitado, sem `trim`.
- [X] T015 [US4] Em `apps/web/app/analisador.tsx`, chamar `validarTexto(texto)` no `onSubmit` logo após limpar `analise` e `erro`: se devolver mensagem, guardá-la em `erro` e retornar **antes** de marcar o carregando e de chamar a API. Limpar `erro` quando o usuário alterar o texto (`onChange`). Exibir ao lado do campo o contador `{[...texto].length} / 10.000` (formatado em pt-BR), ligado ao `textarea` por `aria-describedby`, e destacá-lo (cor de erro) quando passar do limite. Não usar `maxLength` no `textarea`.
- [X] T016 [US4] Verificar: lint e `tsc` sem erros; cenários 4, 5 e 6 do quickstart (para gerar os textos: `python3 -c "print('a'*10000)"` e `python3 -c "print('a'*10001)"`, colando o resultado no campo).

**Checkpoint**: a tela poupa a ida à API para entradas que ela recusaria.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T017 [P] Atualizar `README.md` da raiz com uma seção curta "Usando a tela de análise": abrir `http://localhost:3002`, colar o texto e clicar em "Analisar Dados"; mencionar `NEXT_PUBLIC_API_URL` (definida no Compose de dev, documentada em `apps/web/.env.example`) e que a variável é pública e não deve conter segredos. Corrigir também as passagens desatualizadas: o aviso de status no topo ("a tela de análise ainda não existe"), a linha que diz que a web "exibe a página inicial do Next.js" e o passo futuro "Criar a página em `apps/web` e conectá-la à API" na lista de próximos passos.
- [X] T018 [P] Em `docs/ideias.md`, marcar os seis itens do item 5 como `[x] ✅` (anotando, no item de exibição, que Markdown ficou fora do escopo porque a API devolve campos estruturados e, no de carregamento, o timeout de 60 s do cliente), trocar 🔸 por 🟢 no título da seção 5 e atualizar qualquer referência de status no topo do documento, se houver.
- [X] T019 Passada final: `DC exec web npm run lint` e `DC exec web npx tsc --noEmit` sem erros (não rodar `npm run build` no container de dev: ele usa o mesmo volume `.next` do servidor de desenvolvimento); conferir a acessibilidade básica (FR-013): Tab chega ao campo e ao botão, Enter/Espaço no botão enviam, o carregamento e o erro aparecem de forma perceptível; executar todos os cenários 1 a 10 do quickstart, incluindo o 10 (`grep -rn "GEMINI" apps/web --include=*.ts --include=*.tsx --include=*.example` não encontra nada e a variável pública só contém a URL). Confirmar com `git status --short` que só mudaram arquivos de `apps/web`, `specs/004-tela-de-analise`, `README.md` e `docs/ideias.md`.

---

## Dependencies & Execution Order

- **Setup (T001-T002)** → **Foundational (T003-T004)** → histórias → **Polish (T017-T019)**.
- **US1 (T005-T008)** é o MVP e vem primeiro: as demais estendem os mesmos dois arquivos (`lib/api.ts` e `analisador.tsx`).
- **US2, US3, US4** dependem só da US1 e entre si não têm dependência lógica, mas editam os mesmos arquivos; executar em sequência na ordem de prioridade (US2 → US3 → US4) para evitar conflitos.
- T012 depende de T009 (o `finally` que reabilita o botão); T015 depende de T012 (estado `erro`) e de T014.

## Parallel Opportunities

- T002 pode rodar em paralelo com T001.
- T017 e T018 (documentação) podem rodar em paralelo entre si e com as tarefas de verificação.
- Dentro das histórias, os arquivos são compartilhados, então não há paralelismo seguro.

## Implementation Strategy

1. **MVP**: Setup + Foundational + US1. Já fecha o ciclo ponta a ponta no caminho feliz (princípio II).
2. Acrescentar US2 (carregamento), US3 (erros) e US4 (validação), verificando cada checkpoint.
3. Polish: documentação, backlog e verificação final completa.
