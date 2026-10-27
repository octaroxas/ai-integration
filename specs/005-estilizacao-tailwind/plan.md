# Implementation Plan: Estilização da web com Tailwind CSS

**Branch**: `feat/enviroment` (branch atual; o script reporta `005-estilizacao-tailwind` a partir de `.specify/feature.json`) | **Date**: 2026-10-27 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-estilizacao-tailwind/spec.md`

## Summary

Instalar o Tailwind CSS 4 (versão estável mais recente, 4.3.3) em `apps/web` pelo caminho oficial do Next.js: pacotes `tailwindcss` e `@tailwindcss/postcss` como dependências de desenvolvimento, `postcss.config.mjs` com o plugin e `@import "tailwindcss"` em `app/globals.css`. Reescrever o CSS global só com o tema (cores de fundo e texto, tema claro/escuro, fonte) e migrar a tela de análise de `page.module.css` para classes utilitárias nos componentes `page.tsx` e `analisador.tsx`, apagando o CSS Module. Comportamento, textos e atributos de acessibilidade da spec 004 não mudam. A instalação é feita dentro do container (Alpine/musl), para que o `package-lock.json` seja gerado no ambiente que vai usá-lo.

## Technical Context

**Language/Version**: TypeScript 5, React 19.3, Next.js 16.4.3 (App Router), Node 24 (container Alpine)

**Primary Dependencies**: adiciona `tailwindcss@^4.3.3` e `@tailwindcss/postcss@^4.3.3` (devDependencies); o `postcss` entra como dependência transitiva. Sem plugins do Tailwind, sem biblioteca de componentes

**Storage**: N/A

**Testing**: `npm run lint`, `npx tsc --noEmit` e o roteiro de navegador (puppeteer-core no scratchpad, fora do projeto) com os cenários da spec 004, mais conferências de tema, largura e foco descritas no quickstart. Testes automatizados permanentes continuam no item 6

**Target Platform**: navegadores atuais (Tailwind 4 usa recursos recentes de CSS); Docker Compose de desenvolvimento

**Project Type**: web application (monorepo; só `apps/web` muda)

**Performance Goals**: edição de classe refletida no navegador em até 5 s (HMR do Next com o plugin do PostCSS)

**Constraints**: sem Node no host; `package-lock.json` consistente e instalável com `npm ci` no Alpine; nenhuma alteração em API, Compose ou lógica de `app/lib/api.ts`; classes escritas por inteiro (sem montar nomes dinamicamente)

**Scale/Scope**: 2 componentes + 1 CSS global + 1 config de PostCSS; ~120 linhas de CSS Module removidas

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Avaliação |
|---|---|
| I. Simplicidade | Passa com justificativa registrada. Tailwind é uma dependência nova, mas foi pedida explicitamente pelo dono do projeto (spec, seção "Justificativa"). Mantido o mínimo: sem plugins, sem componentes reutilizáveis novos, sem `tailwind.config`, sem tema além de cores e fonte. |
| II. Fluxo ponta a ponta | Passa. O ciclo continua funcionando; o roteiro de navegador da spec 004 é reexecutado inteiro. |
| III. Chave só no backend | Passa. Nada muda em variáveis de ambiente. |
| IV. IA isolada | Passa. Não toca na API nem em `app/lib/api.ts`. |
| V. Testes proporcionais | Passa. O fluxo principal é reverificado; testes permanentes seguem no item 6. |
| Stack e restrições | Passa. Tudo no Docker; nenhuma exigência no host; textos em pt-BR inalterados. A seção "Stack" da constituição não proíbe Tailwind; não requer emenda. |

Nenhuma violação; Complexity Tracking não é necessária. A dependência nova está justificada pela spec.

**Re-check pós-design**: sem mudanças; o design não acrescentou arquivos além do mínimo.

## Project Structure

### Documentation (this feature)

```text
specs/005-estilizacao-tailwind/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── estilo.md            # contrato visual: tema, paleta, estados e contraste
├── checklists/
│   └── requirements.md
└── tasks.md                 # gerado por /speckit-tasks
```

### Source Code (repository root)

```text
apps/web/
├── package.json             # + tailwindcss, @tailwindcss/postcss (devDependencies)
├── package-lock.json        # regenerado no container
├── postcss.config.mjs       # novo: plugin @tailwindcss/postcss
└── app/
    ├── globals.css          # reescrito: @import "tailwindcss", tema e fonte
    ├── layout.tsx           # classes do <body> (fonte e cores)
    ├── page.tsx             # classes utilitárias
    ├── analisador.tsx       # classes utilitárias; sem mais `styles.*`
    └── page.module.css      # REMOVIDO
README.md                    # raiz: nota sobre Tailwind
docs/ideias.md               # registrar a adoção
```

**Structure Decision**: aplicação web existente em `apps/web`; sem novos diretórios. Sem `tailwind.config.*`: na versão 4 a configuração fica no próprio CSS, e não há nada a configurar além do tema.

## Decisões de design

- **Instalação no container**: `docker compose exec web npm install -D tailwindcss @tailwindcss/postcss`. O `node_modules` é um volume nomeado e `package.json`/`package-lock.json` são bind mounts, então o container escreve os dois arquivos no host. Isso gera o lock com os binários nativos corretos para Alpine (musl). Depois, `npm ci` limpo valida o lock.
- **Tema**: variáveis `--background` e `--foreground` em `:root` com valores para o tema escuro sob `@media (prefers-color-scheme: dark)`, mapeadas para utilitários com `@theme inline` (`bg-background`, `text-foreground`, `font-sans`). O `dark:` do Tailwind 4 já segue `prefers-color-scheme`, então os componentes usam `dark:` para as demais cores.
- **Fonte**: `layout.tsx` já injeta `--font-geist-sans`; `@theme inline { --font-sans: var(--font-geist-sans), ... }` e `font-sans` no `<body>`.
- **Reset**: o preflight do Tailwind substitui o reset manual (`* { padding:0; margin:0 }`) do template, então este é removido.
- **Cores e contraste** (ver contrato): neutros zinc para texto secundário, azul para ação, vermelho para erro, todos com contraste ≥ 4,5:1 nos dois temas.
- **Foco**: `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600` (dark: `blue-400`) em campo e botão.
- **Quebra de texto**: `whitespace-pre-wrap` e `wrap-anywhere` no resultado, equivalentes ao `.textoPreservado` atual. Se o utilitário `wrap-anywhere` não existir na versão instalada, usar `[overflow-wrap:anywhere]`.
- **Sem `@apply` nem classes de componente**: cada elemento leva suas classes diretamente (princípio I). A repetição entre os dois `<li>` do resultado é pequena e aceitável.
- **Rollback de cache**: `.next` fica num volume nomeado; após a migração, reiniciar o `web` e, se aparecer estilo antigo, recriar o volume (quickstart).
