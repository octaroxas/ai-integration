# Data Model: Integração com o Gemini na API

Nada é persistido. As duas entidades da spec existem só em memória, dentro da chamada.

## Análise

Resultado devolvido por `DataAnalyst::analisar()`, como array associativo.

| Campo | Tipo | Regra |
|-------|------|-------|
| `resumo` | texto | obrigatório; não vazio após `trim` |
| `pontos_principais` | lista de textos | obrigatória; pelo menos 1 item não vazio |
| `planos_de_acao` | lista de textos | obrigatória; pelo menos 1 item não vazio |

Se o modelo devolver algum campo ausente ou vazio, a análise é inválida e vira a falha `RespostaVazia` (FR-009). O texto de entrada não é guardado.

## Falha do provedor

Representada por `App\Ai\Exceptions\AnaliseFalhouException`, que carrega um `App\Ai\Enums\TipoDeFalha` e uma mensagem fixa em português.

| Tipo | Quando ocorre | Mensagem (resumo) |
|------|---------------|-------------------|
| `EntradaVazia` | texto de entrada vazio ou só com espaços; checado antes de chamar o provedor | informe um texto para analisar |
| `ConfiguracaoAusente` | `GEMINI_API_KEY` vazia ou ausente; checado antes de chamar o provedor | chave do provedor de IA não configurada |
| `Autenticacao` | provedor recusa a chave (401/403) | chave do provedor inválida ou sem permissão |
| `LimiteDeUso` | cota ou limite de requisições excedido | limite de uso do provedor atingido |
| `TempoEsgotado` | sem resposta dentro do tempo limite | o provedor demorou demais para responder |
| `ModeloInvalido` | modelo configurado inexistente ou indisponível | modelo de IA configurado não está disponível |
| `RespostaVazia` | resposta sem conteúdo ou sem os campos obrigatórios | o provedor devolveu uma resposta vazia ou incompleta |
| `Indisponivel` | provedor sobrecarregado ou fora do ar | provedor temporariamente indisponível |

Regras:
- A exceção não carrega a exceção original (`previous`) nem texto do provedor, para não vazar chave, URL ou resposta bruta (FR-004, FR-010).
- As verificações de `EntradaVazia` e `ConfiguracaoAusente` acontecem antes da chamada, para não gastar cota (caso de borda da spec). Os demais tipos vêm da resposta do provedor.
- O enum tem 8 tipos no total.

Não há transições de estado.
