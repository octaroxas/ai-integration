---
name: speckit-spec-splitter
description: Avalia a descrição de uma feature (ou um spec.md já gerado) antes do /speckit.specify e decide se ela deve ser quebrada em duas ou mais specs menores, para que cada ciclo de revisão seja pequeno o bastante para ser feito de verdade. Use quando o usuário for criar uma nova spec no speckit, colar uma descrição de feature, pedir para "avaliar o tamanho da spec", "quebrar a spec" ou "dividir a feature".
---

# Speckit Spec Splitter

## Objetivo

Specs grandes demais tornam a revisão cansativa, e revisão cansativa acaba sendo pulada, o que gera retrabalho. Esta skill analisa a descrição de uma feature **antes** de ela virar spec e decide se vale quebrá-la em specs menores, cada uma revisável de uma vez, com escopo, contexto e tarefas reduzidos.

Ela **recomenda**; quem decide é o usuário. Nunca rode `/speckit.specify` por conta própria depois da análise.

## Quando rodar

1. **Principal:** sobre a descrição que o usuário pretende passar ao `/speckit.specify`.
2. **Opcional:** de novo sobre o `spec.md` gerado, porque as user stories e os requisitos reais só aparecem ali. Se o usuário fornecer um `spec.md`, analise-o diretamente.

## Contexto do projeto

As specs são desenvolvidas com **frontend e backend juntos**. Portanto:

- A quebra é sempre em **fatias verticais**: cada spec resultante inclui o que for necessário de UI, API, regras de negócio e persistência para entregar valor sozinha.
- **Nunca** proponha quebra por camada (ex.: "spec do backend" e "spec do frontend") nem por tipo de artefato (ex.: "spec das migrations").
- Uma exceção só é aceitável se o usuário pedir explicitamente (ex.: infraestrutura compartilhada que várias fatias consomem, ver "Fundação compartilhada").

## Processo

1. **Entenda a feature.** Leia a descrição (ou o `spec.md`). Se faltar informação essencial para avaliar o escopo, faça no máximo 2 perguntas curtas; senão, siga com suposições explícitas.
2. **Se houver repositório acessível**, consulte rapidamente a estrutura (módulos, entidades existentes, telas relacionadas) para estimar o impacto real. Não faça varredura exaustiva.
3. **Levante os sinais de tamanho** (tabela abaixo) e conte quantos disparam.
4. **Identifique as fatias de valor:** quais são os fluxos de usuário independentes dentro da feature? O que é o "mínimo que já entrega valor" (P1)?
5. **Aplique os critérios de quebra** e decida: manter ou quebrar.
6. **Se quebrar**, monte as specs propostas, a ordem e as dependências.
7. **Apresente a saída** no formato definido abaixo e pergunte se o usuário aprova, ajusta ou prefere manter como está.

## Sinais de tamanho

Heurísticas ajustáveis. Dois ou mais sinais disparados indicam forte candidata à quebra; um sinal isolado pede julgamento.

| Sinal | Limiar de alerta |
|---|---|
| User stories independentes | mais de 3 |
| Requisitos funcionais estimados | mais de ~15 |
| Entidades de domínio novas ou alteradas | mais de 2 |
| Telas ou fluxos de UI distintos | mais de 2 |
| Endpoints ou casos de uso novos | mais de ~6 |
| Módulos ou contextos de negócio tocados | mais de 1 |
| Arquivos estimados a modificar | mais de ~15–20 |
| Tarefas estimadas no `tasks.md` | mais de ~25–30 |
| Descrição usa "e também", "além disso", "por fim" para juntar assuntos | 2 ou mais ocorrências |

## Critérios de quebra

Uma parte só deve virar spec própria se **todas** as condições abaixo forem verdadeiras:

1. **Entrega valor sozinha.** Um usuário consegue usar ou um revisor consegue validar essa parte sem as outras (fatia vertical, front + back).
2. **É testável de forma independente.** Os cenários de aceitação não dependem de a outra parte existir (ou dependem apenas de algo já entregue em spec anterior).
3. **Tem fronteira clara.** Dá para dizer em uma frase o que está dentro e o que está fora.
4. **Reduz o custo de revisão de verdade.** Cada spec resultante deve caber numa revisão de uma sentada. Se a quebra só gera mais burocracia sem diminuir o escopo, não quebre.

### Boas linhas de corte

