# Contrato: `GET /api/health`

Única interface HTTP nova da feature. A página inicial do Next.js em `http://localhost:3002` é conteúdo padrão do gerador e não tem contrato.

## Requisição

- Método e caminho: `GET /api/health`
- URL em desenvolvimento: `http://localhost:8002/api/health` (porta pelo `APP_PORT` do `.env` da raiz)
- Corpo, parâmetros e autenticação: nenhum.

## Resposta de sucesso

- Status: `200 OK`
- `Content-Type: application/json`
- Corpo:

```json
{ "status": "ok" }
```

## Comportamento

- Não consulta o banco nem serviços externos: responde enquanto a aplicação estiver no ar (clarificação de 2026-10-27).
- Não depende das migrações terem rodado.
- Sem erros definidos além dos genéricos do framework (por exemplo `404` em caminho errado).
