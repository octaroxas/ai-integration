# Quickstart: validar a tela de análise

Valida a feature de ponta a ponta contra a stack Docker. Contratos: [tela-de-analise.md](./contracts/tela-de-analise.md) e [processar-dados.md](../003-processar-dados-endpoint/contracts/processar-dados.md).

## Pré-requisitos

- `.env` na raiz (copie de `.env.example`) e `apps/api/.env` com `GEMINI_API_KEY` válida.
- `apps/web/node_modules` e `apps/web/.next` existem no host (ver README), para o Docker não criá-los como root.
- Stack no ar: `docker compose -f docker-compose.dev.yaml up -d --build`.
- A API responde: `curl http://localhost:8002/api/health`.

## Verificações estáticas (no container)

```bash
docker compose -f docker-compose.dev.yaml exec web npm run lint
docker compose -f docker-compose.dev.yaml exec web npx tsc --noEmit
```

Esperado: nenhum erro.

## Cenários manuais em `http://localhost:3002`

| # | Ação | Esperado |
|---|---|---|
| 1 | Colar "Vendas caíram 12% em outubro. O estoque do produto A está parado há 60 dias." e clicar em "Analisar Dados" | Botão vira "Processando com IA..." (desabilitado); depois aparecem Resumo, Pontos principais e Planos de ação |
| 2 | Durante o carregamento, clicar várias vezes no botão | Uma única requisição (aba Rede do navegador) |
| 3 | Enviar outro texto | Só a análise nova aparece |
| 4 | Clicar com o campo vazio, depois só com espaços | "Informe um texto para analisar."; nenhuma requisição |
| 5 | Colar mais de 10.000 caracteres e enviar | "O texto deve ter no máximo 10000 caracteres."; nenhuma requisição |
| 6 | Colar exatamente 10.000 caracteres e enviar | Enviado normalmente |
| 7 | Parar a API (`docker compose -f docker-compose.dev.yaml stop api`) e enviar um texto | Mensagem "Não foi possível falar com o servidor..."; botão volta a "Analisar Dados" |
| 8 | Religar a API (`... start api`) e enviar de novo | Funciona sem recarregar a página; o erro some |
| 9 | Invalidar `GEMINI_API_KEY` em `apps/api/.env`, reiniciar a API e enviar | Mensagem em português da API (chave inválida); sem análise |
| 10 | Inspecionar o código servido ao navegador | Sem chave do provedor; só a URL da API |

Restaure a chave correta depois do cenário 9.
