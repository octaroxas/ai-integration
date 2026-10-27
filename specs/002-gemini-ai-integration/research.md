# Research: Integração com o Gemini na API

Data: 2026-10-27. Fontes: Packagist, documentação oficial do Laravel AI SDK (laravel.com/docs/13.x/ai-sdk) e página de preços do Gemini API (ai.google.dev). Itens marcados **Confirmar na implementação** dependem do código do pacote instalado ou de uma chave real e viram tarefas explícitas.

## 1. Pacote do AI SDK

- **Decision**: `laravel/ai` (v1.3.0 na data), instalado com `composer require laravel/ai` em `apps/api`.
- **Rationale**: é o "official AI SDK for Laravel"; exige PHP ^8.3 e aceita `illuminate/*` ^12 ou ^13, então é compatível com o projeto (Laravel 13, PHP 8.4). A constituição pede o AI SDK nativo.
- **Alternatives considered**: SDK oficial do Google/`google-gemini-php` (rejeitado: foge da constituição e prende o código ao provedor); chamar a API REST do Gemini com `Http::` (rejeitado: reimplementa o que o SDK já faz e dificulta trocar de provedor).

## 2. Configuração do provedor e da chave

- **Decision**: publicar só o `config/ai.php` (`php artisan vendor:publish --provider="Laravel\Ai\AiServiceProvider"`, limitando a publicação à configuração se houver tag; ver item 7). A chave vem de `GEMINI_API_KEY` (nome que o SDK lê para o Gemini). O provedor padrão e o modelo padrão de texto vêm de variáveis de ambiente `AI_PROVIDER` (default `gemini`) e `AI_MODEL`, ligadas no `config/ai.php`.
- **Rationale**: o SDK documenta as credenciais por provedor no `.env` e o modelo padrão por provedor em `config/ai.php` (`models.text.default`). Ligar o modelo a `env('AI_MODEL')` cumpre a constituição (modelo e provedor por variável de ambiente, sem nome fixo no código) e o princípio III (chave só no `apps/api/.env`).
- **Alternatives considered**: atributos `#[Provider]`/`#[Model]` na classe do agente (rejeitado: fixam provedor e modelo no código); passar `provider:`/`model:` em cada `prompt()` (rejeitado: espalha a configuração).
- **Confirmado na implementação**: no `config/ai.php` publicado, `'default' => env('AI_PROVIDER', 'gemini')` e `providers.gemini.models.text.default => env('AI_MODEL')`. A publicação foi só da configuração, com a tag `ai-config`. Se `AI_MODEL` não for definida, o SDK usa o padrão interno dele (`gemini-3.8-flash`).

## 3. Modelo gratuito de hoje

- **Decision**: valor de exemplo `AI_MODEL=gemini-3.8-flash` em `apps/api/.env.example`; alternativa estável de reserva `gemini-2.5-flash`.
- **Rationale**: a página de preços do Gemini API lista `gemini-3.8-flash`, `gemini-3.6-flash`, `gemini-3.5-flash-lite`, `gemini-3.1-flash-lite`, `gemini-2.5-flash` e `gemini-2.5-flash-lite` com "Free of charge" na camada gratuita. O `gemini-1.5-flash` do documento de origem já não aparece. O 3.8 é o Flash mais recente e não é marcado como preview.
- **Alternatives considered**: `gemini-3.5-flash-lite` / `gemini-2.5-flash-lite` (mais baratos, menor qualidade de análise); `gemini-2.5-pro` (cota gratuita mais apertada).
- **Confirmado na implementação (2026-10-27, chave gratuita real)**: o exemplo e o reserva do plano não serviram.
  - `gemini-3.8-flash`: `503` ("high demand") em todas as tentativas.
  - `gemini-2.5-flash`: `404` pelo SDK, embora a chave o liste (o SDK usa uma API de interações que esse modelo não atende).
  - `gemini-3.6-flash`: funcionou uma vez, depois `429` por cota da camada gratuita.
  - `gemini-3.5-flash-lite` e `gemini-flash-lite-latest`: funcionaram de forma repetida.
  - **Decisão final**: `AI_MODEL=gemini-3.5-flash-lite` no `apps/api/.env.example`. Disponibilidade e cota na camada gratuita variam por modelo e por dia, então trocar o modelo por configuração (US3) é a saída prática.

## 4. Forma do agente e ponto único de isolamento

- **Decision**: `App\Ai\Agents\DataAnalyst`, criado com `php artisan make:agent DataAnalyst --structured`, implementando `Agent` e `HasStructuredOutput`, com `instructions()` e `schema()`. O agente expõe `analisar(string $conteudo): array`, que chama `prompt()`, valida a resposta e traduz as falhas. Não há serviço separado.
- **Rationale**: a constituição pede um único ponto (agente ou serviço). Uma classe só é a menor implementação, e o `tinker` chama `(new DataAnalyst)->analisar('...')`. Saída estruturada garante as duas partes pedidas na spec (resumo e planos de ação) e torna "resposta vazia ou incompleta" detectável.
- **Alternatives considered**: agente + serviço `AnalisadorDeDados` (rejeitado: camada sem uso imediato, Princípio I); texto livre com instruções ("devolva resumo e planos") sem schema (rejeitado: não dá para validar as duas partes).

## 5. Formato da análise (resolve a suposição da spec)

