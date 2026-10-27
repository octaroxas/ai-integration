# Modelo de dados: Tela de análise de dados

Nada é persistido. Os tipos abaixo existem só no navegador, em `apps/web/app/lib/api.ts` e no estado do componente.

## Analise

Resultado devolvido por `POST /api/processar-dados` em `analise` ([contrato](../003-processar-dados-endpoint/contracts/processar-dados.md)).

| Campo | Tipo | Regra |
|---|---|---|
| `resumo` | texto | obrigatório, não vazio |
| `pontos_principais` | lista de textos | obrigatória, cada item é texto |
| `planos_de_acao` | lista de textos | obrigatória, cada item é texto |

Se a resposta de sucesso não cumprir isso, a tela trata como formato inesperado (erro), nunca exibe parcialmente.

## ErroDeAnalise

Erro lançado por `analisarTexto()` e exibido na tela.

| Campo | Tipo | Observação |
|---|---|---|
| `message` | texto em português | é o que o usuário vê |

Origens: validação local, resposta de erro da API (`mensagem`), falha de rede, timeout, formato inesperado, URL da API ausente.

## Estado da tela

| Estado | Tipo | Descrição |
|---|---|---|
| `texto` | texto | conteúdo do campo |
| `carregando` | booleano | há envio em andamento |
| `analise` | `Analise` ou nada | resultado do último envio bem-sucedido |
| `erro` | texto ou nada | mensagem do último problema |

### Transições

```text
ocioso ──(enviar, texto válido)──▶ carregando ──(sucesso)──▶ ocioso + analise
   │                                    └──────(erro)──────▶ ocioso + erro
   └──(enviar, texto inválido)──▶ ocioso + erro   (sem requisição)
```

- A cada tentativa de envio (válida ou não), `analise` e `erro` são limpos antes de qualquer outra coisa (FR-010). Assim nunca aparece um resultado antigo ao lado de um erro novo.
- Ao digitar após um aviso de validação, o aviso some (US4, cenário 3).
