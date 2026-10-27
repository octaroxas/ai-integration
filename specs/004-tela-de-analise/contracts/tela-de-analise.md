# Contrato de UI: Tela de análise

A tela consome o contrato [`POST /api/processar-dados`](../../003-processar-dados-endpoint/contracts/processar-dados.md). Este documento fixa o que o usuário vê e como cada resposta da API é traduzida.

## Elementos

| Elemento | Texto / comportamento |
|---|---|
| Título da página | "Análise de dados com IA" |
| Rótulo do campo | "Texto para analisar" |
| Contador | `n / 10.000` (caracteres) |
| Botão (ocioso) | "Analisar Dados" |
| Botão (carregando) | "Processando com IA...", desabilitado; o campo também fica desabilitado |
| Resultado | blocos "Resumo", "Pontos principais" (lista), "Planos de ação" (lista) |
| Erro | caixa de destaque com `role="alert"` |

## Requisição enviada

`POST ${NEXT_PUBLIC_API_URL}/api/processar-dados` com `Content-Type: application/json`, `Accept: application/json` e corpo `{ "conteudo": "<texto como digitado>" }`. Espera máxima: 60 s.

## Tradução de resultados

| Situação | O que a tela mostra |
|---|---|
| 200 com `sucesso: true` e `analise` válida | o resultado |
| 422 com `erros.conteudo[0]` | essa mensagem |
| Outro status com `sucesso: false` e `mensagem` | a `mensagem` da API |
| Falha de rede / API parada | "Não foi possível falar com o servidor. Verifique se a API está no ar e tente novamente." |
| Timeout (60 s) | "A análise demorou demais. Tente novamente." |
| 200 ou erro sem o formato esperado (JSON inválido, campos ausentes) | "A resposta do servidor veio em um formato inesperado." |
| `NEXT_PUBLIC_API_URL` ausente | "A URL da API não está configurada." |

## Validação local (sem requisição)

| Caso | Mensagem |
|---|---|
| vazio ou só espaços | "Informe um texto para analisar." |
| mais de 10.000 caracteres | "O texto deve ter no máximo 10000 caracteres." |

## Garantias

- No máximo uma requisição em andamento por vez.
- Todo texto vindo da API é exibido como texto puro.
- Nenhum dado é guardado; recarregar a página limpa tudo.
