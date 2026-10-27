# Pesquisa: Tela de análise de dados

Nenhum `NEEDS CLARIFICATION` ficou aberto no Technical Context. As decisões abaixo cobrem os pontos que a spec deixou para o plano.

## 1. Como a URL da API chega ao navegador

- **Decisão**: `process.env.NEXT_PUBLIC_API_URL`, lida de forma literal no código cliente.
- **Rationale**: a documentação do Next (`node_modules/next/dist/docs/01-app/02-guides/environment-variables.md`) diz que só variáveis `NEXT_PUBLIC_` são embutidas no bundle do navegador, e que o valor é substituído em tempo de build/compilação por referência literal; leituras dinâmicas (`process.env[nome]`) não são substituídas. O `docker-compose.dev.yaml` já define `NEXT_PUBLIC_API_URL: http://localhost:${APP_PORT:-8002}` para o serviço `web`, então nada muda no Compose.
- **Alternativas**: fixar `localhost:8000` (rejeitado, é o que o item 5 proíbe); rota de proxy no Next para esconder a URL (rejeitada, complexidade sem necessidade, o CORS da API já foi feito no item 4).
- **Consequência**: sem a variável, a tela mostra um erro de configuração em vez de assumir um endereço. Criar `apps/web/.env.example` documentando-a; o `.gitignore` do `apps/web` usa `.env*` e precisa de `!.env.example` para o arquivo ser versionado.

## 2. Componente cliente e estado

- **Decisão**: um componente cliente com `useState` para `texto`, `estado` (`ocioso | carregando`), `analise` e `erro`.
- **Rationale**: o estado é pequeno e local (princípio I). `'use client'` é necessário para estado e eventos.
- **Alternativas**: Server Actions (rejeitada: a spec exige falar com `POST /api/processar-dados` por URL configurável e o contrato CORS foi feito pensando no navegador); `useActionState`/formulários com biblioteca (rejeitada, sem ganho aqui).

## 3. Bloqueio de envio duplicado

- **Decisão**: `disabled` no botão e no campo durante o envio, mais um `useRef` booleano que ignora submissões enquanto outra está ativa.
- **Rationale**: `disabled` depende de re-renderização; dois eventos no mesmo tick (duplo clique, Enter repetido) podem passar. O ref fecha essa janela.
- **Alternativas**: só `disabled` (insuficiente para SC-004).

## 4. Timeout do cliente

- **Decisão**: `AbortSignal.timeout(60_000)` no `fetch`; ao estourar, "A análise demorou demais. Tente novamente."
- **Rationale**: a API não define timeout próprio para o provedor (`grep` em `apps/api/app` e `config/ai.php` não encontrou). Sem limite no cliente, um provedor travado deixaria o botão desabilitado para sempre. 60 s cobre com folga uma análise normal de modelo "flash" e mantém o usuário informado.
- **Alternativas**: sem timeout (rejeitada: fere FR-011); botão de cancelar (fora do escopo pela spec).

## 5. Classificação de erros no cliente

- **Decisão**: três origens, todas viram um `ErroDeAnalise` com mensagem em português:
  1. validação local (vazio, acima de 10.000);
  2. resposta HTTP de erro com JSON `{ sucesso: false, mensagem }`: usa `mensagem` (no 422 de validação, usa a primeira mensagem de `erros.conteudo` quando existir, senão `mensagem`);
  3. falha de rede, timeout ou resposta sem o formato esperado: mensagens fixas da tela.
- **Rationale**: o contrato do item 4 garante `sucesso: false` e `mensagem` em português para todos os erros da API; a tela só repassa. As mensagens fixas cobrem o que a API não pode dizer (API parada, JSON quebrado).
- **Alternativas**: tabela de mensagens por status (rejeitada, duplicaria o contrato).

## 6. Exibição do resultado

- **Decisão**: texto puro, com `white-space: pre-wrap` no resumo e nos itens das listas; sem Markdown.
- **Rationale**: a API devolve campos estruturados, não Markdown. React escapa o conteúdo, então HTML vindo do modelo não é interpretado (FR-006).
- **Alternativas**: renderizar Markdown (rejeitada: dependência extra sem necessidade; reavaliar se o modelo passar a devolver Markdown, como o backlog sugere).

## 7. Contagem do limite de 10.000

- **Decisão**: contar por pontos de código (`[...texto].length`) e mostrar o contador `n / 10.000` junto ao campo.
- **Rationale**: o contrato conta caracteres, não bytes; `string.length` do JavaScript conta unidades UTF-16 e divergiria da API para emojis. Evita aceitar na tela o que a API recusaria (ou o inverso).
- **Alternativas**: `maxLength` no `textarea` (rejeitada: cortaria silenciosamente texto colado em vez de avisar).

## 8. Verificação

- **Decisão**: verificação manual pelo quickstart contra a API real e contra a API parada, mais `npm run lint` e `npx tsc --noEmit` no container.
- **Rationale**: a constituição (princípio V) pede teste do fluxo principal na web; o item 6 do backlog entrega a suíte automatizada, e a spec registra isso. `analisarTexto` fica isolada em `app/lib/api.ts` para ser mockada lá.
