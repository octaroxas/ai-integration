# Quickstart: validar o endpoint `POST /api/processar-dados`

Pré-requisitos: a stack no ar (`docker compose -f docker-compose.dev.yaml up -d`) e `GEMINI_API_KEY` válida em `apps/api/.env` (ver o [quickstart da spec 002](../002-gemini-ai-integration/quickstart.md)). Os passos 2 e 3 chamam o Gemini real e consomem a cota gratuita. O contrato completo está em [contracts/processar-dados.md](contracts/processar-dados.md).

Os exemplos usam a porta padrão 8002; troque se `APP_PORT` for outra.

## 1. Rota registrada

```bash
docker compose -f docker-compose.dev.yaml exec api php artisan route:list --path=api
```

Esperado: `POST api/processar-dados` apontando para `ProcessarDadosController`, além de `GET api/health`.

## 2. Análise com sucesso (US1)

```bash
curl -s -X POST http://localhost:8002/api/processar-dados \
  -H 'Content-Type: application/json' -H 'Accept: application/json' \
  -d '{"conteudo":"Vendas caíram 12% em outubro. O estoque do produto A está parado há 60 dias e o atendimento teve 30 reclamações de atraso."}'
```

Esperado: 200 com `sucesso: true` e `analise` com `resumo`, `pontos_principais` e `planos_de_acao` preenchidos, em até 60 segundos. Repita com outro texto: a resposta muda. A resposta não traz chave nem nome do modelo.

## 3. Falha do provedor (US3)

Reinicie a API com uma chave inválida só para este comando, sem editar o `.env` real nem imprimir a chave:

```bash
docker compose -f docker-compose.dev.yaml run --rm --no-deps -p 8003:8000 -e GEMINI_API_KEY=chave-invalida api \
  php artisan serve --host=0.0.0.0 --port=8000 &
sleep 4
curl -s -i -X POST http://localhost:8003/api/processar-dados \
  -H 'Content-Type: application/json' -d '{"conteudo":"teste"}'
```

Esperado: 502 com `{"sucesso":false,"mensagem":"A chave do provedor de IA é inválida ou não tem permissão."}`. Encerre o processo de fundo (`kill %1`) e repita o passo 2 na API normal (porta 8002): deve funcionar sem reiniciá-la (SC-007).

Com `GEMINI_API_KEY=` (vazia) o esperado é 503 "A chave do provedor de IA não está configurada.", sem chamar o provedor. `LimiteDeUso` (503) e `Indisponivel` (502) aparecem sozinhos na cota gratuita; `TempoEsgotado` e `RespostaVazia` não dá para provocar de forma confiável contra o provedor real e ficam para os testes com fake do item 6.

## 4. Validação (US2), sem gastar cota

```bash
U=http://localhost:8002/api/processar-dados
H='Content-Type: application/json'
curl -s -i -X POST $U -H "$H" -H 'Accept: application/json' -d '{}'                       # 422: obrigatório
curl -s -i -X POST $U -H "$H" -d '{"conteudo":"   "}'                                      # 422: obrigatório (sem o Accept: ainda JSON)
curl -s -i -X POST $U -H "$H" -d '{"conteudo":123}'                                        # 422: deve ser texto
curl -s -i -X POST $U -H "$H" -d "{\"conteudo\":\"$(head -c 10001 /dev/zero | tr '\0' a)\"}"  # 422: máximo
curl -s -i -X POST $U -H "$H" -d "{\"conteudo\":\"$(head -c 10000 /dev/zero | tr '\0' a)\"}"  # no limite: aceito (chama o Gemini)
curl -s -i -X POST $U -H "$H" -d '{broken'                                                 # 422: JSON malformado
```

Esperado: 422 com `sucesso: false`, `mensagem` e `erros.conteudo` em português nos cinco primeiros; o último confere o limite exato (10.000 caracteres passam e chamam o provedor; um a mais é recusado). Confira nos logs que nenhum desses 422 gerou chamada ao provedor.

## 5. CORS (US4)

```bash
U=http://localhost:8002/api/processar-dados
# origem permitida: deve trazer Access-Control-Allow-Origin: http://localhost:3002
curl -s -i -X OPTIONS $U -H 'Origin: http://localhost:3002' \
  -H 'Access-Control-Request-Method: POST' -H 'Access-Control-Request-Headers: content-type'
# outra origem: Access-Control-Allow-Origin continua sendo http://localhost:3002 (nunca evil.example), então o navegador bloqueia
curl -s -i -X OPTIONS $U -H 'Origin: http://evil.example' \
  -H 'Access-Control-Request-Method: POST' -H 'Access-Control-Request-Headers: content-type'
```

## 6. Outros métodos e rotas

```bash
curl -s -i http://localhost:8002/api/processar-dados          # 405 no envelope, sem rastro
curl -s -i http://localhost:8002/api/nao-existe               # 404 no envelope, sem rastro
```

## 7. Segredos e logs

```bash
git status --short                                            # apps/api/.env não aparece
K="$(grep '^GEMINI_API_KEY=' apps/api/.env | cut -d= -f2-)"
grep -cF -- "$K" apps/api/storage/logs/laravel.log            # 0 ocorrências da chave
```

Confira também que nenhuma das respostas acima contém a chave, `gemini` ou rastros (`vendor/`, `.php`).
