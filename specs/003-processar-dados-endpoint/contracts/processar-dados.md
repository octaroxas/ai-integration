# Contrato: `POST /api/processar-dados`

Interface HTTP que a tela do item 5 consome. Em dev: `http://localhost:8002/api/processar-dados`.

## Requisição

- Método e caminho: `POST /api/processar-dados`
- Cabeçalhos: `Content-Type: application/json` (recomendado: `Accept: application/json`; sem ele, os erros ainda saem em JSON)
- Corpo:

```json
{ "conteudo": "Vendas caíram 12% em outubro. O estoque do produto A está parado há 60 dias." }
```

| Campo | Regras |
|---|---|
| `conteudo` | obrigatório, texto, máximo de 10.000 caracteres (contados em caracteres, não bytes); vazio ou só com espaços é tratado como ausente |

## Sucesso: 200

```json
{
  "sucesso": true,
  "analise": {
    "resumo": "Texto curto com o resumo.",
    "pontos_principais": ["Ponto 1", "Ponto 2"],
    "planos_de_acao": ["Ação 1", "Ação 2"]
  }
}
```

`analise` é exatamente o retorno de `DataAnalyst::analisar()` ([contrato do item 3](../../002-gemini-ai-integration/contracts/data-analyst.md)): os três campos sempre presentes e preenchidos.

## Erros

Todos têm `sucesso: false` e `mensagem` em português. Só o 422 de validação traz `erros`.

### 422: validação

```json
{
  "sucesso": false,
  "mensagem": "Os dados enviados são inválidos.",
  "erros": { "conteudo": ["O conteúdo é obrigatório."] }
}
```

| Caso | Mensagem em `erros.conteudo` |
|---|---|
| ausente, vazio ou só espaços | O conteúdo é obrigatório. |
| não é texto (número, lista, objeto) | O conteúdo deve ser um texto. |
| acima de 10.000 caracteres | O conteúdo deve ter no máximo 10000 caracteres. |

Nenhuma chamada ao provedor de IA é feita nesses casos.

### Falhas do provedor

```json
{ "sucesso": false, "mensagem": "O limite de uso do provedor de IA foi atingido. Tente novamente mais tarde." }
```

| Tipo de falha | Status | Mensagem |
|---|---|---|
| `LimiteDeUso` | 503 | O limite de uso do provedor de IA foi atingido. Tente novamente mais tarde. |
| `ConfiguracaoAusente` | 503 | A chave do provedor de IA não está configurada. |
| `Autenticacao` | 502 | A chave do provedor de IA é inválida ou não tem permissão. |
| `TempoEsgotado` | 502 | O provedor de IA demorou demais para responder ou não respondeu. |
| `ModeloInvalido` | 502 | O modelo de IA configurado não está disponível. |
| `RespostaVazia` | 502 | O provedor de IA devolveu uma resposta vazia ou incompleta. |
| `Indisponivel` | 502 | O provedor de IA está temporariamente indisponível. |
| `EntradaVazia` | 422 | Informe um texto para analisar. |

A resposta não traz o tipo, a chave, o nome do modelo, rastros nem a resposta bruta do provedor.

### 500: erro inesperado

```json
{ "sucesso": false, "mensagem": "Ocorreu um erro inesperado. Tente novamente." }
```

### Outros

`GET` na rota devolve 405 `{ "sucesso": false, "mensagem": "Método não permitido." }` (com o cabeçalho `Allow: POST`) e caminhos inexistentes em `/api/*` devolvem 404 `{ "sucesso": false, "mensagem": "Rota não encontrada." }`. Nunca rastro nem página HTML.

## CORS

- Origem liberada: a de `CORS_ALLOWED_ORIGIN` (default `http://localhost:3002`); nenhuma outra.
- Método liberado: `POST`; cabeçalhos liberados: `Content-Type`, `Accept`; sem credenciais (cookies).
- O navegador faz uma pré-verificação `OPTIONS` antes do `POST` com JSON; a API responde 204 com os cabeçalhos `Access-Control-Allow-*` quando a origem é a permitida.
- Com uma única origem configurada, o Laravel sempre devolve `Access-Control-Allow-Origin` com a origem permitida. Para uma página de outra origem o valor não coincide com o dela e o navegador bloqueia a chamada. O CORS protege navegadores; `curl` e outros clientes de servidor continuam acessando a rota.

## Garantias

- A rota só valida a entrada e chama o agente; não há chamada ao provedor na rota.
- Uma falha não afeta as requisições seguintes; corrigida a causa, a próxima funciona sem reiniciar a API.
- Nada é persistido.