- **Decision**: o schema devolve três campos: `resumo` (texto curto), `pontos_principais` (lista de textos) e `planos_de_acao` (lista de textos), todos obrigatórios. `analisar()` devolve um array com esses campos.
- **Rationale**: "resumo estruturado" vira partes identificáveis (resumo + pontos principais) e os planos de ação ficam separados, como a spec exige (FR-002). O item 4 pode serializar o array direto em JSON.
- **Alternatives considered**: um único campo `analise` em Markdown (rejeitado: mistura as partes); objetos aninhados com prioridade e prazo (rejeitado: não pedido, Princípio I).

## 6. Tratamento de falhas

- **Decision**: `analisar()` captura as falhas e lança uma única exceção de domínio `App\Ai\Exceptions\AnaliseFalhouException`, com um enum `App\Ai\Enums\TipoDeFalha`: `EntradaVazia`, `ConfiguracaoAusente`, `Autenticacao`, `LimiteDeUso`, `TempoEsgotado`, `ModeloInvalido`, `RespostaVazia`, `Indisponivel`. A exceção carrega só o tipo e uma mensagem fixa em português por tipo, sem `previous` e sem texto do provedor. O item 4 a converte em HTTP.
- **Mapeamento previsto**: `RateLimitedException` → `LimiteDeUso`; `ProviderOverloadedException` → `Indisponivel`; erro de conexão/timeout do cliente HTTP → `TempoEsgotado`; resposta HTTP 401/403 → `Autenticacao`; 404 no modelo → `ModeloInvalido`; schema sem os campos ou todos vazios → `RespostaVazia`; chave vazia em `config('ai.providers.gemini.key')` → `ConfiguracaoAusente`, checada antes de chamar o provedor. Texto vazio é recusado antes da chamada com `EntradaVazia`.
- **Rationale**: a documentação diz que `RateLimitedException` e `ProviderOverloadedException` são `FailoverableException`, e que erros comuns (requisição inválida) são exceções genéricas. O Gemini aceita a chave na URL ou em cabeçalho, e mensagens de erro de conexão do cliente HTTP podem incluir a URL; por isso a exceção própria nunca repassa a mensagem original (FR-004, FR-010).
- **Alternatives considered**: deixar as exceções do SDK subirem (rejeitado: viola FR-009/FR-010); retornar um objeto de resultado com `sucesso: false` (rejeitado: exceção é mais natural no Laravel e o item 4 já tem handler de erro HTTP).
- **Confirmado na implementação** (lendo `vendor/laravel/ai` e testando com a chave real):
  - O Gemini recebe a chave no cabeçalho `x-goog-api-key`, não na URL.
  - `429` → `RateLimitedException` e `402` → `InsufficientCreditsException` (ambos viram `LimiteDeUso`); `502/503/504/520/522/524` → `ProviderOverloadedException` (`Indisponivel`); falha de conexão ou timeout → `ProviderConnectionException` (`TempoEsgotado`). Todos observados ao vivo, exceto timeout.
  - Os 4xx comuns passam como `Illuminate\Http\Client\RequestException`. **Chave inválida volta como HTTP `400`, não 401/403**, com `error.details[].reason = API_KEY_INVALID`, e o corpo do erro vem embrulhado numa lista (`[{"error": …}]`). A classificação usa o `reason` (`API_KEY…`) além de 401/403. Modelo inexistente é `404` → `ModeloInvalido`.
  - Qualquer outra exceção (inclusive `AiException` genérica) cai em `Indisponivel`.
  - `TempoEsgotado` (timeout/conexão) não foi provocado ao vivo: está coberto só pelo mapeamento no código.

## 7. Migração de conversas do SDK

- **Decision**: não usar o armazenamento de conversas do SDK; publicar só a configuração e não publicar nem rodar a migração das tabelas `agent_conversations` e `agent_conversation_messages`.
- **Rationale**: a spec não persiste análises (Key Entities) e o histórico é item 8 do backlog. A documentação manda publicar configuração e migração e rodar `migrate`, mas isso é para conversas.
- **Alternatives considered**: publicar e migrar tudo (rejeitado: cria tabelas sem uso, Princípio I).
- **Confirmado na implementação**: o pacote só usa `publishesMigrations` (não há `loadMigrationsFrom`), então `php artisan migrate` não cria as tabelas de conversas sem a publicação. Publicado só com a tag `ai-config`; `migrate:status` segue com as 3 migrações do esqueleto e não existe nenhuma tabela `agent_*`.

## 8. Tempo limite

- **Decision**: manter o padrão do SDK de 60 segundos de timeout HTTP por requisição de agente, sem atributo explícito.
- **Rationale**: coincide com o SC-001 (60 segundos) sem código extra. O SDK permite ajustar por `#[Timeout]` ou pelo argumento `timeout:` se necessário.
- **Alternatives considered**: `#[Timeout(30)]` (rejeitado: arriscado para modelos Flash com raciocínio); valor via `.env` (rejeitado por ora: sem necessidade, YAGNI).

## 9. Validação manual e cota

- **Decision**: validar pelo `php artisan tinker` dentro do container, com `(new \App\Ai\Agents\DataAnalyst)->analisar('texto')`, e depois com `GEMINI_API_KEY` inválida. Nenhum teste automatizado (item 6).
- **Rationale**: é o critério de aceite da spec e do backlog. A chamada real consome cota gratuita, então os testes automáticos ficam para o item 6 com fake, como manda o princípio V.
- **Alternatives considered**: teste automatizado com `Agent::fake()` agora (rejeitado: fora de escopo da spec).

## 10. Itens resolvidos

- Nome do pacote e comandos de instalação: itens 1, 2, 7.
- Modelo gratuito de exemplo: item 3.
- Formato do resumo estruturado e do erro tratado: itens 5 e 6.
- Limite de tempo do SC-001: item 8.
- Nenhum `NEEDS CLARIFICATION` restante.
