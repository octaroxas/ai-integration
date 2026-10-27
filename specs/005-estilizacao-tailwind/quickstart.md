# Quickstart: validar a migração para Tailwind

Contratos: [estilo.md](./contracts/estilo.md) e [tela-de-analise.md](../004-tela-de-analise/contracts/tela-de-analise.md).

## Pré-requisitos

- Stack no ar (`docker compose -f docker-compose.dev.yaml up -d --build`) e `GEMINI_API_KEY` válida em `apps/api/.env` (só o cenário de envio real usa o Gemini).
- `export UID USER` no shell antes de comandos que gerem arquivos em `apps/web`.

## Instalação (feita uma vez, no container)

```bash
docker compose -f docker-compose.dev.yaml exec web npm install -D tailwindcss @tailwindcss/postcss
```

Conferir `package.json` (`tailwindcss` e `@tailwindcss/postcss` em `devDependencies`) e que o `package-lock.json` mudou. Validar o lock com instalação limpa:

```bash
docker compose -f docker-compose.dev.yaml exec web sh -c 'rm -rf node_modules/* node_modules/.lock-hash && npm ci --no-audit --no-fund && echo "$(sha256sum package-lock.json | cut -d" " -f1)" > node_modules/.lock-hash'
docker compose -f docker-compose.dev.yaml restart web
```

## Verificações estáticas

```bash
docker compose -f docker-compose.dev.yaml exec web npm run lint
docker compose -f docker-compose.dev.yaml exec web npx tsc --noEmit
```

Esperado: nenhum erro. Também: `find apps/web -name '*.module.css' -not -path '*/node_modules/*'` não lista nada.

## Cenários

| # | Verificação | Esperado |
|---|---|---|
| 1 | Abrir `http://localhost:3002` | Tela estilizada (campo, botão azul, contador) sem erro no console |
| 2 | Roteiro de navegador da spec 004 (carregando, resultado, erro, validação, duplo envio, HTML como texto, quebras de linha) | Todas as verificações passam, sem mudar textos |
| 3 | Emular `prefers-color-scheme: dark` e `light` | Fundo e texto trocam; contraste do texto principal ≥ 4,5:1 nos dois temas |
| 4 | Largura de 320 px e de 1440 px | `document.documentElement.scrollWidth <= innerWidth`; campo, contador e botão sem sobreposição |
| 5 | Navegar com Tab até o campo e o botão | Contorno de foco visível nos dois |
| 6 | Botão em carregamento | Opacidade reduzida e cursor `not-allowed` |
| 7 | Editar uma classe de cor em `analisador.tsx` | A cor muda no navegador em até 5 s, sem reiniciar o container |
| 8 | Recriar o volume de cache (`docker compose -f docker-compose.dev.yaml down` seguido de `docker volume rm ai-test_web_next` — conferir o nome com `docker volume ls`) e subir de novo | A tela abre estilizada; se aparecer estilo antigo, é cache: recriar o volume resolve |
| 9 | `grep -rn "dangerouslySetInnerHTML\|module.css" apps/web/app` | Nada encontrado |

## Conferência visual

Gerar capturas de tela (puppeteer, no scratchpad) em claro, escuro e 320 px para comparar com o estado anterior da tela.