- Por **user story / fluxo de usuário** (ex.: "cadastrar" vs "listar e filtrar" vs "exportar").
- Por **papel de usuário** (ex.: solicitante vs aprovador).
- Por **ciclo de vida da entidade** (criar → editar → arquivar/excluir).
- Por **contexto de negócio** distinto dentro da mesma feature.
- Por **prioridade:** P1 (núcleo) numa spec, P2/P3 (refinamentos) em specs seguintes.
- **Caminho feliz primeiro**, tratamento avançado de exceções, relatórios e automações depois.

### Linhas de corte proibidas

- Por camada técnica (backend / frontend / banco).
- Por tipo de artefato (migrations, DTOs, testes, estilos).
- Pedaços que sozinhos não podem ser exercitados por um usuário ou testados ponta a ponta.

### Fundação compartilhada

Se duas ou mais fatias dependem de uma mesma base (ex.: nova entidade central, permissão, integração), proponha **a menor fatia vertical possível que já entregue algo usável** e que sirva de base, em vez de uma spec "só de infraestrutura". Só proponha uma spec de fundação isolada se não houver nenhuma fatia usável viável, e justifique.

## Quando NÃO quebrar

- Poucos sinais disparados, e a feature cabe numa revisão confortável.
- A quebra geraria specs tão pequenas que o overhead (specify, plan, tasks, review) supera o ganho.
- As partes são tão acopladas que a validação só faz sentido em conjunto.
- Mudança pequena, correção de bug ou ajuste pontual.

Nesses casos, diga que **não recomenda quebrar**, explique em 1–2 frases e, se útil, aponte o que vale ficar de olho durante o `plan` e o `tasks`.

## Regras de dependência e ordem

- Ordene as specs de forma que cada uma possa ser implementada e revisada com base apenas nas anteriores.
- Marque dependências explicitamente (ex.: "Spec 2 depende da Spec 1: entidade X").
- Prefira a ordem que entrega valor mais cedo; deixe o que for refinamento para o final.
- Evite dependências circulares. Se aparecerem, a quebra está errada: reagrupe.

## Formato de saída

Responda em português, direto, neste formato:

```
## Veredito
[Manter como uma spec | Quebrar em N specs] — motivo em 1–2 frases.

## Sinais de tamanho
- [sinal]: [valor estimado] (alerta / ok)
...

## Specs propostas   (omitir se a recomendação for manter)

### Spec 1 — [nome curto]
- **Valor entregue:** ...
- **Dentro do escopo:** ...
- **Fora do escopo (fica para outras specs):** ...
- **Depende de:** nenhuma | Spec X
- **Tamanho esperado:** pequeno | médio
- **Descrição para o /speckit.specify:**
  > [texto pronto para colar, autossuficiente, descrevendo o QUE e o PORQUÊ, sem detalhes de implementação]

### Spec 2 — ...

## Ordem sugerida
1 → 2 → 3 (e por quê)

## Riscos da quebra
- [pontos de integração, decisões que precisam ser consistentes entre specs, etc.]

## Próximo passo
Aprovar, ajustar ou manter como uma spec?
```

## Regras para as descrições geradas

- Cada descrição deve **ser entendida sozinha**, sem precisar das outras. Repita o contexto mínimo necessário.
- Descreva **o quê e o porquê** (comportamento, valor, usuários), não o como (stack, arquitetura, bibliotecas).
- Inclua uma frase de fronteira, por exemplo: "Não inclui X, tratado na spec seguinte."
- Mantenha o vocabulário de domínio consistente entre as specs (mesmos nomes de entidades e papéis).
- Não invente requisitos que o usuário não mencionou. Se precisar supor algo, marque como suposição.

## Se estiver analisando um spec.md já gerado

- Use as user stories e prioridades (P1, P2, P3) como base natural de corte: cada story priorizada e independente é candidata a virar spec própria.
- Aponte quais requisitos funcionais, entidades e critérios de sucesso migram para cada nova spec.
- Avise o que precisa ser reescrito versus apenas movido, para o usuário não perder o que já foi revisado.

## Princípios

- O objetivo é **revisão feita com qualidade em cada ciclo**, não o maior número possível de specs.
- Na dúvida entre quebrar demais e de menos, prefira a quebra que mantém cada spec revisável de uma sentada.
- Seja franco: se a feature está bem dimensionada, diga isso.
