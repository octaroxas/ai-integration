---

description: "Tarefas da feature: Estilização da web com Tailwind CSS"
---

# Tasks: Estilização da web com Tailwind CSS

**Input**: Documentos de design em `/specs/005-estilizacao-tailwind/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/estilo.md, quickstart.md

**Tests**: não há testes automatizados novos (item 6 do backlog). A verificação reaproveita o roteiro de navegador da spec 004 e acrescenta conferências de estilo, descritas no [quickstart.md](quickstart.md).

**Organization**: tarefas agrupadas por user story. Comandos rodam da raiz do repositório com o Compose de desenvolvimento, abreviado como `DC` = `docker compose -f docker-compose.dev.yaml`. Nada é instalado no host. Antes de rodar, `export UID USER`.

**Scratchpad (fora do projeto)**: `SCRATCH=/tmp/claude-1000/-home-octacilio-Documentos-Projetos-ai-project-integration-test/074478cb-1e9a-45cb-91e1-e07e3170ca71/scratchpad/e2e`. Ali já existem o `node_modules` com `puppeteer-core` e o roteiro `run.mjs` da spec 004 (26 verificações; usa o Chrome do host em `/usr/bin/google-chrome` e consome uma chamada do Gemini). Rodar sempre como `cd $SCRATCH && node run.mjs`, nunca de dentro do projeto.

**Next.js**: esta versão (16.4.3) difere do que se conhece. Em dúvida, consultar `DC exec web ls node_modules/next/dist/docs/01-app` (CSS: `01-getting-started/11-css.md`).

**Restrições da migração**: não alterar `app/lib/api.ts`, o Compose, a API nem textos e atributos de acessibilidade da tela (`role="alert"`, `aria-busy`, `aria-describedby`, `aria-label`, `htmlFor`/`id`). Classes sempre completas (sem concatenar partes de nome), sem `@apply`, sem plugins, sem `tailwind.config.*`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta)
- **[Story]**: história a que a tarefa pertence (US1 a US3)

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: registrar o estado atual como referência e instalar o Tailwind no container

- [X] T001 Confirmar a stack no ar (`DC ps` mostra `web`, `api`, `db`; `curl -s http://localhost:8002/api/health` responde). Registrar a linha de base **antes de qualquer alteração**: `cd $SCRATCH && node run.mjs` deve fechar com `26/26 verificações passaram`; e salvar capturas de tela da tela atual em `$SCRATCH/antes-claro.png`, `antes-escuro.png` e `antes-320.png` (puppeteer: `page.emulateMediaFeatures([{name:'prefers-color-scheme',value:'dark'}])` para o escuro; viewport 320×700 para o estreito; clique no botão com o campo vazio para a captura incluir o bloco de erro). Se a linha de base não passar, parar e avisar.
- [X] T002 Instalar as dependências **dentro do container**, para gerar o lock para Alpine: `DC exec web npm install -D tailwindcss @tailwindcss/postcss --no-audit --no-fund`. Conferir em `apps/web/package.json` que `tailwindcss` e `@tailwindcss/postcss` estão em `devDependencies` na versão 4.x (hoje `^4.3.3`) e que `apps/web/package-lock.json` mudou (`git diff --stat apps/web/package-lock.json`). Conferir no lock a presença do binário para musl: `grep -n 'oxide-linux-x64-musl' apps/web/package-lock.json` deve achar entradas.
- [X] T003 [P] Criar `apps/web/postcss.config.mjs` com exatamente o plugin da documentação do Next: `const config = { plugins: { "@tailwindcss/postcss": {} } }; export default config;`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: CSS global e layout, usados por todas as histórias

