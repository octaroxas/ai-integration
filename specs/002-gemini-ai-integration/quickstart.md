# Quickstart: validar a integração com o Gemini

Pré-requisitos: a stack da spec 001 no ar (`docker compose -f docker-compose.dev.yaml up -d`) e uma chave gratuita do [Google AI Studio](https://aistudio.google.com/). A validação consome a cota gratuita real.

## 1. Configurar a chave e o modelo

Edite `apps/api/.env` (arquivo privado, ignorado pelo git; o `.env.example` fica com a chave vazia):

```env
GEMINI_API_KEY=sua_chave_do_google_ai_studio
AI_PROVIDER=gemini
AI_MODEL=gemini-3.5-flash-lite
```

O `apps/api/.env` já existe desde a primeira subida, então copie manualmente as três linhas novas do `apps/api/.env.example`. Depois de editar o `.env`, reinicie a API para ler as variáveis: `docker compose -f docker-compose.dev.yaml restart api`.

A disponibilidade e a cota da camada gratuita variam por modelo e por dia: se o modelo devolver `Indisponivel` (503) ou `LimiteDeUso` (429), espere ou troque `AI_MODEL` (ver `research.md`, item 3).

## 2. Análise com sucesso (US1)

```bash
docker compose -f docker-compose.dev.yaml exec api php artisan tinker
```

```php
(new \App\Ai\Agents\DataAnalyst)->analisar('Vendas caíram 12% em outubro. O estoque do produto A está parado há 60 dias e o atendimento teve 30 reclamações de atraso.');
```

Esperado: array com `resumo`, `pontos_principais` e `planos_de_acao` preenchidos (ver `contracts/data-analyst.md`), em até 60 segundos. Repita com outro texto e confira que a resposta muda.

## 3. Falhas tratadas (US2)

Para não alterar o `.env` real nem imprimir a chave, troque a configuração só no comando, com `-e` (a variável de ambiente do processo vale mais que o `.env`). Use um arquivo com o trecho PHP abaixo ou o `tinker` interativo:

```php
try { (new \App\Ai\Agents\DataAnalyst)->analisar(getenv('TEXTO') ?: 'teste'); }
catch (\App\Ai\Exceptions\AnaliseFalhouException $e) { echo $e->tipo->name, ' | ', $e->getMessage(); }
```

Cenários, cada um em um processo (`docker compose -f docker-compose.dev.yaml exec -e VAR=valor api php artisan tinker --execute="..."`):

| Variável de ambiente no comando | Tipo esperado |
|---|---|
| `GEMINI_API_KEY=chave-invalida` | `Autenticacao` |
| `GEMINI_API_KEY=` (vazia) | `ConfiguracaoAusente`, sem chamar o provedor |
| `TEXTO="   "` | `EntradaVazia`, sem chamar o provedor |
| `AI_MODEL=modelo-que-nao-existe` | `ModeloInvalido` |

Todos devem devolver uma mensagem em português, diferente por tipo, sem exceção crua, sem a chave e sem URL.

`LimiteDeUso` (429) e `Indisponivel` (503) aparecem sozinhos na camada gratuita quando a cota ou o modelo estão no limite, e foram observados assim. `TempoEsgotado` e `RespostaVazia` não dá para provocar de forma confiável contra o provedor real; conferem-se pelo mapeamento no código e, no item 6, por testes com fake.

Depois dos casos acima, repita o passo 2: deve funcionar na primeira tentativa, sem reiniciar a API (SC-006).

## 4. Segredos e logs

```bash
git status --short                                   # apps/api/.env não aparece
K="$(grep '^GEMINI_API_KEY=' apps/api/.env | cut -d= -f2-)"
grep -cF -- "$K" apps/api/storage/logs/laravel.log   # 0 ocorrências da chave nos logs
git ls-files -co --exclude-standard | xargs grep -lF -- "$K" | wc -l   # 0 arquivos com a chave
unset K
grep 'Falha ao analisar' apps/api/storage/logs/laravel.log | tail -3   # só o tipo da falha
```

Esperado: nenhuma ocorrência da chave no git, nos logs e nas mensagens de erro dos passos 2 e 3, e os logs de falha trazem apenas o tipo (por exemplo `{"tipo":"autenticacao"}`).

## 5. Trocar o modelo por configuração (US3)

Altere `AI_MODEL` no `apps/api/.env` para outro modelo gratuito (por exemplo `gemini-flash-lite-latest`), reinicie a API, repita o passo 2 e confirme que funciona sem mexer em código. Volte ao valor original depois.

## 6. Não regressão

`curl http://localhost:8002/api/health` continua devolvendo `200 {"status":"ok"}` e `http://localhost:3002` continua abrindo.
