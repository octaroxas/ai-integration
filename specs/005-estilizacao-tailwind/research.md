# Pesquisa: Estilização da web com Tailwind CSS

Nenhum `NEEDS CLARIFICATION` ficou aberto no Technical Context.

## 1. Versão e forma de instalação

- **Decisão**: Tailwind CSS 4.x, hoje 4.3.3 (`npm view tailwindcss version` e `npm view @tailwindcss/postcss version` no container), instalado como devDependencies `tailwindcss` e `@tailwindcss/postcss`, com `postcss.config.mjs` e `@import "tailwindcss"` no `app/globals.css`.
- **Rationale**: é o caminho descrito na documentação do próprio Next (`node_modules/next/dist/docs/01-app/01-getting-started/11-css.md`, seção Tailwind CSS). A mesma documentação indica a v3 apenas para quem precisa de mais suporte a navegadores antigos (`02-guides/tailwind-v3-css.md`), o que não é o caso: o pedido é a versão mais recente.
- **Alternativas**: Tailwind v3 (rejeitada, não é a mais recente e exige `tailwind.config.js`); CLI do Tailwind separada do Next (rejeitada, o plugin do PostCSS já integra com o HMR do Next).
- **Consequência**: `postcss` vem como dependência transitiva do plugin; `autoprefixer` não é necessário na v4.

## 2. Instalar no container para obter o lock correto

- **Decisão**: rodar `npm install -D ...` dentro do container `web`, não no host.
- **Rationale**: o Tailwind 4 usa um binário nativo (`@tailwindcss/oxide`) com variantes por plataforma e por libc. O container é Alpine (musl), e o Next já instala `@next/swc-linux-x64-musl` nele. Gerar o lock onde ele será usado evita incompatibilidade; o host não precisa de Node (constituição). `package.json` e `package-lock.json` são bind mounts (`./apps/web:/app`), então saem direto no host.
- **Verificação**: depois da instalação, apagar `node_modules` do volume e rodar `npm ci` no container (o entrypoint faz isso quando o hash do lock muda) e conferir que o `next dev` compila.
- **Alternativas**: instalar no host (rejeitada, exige Node no host).

## 3. Tema claro e escuro

- **Decisão**: manter as variáveis `--background` e `--foreground` em `:root` (com valores do tema escuro em `@media (prefers-color-scheme: dark)`), expostas ao Tailwind por `@theme inline`; demais cores via utilitários com `dark:`.
- **Rationale**: na v4, a variante `dark:` usa `prefers-color-scheme` por padrão, igual ao comportamento atual, e a spec deixa o botão manual fora do escopo. `@theme inline` referencia as variáveis sem duplicar valores e permite `bg-background text-foreground`.
- **Alternativas**: variante `dark` baseada em classe (rejeitada, só seria necessária com botão manual de tema).

## 4. Fonte

- **Decisão**: `@theme inline { --font-sans: var(--font-geist-sans), Arial, Helvetica, sans-serif; }` e `font-sans` no `<body>`.
- **Rationale**: `layout.tsx` já aplica a variável `--font-geist-sans` no `<html>` via `next/font`. O `globals.css` atual cai em Arial e o CSS Module usa Geist só na tela; unificar no corpo é o comportamento desejado.

## 5. Reset e remoção do CSS do template

- **Decisão**: remover do `globals.css` o reset manual (`* { margin: 0; padding: 0 }`), `a { ... }`, `html { height }` e o `body` flex. Manter só tema, fonte e o que o Tailwind não cobre.
- **Rationale**: o preflight do Tailwind já normaliza margens, `box-sizing` e links. `overflow-x: hidden` em `html, body` era uma muleta; o requisito é não haver rolagem horizontal por construção (SC-004), então é removido e a conferência é feita no teste de 320 px. Se o teste mostrar estouro real, corrigir na origem.
- **Alternativas**: manter o CSS antigo ao lado (rejeitada, FR-003 pede só o necessário).

## 6. Paleta e contraste

- **Decisão**: usar o contraste como critério, não só a cópia dos valores atuais. Texto secundário `zinc-600` (claro) e `zinc-400` (escuro); ação `blue-600` com texto branco (5,2:1) e `blue-700` no hover; erro com texto `red-700` sobre `red-50` (claro) e `red-300` sobre `red-950` (escuro); contador acima do limite `red-700` e `red-400`.
- **Rationale**: o erro atual (`#dc2626` sobre fundo tingido) fica perto de 4,4:1, abaixo do mínimo de 4,5:1 da spec. A migração é a chance de corrigir (spec: "preservado ou melhorado"). Os valores exatos e razões calculadas estão em `contracts/estilo.md`.

## 7. Classes dinâmicas

- **Decisão**: escrever sempre a classe completa e escolher entre duas strings completas (por exemplo contador normal × excedido), nunca montar `text-${cor}-600`.
- **Rationale**: o Tailwind detecta classes por varredura de texto do código-fonte; nomes montados em tempo de execução não são gerados.

## 8. Verificação

- **Decisão**: lint e `tsc`; reexecutar o roteiro de navegador da spec 004 (26 verificações) para provar que o comportamento não mudou; novas verificações de estilo no mesmo roteiro: ausência de rolagem horizontal em 320 px, estilos de `getComputedStyle` (botão desabilitado, foco), e tema escuro/claro por emulação de `prefers-color-scheme`, com cálculo do contraste a partir dos estilos computados.
- **Rationale**: dá resultados objetivos para SC-001 a SC-004 sem depender de olho humano; a conferência visual por captura de tela complementa.