- [X] T004 Reescrever `apps/web/app/globals.css` por inteiro, em poucas dezenas de linhas, com: `@import "tailwindcss";`; `:root { --background: #ffffff; --foreground: #171717; }`; `@media (prefers-color-scheme: dark) { :root { --background: #0a0a0a; --foreground: #ededed; } }`; `@theme inline { --color-background: var(--background); --color-foreground: var(--foreground); --font-sans: var(--font-geist-sans), Arial, Helvetica, sans-serif; }`; e `html { color-scheme: light dark; }` para controles nativos acompanharem o tema. Remover todo o resto do template (reset manual, `a`, `html { height }`, `overflow-x: hidden`, `body` flex), conforme a decisão 5 da research.
- [X] T005 Em `apps/web/app/layout.tsx`, trocar `<body>{children}</body>` por `<body className="min-h-screen bg-background font-sans text-foreground antialiased">{children}</body>`. Manter as fontes Geist, o `lang="pt-BR"` e o `metadata` como estão.

**Checkpoint**: o Tailwind compila (`DC logs --tail 30 web` sem erro de PostCSS) e a página abre com o tema de base.

---

## Phase 3: User Story 1 - A tela continua igual, agora estilizada com Tailwind (Priority: P1) 🎯 MVP

**Goal**: toda a estilização da tela por classes utilitárias, sem CSS Modules, sem mudar comportamento nem textos.

**Independent Test**: o roteiro `run.mjs` da spec 004 volta a `26/26`; `find apps/web -name '*.module.css' -not -path '*/node_modules/*'` não lista nada.

### Implementation for User Story 1

- [X] T006 [US1] Em `apps/web/app/page.tsx`, remover o `import styles` e trocar as classes: `<main className="mx-auto w-full max-w-[720px] px-4 pb-16 pt-12">` (o contrato fixa 720 px; `max-w-3xl` seria 768 px); `<h1 className="text-[28px] font-semibold tracking-tight">`; parágrafo de apoio `className="mb-6 mt-2 text-zinc-600 dark:text-zinc-400"`. Manter textos e estrutura.
- [X] T007 [US1] Em `apps/web/app/analisador.tsx`, remover o `import styles` e converter cada `styles.*` em classes de Tailwind conforme `contracts/estilo.md`: `form` → `flex flex-col gap-2`; rótulo → `font-semibold`; `textarea` → `w-full resize-y rounded-lg border border-zinc-300 bg-transparent p-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-60 dark:border-zinc-700 dark:focus-visible:outline-blue-400`; rodapé → `flex items-center justify-between gap-4`; contador normal → `text-sm text-zinc-600 dark:text-zinc-400` e excedido → `text-sm font-semibold text-red-700 dark:text-red-400` (duas strings completas escolhidas por `acimaDoLimite`); botão → `rounded-lg bg-blue-600 px-5 py-2.5 font-semibold text-white hover:enabled:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-60 dark:focus-visible:outline-blue-400`; erro → `mt-4 rounded-lg border border-red-600 bg-red-50 px-4 py-3 text-red-700 dark:border-red-500 dark:bg-red-950 dark:text-red-300`; resultado → `mt-6` com `h2` `mb-2 mt-5 text-lg font-semibold`, `ul` `list-disc pl-6` e `li` com `[&:not(:first-child)]:mt-1.5` (ou `mt-1.5` nos itens a partir do segundo); texto preservado → `whitespace-pre-wrap wrap-anywhere` (se `wrap-anywhere` não existir nesta versão, usar `[overflow-wrap:anywhere]`). Não alterar nenhuma lógica, texto nem atributo de acessibilidade. O `textarea` herda cor e fonte pelo preflight do Tailwind, então não há classe de cor de texto nele.
- [X] T008 [US1] Apagar `apps/web/app/page.module.css` (`git rm` ou `rm`). Conferir `grep -rn "module.css\|styles\." apps/web/app` sem resultados.
- [X] T009 [US1] Verificar: `DC exec web npm run lint` e `DC exec web npx tsc --noEmit` sem erros; `DC logs --tail 40 web` sem erro de compilação; abrir `http://localhost:3002` e conferir que os estilos aparecem; `cd $SCRATCH && node run.mjs` fecha com `26/26 verificações passaram`. Se alguma verificação falhar por estilo (por exemplo `pre-wrap`), corrigir a classe correspondente e repetir.

**Checkpoint**: tela totalmente em Tailwind, comportamento idêntico.

