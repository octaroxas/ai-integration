# Contrato visual: tela de análise com Tailwind

Define o que a migração precisa entregar visualmente. Os textos e a estrutura acessível não mudam em relação ao [contrato da spec 004](../../004-tela-de-analise/contracts/tela-de-analise.md).

## Tema

| Token | Claro | Escuro |
|---|---|---|
| `background` | `#ffffff` | `#0a0a0a` |
| `foreground` | `#171717` | `#ededed` |

O tema segue `prefers-color-scheme`; não há botão manual.

## Elementos e estados

| Elemento | Claro | Escuro | Observações |
|---|---|---|---|
| Página | coluna centralizada, largura máxima 720 px, margens laterais 16 px | igual | sem rolagem horizontal a partir de 320 px |
| Título `h1` | `foreground`, 28 px, peso 600 | igual | |
| Texto de apoio | `zinc-600` | `zinc-400` | |
| Rótulo | `foreground`, peso 600 | igual | |
| Campo (`textarea`) | borda `zinc-300`, fundo transparente | borda `zinc-700` | largura total, 10 linhas, redimensionável na vertical; desabilitado com opacidade 60% |
| Foco (campo e botão) | contorno 2 px `blue-600`, afastado 2 px | `blue-400` | só com `focus-visible` |
| Contador normal | `zinc-600` | `zinc-400` | 14 px |
| Contador excedido | `red-700`, peso 600 | `red-400` | |
| Botão normal | fundo `blue-600`, texto branco | igual | peso 600, cantos arredondados |
| Botão hover | fundo `blue-700` | igual | só habilitado |
| Botão desabilitado | opacidade 60%, cursor `not-allowed` | igual | sem hover |
| Erro (`role="alert"`) | borda `red-600`, texto `red-700`, fundo `red-50` | borda `red-500`, texto `red-300`, fundo `red-950` | |
| Resultado | títulos `h2` 18 px peso 600; listas com recuo 24 px; itens com 6 px de espaço | igual | texto com `whitespace-pre-wrap` e quebra de palavras longas |

## Contraste mínimo (texto normal ≥ 4,5:1)

Valores medidos no navegador (`estilo.mjs`, a partir dos estilos computados; razão de luminância WCAG), iguais em 320 px e em 1440 px:

| Par | Claro | Escuro |
|---|---|---|
| Texto principal (título, rótulo, campo, resultado) sobre o fundo | 17,93:1 | 16,91:1 |
| Texto de apoio e contador (`zinc-600` / `zinc-400`) sobre o fundo | 7,72:1 | 7,55:1 |
| Contador excedido (`red-700` / `red-400`) sobre o fundo | 6,42:1 | 6,85:1 |
| Texto branco do botão sobre `blue-600` | 5,25:1 | 5,25:1 |
| Texto do erro sobre o fundo do erro (`red-700` sobre `red-50` / `red-300` sobre `red-950`) | 5,87:1 | 8,42:1 |

## Regras

- Toda estilização por classes utilitárias nos componentes; nenhum CSS Module; o CSS global só importa o Tailwind e define tema e fonte.
- Classes escritas por inteiro, sem concatenação de partes de nome.
- Sem `@apply`, sem plugins, sem `tailwind.config.*`.
