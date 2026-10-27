# Pesquisa: Endpoint de processamento de dados

Não havia `NEEDS CLARIFICATION` na spec. Estas são as decisões de projeto, conferidas contra o código existente e o framework instalado em `apps/api`.

## 1. Onde ficam o envelope de erro e o mapeamento de status

- **Decisão**: renderizadores em `->withExceptions()` de `bootstrap/app.php`, só para `api/*`: `ValidationException` → 422, `AnaliseFalhouException` → status por tipo, demais `Throwable` (exceto `HttpException`) → 500 genérico.
- **Racional**: um ponto único garante o mesmo formato em qualquer erro, inclusive os lançados fora do controller, e o controller fica sem `try/catch`. O `shouldRenderJsonWhen` para `api/*` já existe nesse arquivo e cobre o FR-011.
- **Alternativas**: `try/catch` no controller (duplica tratamento e engorda o controller); método `render()` na `AnaliseFalhouException` (faria a camada de IA conhecer HTTP, contra o princípio IV); método `status()` no enum `TipoDeFalha` (mesmo problema).

## 2. Status HTTP por tipo de falha

| `TipoDeFalha` | Status |
|---|---|
| `EntradaVazia` | 422 |
| `LimiteDeUso`, `ConfiguracaoAusente` | 503 |
| `Autenticacao`, `TempoEsgotado`, `ModeloInvalido`, `RespostaVazia`, `Indisponivel` | 502 |

- **Racional**: 502 diz que a API (gateway) recebeu uma resposta ruim ou nenhuma do provedor; 503 diz que o serviço está temporariamente fora, o que vale para cota esgotada e para a chave não configurada. `EntradaVazia` não chega a ocorrer pela rota, porque o Form Request já recusa antes; o 422 existe só por coerência caso o agente seja chamado por outro caminho.
- **Alternativa**: 502 para todas as falhas do provedor (mais simples). Descartada porque a web pode querer distinguir "tente mais tarde" (503) de "falha do provedor" (502) sem ler a mensagem.

## 3. Validação do `conteudo`

- **Decisão**: `['required', 'string', 'max:10000']` num `ProcessarDadosRequest`, com `messages()` em português.
- **Racional**: o Laravel já aplica `TrimStrings` e `ConvertEmptyStringsToNull` (confirmado no `Middleware.php` do framework), então vazio e só espaços viram `null` e caem em `required`. `max` conta caracteres multibyte (`mb_strlen`), como pede a spec para acentos e emojis. Corpo ausente ou JSON malformado dá entrada vazia e também cai em `required`.
- **Limite de 10.000 caracteres**: cerca de 2.500 tokens, bem abaixo da janela do modelo e razoável para um relatório colado na tela, protegendo a cota gratuita. É constante na regra, não variável de ambiente (princípio I).
- **Alternativas**: limite por variável de ambiente (config extra sem necessidade registrada); limite em bytes (injusto com texto acentuado).

## 4. Idioma das mensagens de validação

- **Decisão**: mensagens e nomes de atributo no próprio Form Request (`messages()` e `attributes()`), sem trocar `APP_LOCALE` nem instalar pacote de traduções.
- **Racional**: só há um campo e três regras; trocar o locale da aplicação afetaria outras mensagens sem ganho. O envelope usa uma mensagem geral fixa ("Os dados enviados são inválidos.") e o mapa `erros` com as mensagens por campo.
- **Alternativa**: `lang/pt_BR/validation.php` completo (arquivo grande para um campo só).

## 5. CORS

- **Decisão**: manter o `HandleCors` nativo (já registrado globalmente) e publicar `config/cors.php` (`php artisan config:publish cors`), ajustando: `paths => ['api/*']`, `allowed_origins => [env('CORS_ALLOWED_ORIGIN', 'http://localhost:3002')]`, `allowed_methods => ['POST']`, `allowed_headers => ['Content-Type', 'Accept']`, sem credenciais.
- **Racional**: o default do framework é `allowed_origins => ['*']` (conferido em `vendor/laravel/framework/config/cors.php`), ou seja, aberto a todos; sem publicar a config, a restrição não existiria. Não precisa de pacote nem middleware próprio. A origem em variável de ambiente deixa o deploy (item 7) só trocar o `.env`.
- **Preflight**: o `HandleCors` responde o `OPTIONS` sozinho, antes das rotas, com 204 e os cabeçalhos `Access-Control-Allow-*` quando a origem é permitida; com uma única origem configurada, devolve sempre `Access-Control-Allow-Origin` com essa origem (confirmado na validação); para uma página de outra origem o valor não coincide e o navegador bloqueia.
- **Alternativas**: middleware de CORS escrito à mão (reinventa o nativo); pacote `fruitcake/laravel-cors` (já incorporado ao framework).

## 6. Erros inesperados e logs

- **Decisão**: o renderizador genérico devolve 500 com a mensagem fixa "Ocorreu um erro inesperado. Tente novamente." e o `report()` padrão do Laravel continua registrando a exceção no log do servidor.
- **Racional**: o log interno com rastro é aceitável (FR-009 trata de respostas e logs que vazam a chave ou a resposta bruta do provedor, e a `AnaliseFalhouException` já não carrega esses dados). O corpo da resposta nunca traz rastro, mesmo com `APP_DEBUG=true`.
- **Alternativa**: deixar o Laravel renderizar o erro com rastro em debug (vazaria caminhos para o cliente).

## 7. `HttpException` (404, 405) em `/api/*`

- **Decisão**: tratar no mesmo renderizador genérico, com mensagens fixas em português (404 "Rota não encontrada.", 405 "Método não permitido.", demais "A requisição não pôde ser atendida.") e o status e os cabeçalhos originais (por exemplo `Allow`).
- **Racional**: descoberto na validação: com `APP_DEBUG=true` o JSON padrão do Laravel para 404/405 traz `exception`, `file`, `line` e `trace`, o que vaza caminhos internos e fere o FR-009. O envelope único resolve isso sem código extra relevante.

## 8. Documentação do contrato

- **Decisão**: [contracts/processar-dados.md](contracts/processar-dados.md) nesta feature, e o `README.md` aponta para ele.
- **Racional**: é o mesmo padrão da spec 002 (`contracts/data-analyst.md`); o item 5 lê o contrato do mesmo lugar.