---

## Phase 4: User Story 2 - Tema claro e escuro e telas estreitas continuam legíveis (Priority: P2)

**Goal**: contraste, ausência de rolagem horizontal e foco visível nos dois temas e a partir de 320 px, com números medidos.

**Independent Test**: o roteiro `estilo.mjs` passa em todas as verificações, e as capturas novas são equivalentes ou melhores que as de `antes-*`.

### Implementation for User Story 2

- [X] T010 [US2] Criar `$SCRATCH/estilo.mjs` (fora do projeto), com puppeteer-core e o Chrome do host, que para cada tema (`prefers-color-scheme` `light` e `dark`, via `page.emulateMediaFeatures`) e para larguras 320 e 1440 px: (a) abre a página, deixa o campo vazio e clica no botão para mostrar o erro; (b) mede o contraste lendo `getComputedStyle` de cor e de fundo efetivo (subindo pelos ancestrais até achar fundo não transparente) do título, texto de apoio, rótulo, contador, botão, erro e `textarea`, calculando a razão de luminância relativa (WCAG) e exigindo ≥ 4,5 em todos; (c) exige `document.documentElement.scrollWidth <= window.innerWidth` em cada largura; (d) com `page.keyboard.press('Tab')` até o campo e o botão, exige `outlineStyle !== 'none'` e `outlineWidth` > 0 no elemento focado; (e) com a API mockada por interceptação para demorar, exige no botão em carregamento `disabled`, `opacity` < 1 e `cursor` `not-allowed`; (f) com a página aberta em tema claro, troca para `dark` via `page.emulateMediaFeatures` **sem recarregar** e exige que o fundo e a cor do texto do `body` mudem (a tela acompanha a mudança de tema); (g) salva capturas `depois-claro.png`, `depois-escuro.png` e `depois-320.png`. Imprimir `PASS`/`FAIL` por verificação e a razão de contraste medida de cada par.
- [X] T011 [US2] Executar `cd $SCRATCH && node estilo.mjs`. Para cada `FAIL`, ajustar as classes em `apps/web/app/analisador.tsx` ou `page.tsx` (por exemplo trocar para um tom mais escuro/claro) e repetir até tudo passar. Evitar corrigir com `overflow-x-hidden`: se houver estouro horizontal, corrigir na origem.
- [X] T012 [US2] Abrir as capturas `antes-*.png` e `depois-*.png` com a ferramenta de leitura de imagens e comparar: mesma estrutura, legibilidade equivalente ou melhor, erro em destaque, contador e botão sem sobreposição em 320 px. Registrar qualquer diferença relevante e corrigir se for regressão.
- [X] T013 [US2] Atualizar a tabela "Contraste mínimo" de `specs/005-estilizacao-tailwind/contracts/estilo.md` com as razões **medidas** pelo `estilo.mjs` (as atuais são estimativas) e ajustar a tabela de elementos se alguma cor tiver mudado na T011.

**Checkpoint**: tema, largura e foco verificados com números.

---

## Phase 5: User Story 3 - Subir e desenvolver com Tailwind só no Docker (Priority: P3)

**Goal**: instalação limpa reprodutível pelo `npm ci`, HMR funcionando e cache sem estilos antigos, tudo sem Node no host.

**Independent Test**: com `node_modules` limpo, a web sobe e a tela abre estilizada; editar uma classe reflete em até 5 s.

### Implementation for User Story 3

