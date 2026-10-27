# Implementation Plan: Tela de análise de dados

**Branch**: `feat/enviroment` (branch atual; o script reporta `004-tela-de-analise` a partir de `.specify/feature.json`) | **Date**: 2026-10-27 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-tela-de-analise/spec.md`

## Summary

Substituir a página inicial padrão do Next.js por uma única tela com `textarea` e botão "Analisar Dados". O envio é um `fetch` `POST` para `${NEXT_PUBLIC_API_URL}/api/processar-dados` (contrato do item 4), feito por uma função pequena e tipada que devolve a análise ou lança um erro com mensagem em português. Um componente cliente controla os estados (ocioso, carregando, sucesso, erro), bloqueia envio duplicado, valida vazio/10.000 caracteres antes de chamar a API e mostra o resultado como texto puro com quebras de linha preservadas. Sem dependências novas, sem alterações na API.

## Technical Context

**Language/Version**: TypeScript 5, React 19.3, Next.js 16.4.3 (App Router), Node 24 (container)

**Primary Dependencies**: nenhuma nova; `fetch` nativo do navegador, CSS Modules já presentes

**Storage**: N/A (nada é persistido; a análise vive no estado do componente)

**Testing**: verificação manual contra a stack real (quickstart) + `npm run lint` e `tsc --noEmit` no container. Testes automatizados do fluxo ficam no item 6 (a função de chamada à API é isolada para facilitar o mock)

**Target Platform**: navegador moderno; Next.js em Docker (`docker-compose.dev.yaml`)

**Project Type**: web application (monorepo; só `apps/web` muda)

**Performance Goals**: feedback de "Processando com IA..." imediato ao clique; a latência da análise é a do provedor

**Constraints**: sem segredos no cliente (`NEXT_PUBLIC_API_URL` guarda só a URL pública da API); URL nunca fixa no código; conteúdo da API exibido como texto puro; envio duplicado impossível; espera máxima de 60 s no cliente

**Scale/Scope**: 1 página, 1 componente cliente, 1 módulo de acesso à API, ~200 linhas

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Avaliação |
|---|---|
| I. Simplicidade | Passa. Sem biblioteca de estado, de formulário, de UI ou de Markdown; um `useState`. A divisão em dois arquivos (componente + chamada à API) tem uso imediato: manter a tela legível e dar ao item 6 um ponto único para mockar. |
| II. Fluxo ponta a ponta | Passa. Esta feature é justamente o elo que falta: tela → API → Gemini → tela. |
| III. Chave só no backend | Passa. A web só conhece a URL da API do projeto; nenhum segredo em `NEXT_PUBLIC_*`; a web nunca fala com o Gemini. |
| IV. IA isolada | Passa. Nenhuma lógica de IA na web; ela só consome o contrato HTTP. |
| V. Testes proporcionais | Passa com ressalva. O fluxo principal é verificado manualmente aqui; o teste automatizado da web é o item 6 do backlog, já previsto na spec (Assumptions). |
| Stack e restrições | Passa. Tudo no Docker, textos em pt-BR, portas inalteradas. |

Nenhuma violação; a tabela de Complexity Tracking não é necessária.

**Re-check pós-design**: sem mudanças; o design não adicionou dependências nem camadas.

## Project Structure

### Documentation (this feature)

```text
specs/004-tela-de-analise/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── tela-de-analise.md   # contrato de UI: textos, estados, mapeamento de erros
├── checklists/
│   └── requirements.md
└── tasks.md                 # gerado por /speckit-tasks
```

### Source Code (repository root)

```text
apps/web/
├── .env.example             # novo: NEXT_PUBLIC_API_URL
├── .gitignore               # ajuste: !.env.example (hoje `.env*` o ignoraria)
└── app/
    ├── layout.tsx           # título/descrição em pt-BR, lang="pt-BR"
    ├── page.tsx             # reescrito: renderiza <Analisador />
    ├── page.module.css      # reescrito: estilos da tela
    ├── analisador.tsx       # novo: componente cliente ('use client') com o estado e a UI
    └── lib/
        └── api.ts           # novo: analisarTexto(), tipos e ErroDeAnalise
README.md                    # raiz: seção de uso da tela
docs/ideias.md               # marcar o item 5 como implementado
```

**Structure Decision**: aplicação web existente em `apps/web`; mudanças só ali, mais documentação. Os arquivos de boilerplate em `public/` (logos do Next/Vercel) deixam de ser usados, mas não são removidos para manter o diff cirúrgico.

## Decisões de design

- **Componente cliente**: precisa de estado e eventos, então usa `'use client'`; `page.tsx` continua server component e só o renderiza.
- **Leitura da URL**: `process.env.NEXT_PUBLIC_API_URL` referenciado de forma literal (consultas dinâmicas não são substituídas pelo Next). Se ausente, a tela mostra "A URL da API não está configurada." em vez de chamar um endereço adivinhado.
- **Bloqueio de duplo envio**: `disabled` no botão e no campo durante o envio, mais um `useRef` que descarta submissões enquanto uma está em andamento (cobre Enter/duplo clique antes da re-renderização).
- **Timeout**: `AbortSignal.timeout(60_000)`; ao estourar, mensagem de demora. Valor registrado em research.
- **Validação local**: espelha o contrato (aparar espaços → vazio; `> 10000` caracteres contados por pontos de código com `[...texto].length`, igual à contagem da API em caracteres). Mensagens iguais às da API.
- **Resposta**: validada no cliente (`resumo` string; `pontos_principais` e `planos_de_acao` arrays de string); qualquer desvio vira "A resposta do servidor veio em um formato inesperado."
- **Exibição**: React escapa texto por padrão (sem `dangerouslySetInnerHTML`); `white-space: pre-wrap` preserva as quebras.
- **Acessibilidade**: `label` ligado ao `textarea`; erro em `role="alert"`; botão com `aria-busy`; resultado em região com título.
