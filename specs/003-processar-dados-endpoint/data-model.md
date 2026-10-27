# Modelo de dados: Endpoint de processamento de dados

Nada é persistido. As estruturas abaixo existem só durante a requisição.

## Requisição de análise

Corpo JSON enviado ao `POST /api/processar-dados`.

| Campo | Tipo | Regras |
|---|---|---|
| `conteudo` | texto | obrigatório; string; máximo de 10.000 caracteres; vazio ou só com espaços conta como ausente |

Campos extras são ignorados.

## Resposta de sucesso (200)

| Campo | Tipo | Descrição |
|---|---|---|
| `sucesso` | booleano | sempre `true` |
| `analise` | objeto | o retorno de `DataAnalyst::analisar()` sem alterações |
| `analise.resumo` | texto | resumo curto do conteúdo |
| `analise.pontos_principais` | lista de textos | pelo menos 1 item |
| `analise.planos_de_acao` | lista de textos | pelo menos 1 item |

## Resposta de erro

| Campo | Tipo | Descrição |
|---|---|---|
| `sucesso` | booleano | sempre `false` |
| `mensagem` | texto | mensagem em português, própria para o usuário final |
| `erros` | objeto | só no 422 de validação: campo → lista de mensagens |

## Mapeamento de falha para resposta

| Origem | Status | `mensagem` |
|---|---|---|
| `ValidationException` | 422 | "Os dados enviados são inválidos." (+ `erros`) |
| `AnaliseFalhouException` / `EntradaVazia` | 422 | mensagem do tipo |
| `AnaliseFalhouException` / `LimiteDeUso`, `ConfiguracaoAusente` | 503 | mensagem do tipo |
| `AnaliseFalhouException` / `Autenticacao`, `TempoEsgotado`, `ModeloInvalido`, `RespostaVazia`, `Indisponivel` | 502 | mensagem do tipo |
| Qualquer outra exceção | 500 | "Ocorreu um erro inesperado. Tente novamente." |

As mensagens por tipo são as já definidas em `App\Ai\Enums\TipoDeFalha::mensagem()` (item 3) e não mudam.

## Configuração

| Variável | Onde | Default | Uso |
|---|---|---|---|
| `CORS_ALLOWED_ORIGIN` | `apps/api/.env` (exemplo em `.env.example`) | `http://localhost:3002` | única origem liberada pelo CORS |