- [X] T014 [US3] Validar o lock com instalação limpa, como no quickstart: `DC exec web sh -c 'rm -rf node_modules/* node_modules/.lock-hash && npm ci --no-audit --no-fund'` (deve concluir sem erro e instalar o binário `@tailwindcss/oxide-linux-x64-musl`; conferir com `DC exec web ls node_modules/@tailwindcss`), depois `DC restart web` e esperar o servidor responder (`curl -s -o /dev/null -w '%{http_code}' http://localhost:3002` → 200). O entrypoint recalcula o hash do lock e grava o `.lock-hash`.
- [X] T015 [US3] Medir o HMR: com a página aberta no puppeteer (script no `$SCRATCH`), editar em `apps/web/app/page.tsx` a classe `text-zinc-600` do texto de apoio para `text-fuchsia-600`, medir o tempo até o `getComputedStyle` do parágrafo mudar (deve ser ≤ 5 s, SC-005) e **reverter** a edição para `text-zinc-600`; conferir com `git diff apps/web/app/page.tsx` que a reversão deixou o arquivo como na T006.
- [X] T016 [US3] Simular ambiente limpo e cache antigo: `DC down` (sem `-v`), `docker volume ls | grep web_next` para descobrir o nome, remover só o volume do cache `.next` (`docker volume rm <nome>`), `DC up -d` e confirmar que a tela abre estilizada na primeira tentativa (SC-006), com `run.mjs` ainda em `26/26`. Não remover o volume do banco.

**Checkpoint**: instalação reprodutível e desenvolvimento fluido só com Docker.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T017 [P] Atualizar o `README.md` da raiz com uma nota curta: a web usa Tailwind CSS 4 (instalado com `tailwindcss` e `@tailwindcss/postcss`, sem `tailwind.config`); o estilo fica nas classes dos componentes e o CSS global (`apps/web/app/globals.css`) só define o tema; dependências novas devem ser instaladas dentro do container (`docker compose -f docker-compose.dev.yaml exec web npm install ...`) para o `package-lock.json` sair correto para Alpine. Ajustar a tabela de stack se citar a estilização.
- [X] T018 [P] Em `docs/ideias.md`, registrar a adoção do Tailwind sem criar item novo fora da ordem: acrescentar à seção 5 um item `[x] ✅ **Estilização com Tailwind CSS 4** (spec 005), em substituição aos CSS Modules do template` e referenciar `specs/005-estilizacao-tailwind/`. Se o documento de ideias citar CSS Modules em outro ponto, ajustar.
- [X] T019 Passada final: `DC exec web npm run lint` e `npx tsc --noEmit` sem erros; `cd $SCRATCH && node run.mjs` (26/26) e `node estilo.mjs` (tudo PASS); `find apps/web -name '*.module.css' -not -path '*/node_modules/*'` vazio; `grep -rn "tailwind.config\|@apply" apps/web/app apps/web/*.mjs` sem resultados; `grep -rniE 'GEMINI|api[_-]?key' apps/web/app apps/web/.env.example` vazio; `git status --short` mostra só `apps/web` (package.json, lock, postcss.config.mjs, app/*), `specs/005-estilizacao-tailwind`, `README.md` e `docs/ideias.md`; `DC ps` com os três serviços de pé.

---

## Dependencies & Execution Order

- **Setup (T001-T003)** → **Foundational (T004-T005)** → histórias → **Polish (T017-T019)**.
- T001 é a linha de base e **deve** vir antes de T002 em diante (capturas "antes").
- T002 antes de T003/T004 (o plugin precisa estar instalado).
- **US1 (T006-T009)** é o MVP. **US2 (T010-T013)** depende da US1 pronta. **US3 (T014-T016)** depende da instalação (T002) e da US1; pode rodar depois da US2 ou antes, mas T015 edita `page.tsx`, então não deve rodar junto com T011/T012.
- T006 e T007 editam arquivos diferentes, mas ambos dependem do T004; podem ser feitos em sequência sem risco.

## Parallel Opportunities

- T003 em paralelo com a verificação do T002 (arquivo diferente).
- T017 e T018 (documentação) em paralelo entre si e com T019 só depois de tudo verde.
- Fora isso, os arquivos de componentes são compartilhados; executar em sequência.

## Implementation Strategy

1. **MVP**: Setup + Foundational + US1. Já remove os CSS Modules e deixa a tela 100% em Tailwind com comportamento idêntico.
2. US2 transforma "parece igual" em números (contraste, largura, foco).
3. US3 prova a reprodutibilidade no Docker e o fluxo de desenvolvimento.
4. Polish: documentação e passada final.
