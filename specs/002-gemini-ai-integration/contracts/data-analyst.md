# Contrato: `DataAnalyst::analisar()`

A feature não expõe endpoint HTTP. A única interface é a chamada PHP que o desenvolvedor usa no `tinker` e que o endpoint do item 4 consumirá. Este contrato é o que o item 4 pode assumir.

## Chamada

```php
(new \App\Ai\Agents\DataAnalyst)->analisar(string $conteudo): array
```

- Classe: `App\Ai\Agents\DataAnalyst` (único ponto que fala com o provedor de IA).
- Entrada: `$conteudo`, o texto a analisar. Limite de tamanho e formato não são validados aqui (item 4).

## Retorno em caso de sucesso

Array associativo, conforme `data-model.md`:

```php
[
    'resumo' => 'Texto curto com o resumo.',
    'pontos_principais' => ['Ponto 1', 'Ponto 2'],
    'planos_de_acao' => ['Ação 1', 'Ação 2'],
]
```

Todos os campos estão sempre presentes e preenchidos; do contrário a chamada falha com `RespostaVazia`.

## Falhas

Toda falha lança `App\Ai\Exceptions\AnaliseFalhouException`, com:

- `tipo`: um `App\Ai\Enums\TipoDeFalha` (`EntradaVazia`, `ConfiguracaoAusente`, `Autenticacao`, `LimiteDeUso`, `TempoEsgotado`, `ModeloInvalido`, `RespostaVazia`, `Indisponivel`).
- `getMessage()`: mensagem fixa em português por tipo, própria para o usuário final.

Garantias:

- Nenhuma outra exceção de rede, HTTP ou do SDK escapa de `analisar()`.
- A exceção e seus logs não contêm a chave, URLs do provedor, rastros do provedor nem respostas brutas.
- Depois de qualquer falha, uma nova chamada com a configuração corrigida funciona sem reiniciar a API.

## Sugestão de mapeamento para o item 4 (não faz parte desta feature)

| Tipo | HTTP sugerido |
|------|---------------|
| `EntradaVazia` | 422 |
| `ConfiguracaoAusente`, `Autenticacao`, `ModeloInvalido` | 500 |
| `LimiteDeUso` | 429 |
| `TempoEsgotado` | 504 |
| `RespostaVazia`, `Indisponivel` | 502 |
