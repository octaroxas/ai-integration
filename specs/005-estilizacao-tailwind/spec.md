# Feature Specification: Estilização da web com Tailwind CSS

**Feature Branch**: `feat/enviroment` (branch atual; nenhuma branch nova foi criada)

**Created**: 2026-10-27

**Status**: Draft

**Input**: User description: "Adotar o Tailwind CSS (versão estável mais recente) como solução de estilização de `apps/web`, substituindo os CSS Modules usados pela tela de análise (`app/page.module.css`) e pelo CSS global do template (`app/globals.css`), sem mudar comportamento nem textos da tela de análise (spec 004). O visual e a legibilidade em tema claro e escuro e em telas estreitas devem ser preservados ou melhorados. Tudo deve funcionar no Docker de desenvolvimento, sem exigir Node no host. Justificativa registrada para o princípio I da constituição: o usuário pediu explicitamente o Tailwind para a estilização do projeto."

## Justificativa (princípio I da constituição)

O princípio I proíbe adicionar abstrações sem necessidade registrada na spec. A necessidade aqui é uma decisão do dono do projeto: ele pediu explicitamente que a estilização da web use o Tailwind CSS, tanto por preferência quanto como estudo da ferramenta. A feature não muda o produto; troca apenas a forma de estilizar. Por isso o escopo é o menor possível: migrar o que já existe e não acrescentar telas, componentes nem biblioteca de componentes.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A tela continua igual, agora estilizada com Tailwind (Priority: P1)

O usuário abre a tela de análise e a usa exatamente como antes (colar texto, enviar, ver o resultado ou o erro). Visualmente ela está equivalente ou melhor, mas toda a estilização vem do Tailwind CSS, e os estilos antigos (CSS Modules e CSS global do template) deixam de existir.

**Why this priority**: é o objetivo da feature. Sem a migração completa da tela existente, o Tailwind não estaria de fato adotado.

**Independent Test**: com a stack no ar, abrir a tela e percorrer os cenários do quickstart da spec 004 (carregando, resultado, erro, validação). Cada cenário se comporta e se lê como antes, e o código da web não contém mais arquivos de estilo antigos.

**Acceptance Scenarios**:

1. **Given** a tela migrada, **When** o usuário cola um texto e clica em "Analisar Dados", **Then** o fluxo (carregando, resultado, erro, validação) funciona e exibe os mesmos textos da spec 004.
2. **Given** a tela migrada, **When** o desenvolvedor lista os arquivos de estilo de `apps/web`, **Then** não há CSS Modules, e o único CSS próprio é o arquivo global que ativa o Tailwind e define o tema.
3. **Given** a tela migrada, **When** o desenvolvedor busca estilos escritos à mão para os elementos da tela, **Then** a estilização dos elementos está nas classes utilitárias do Tailwind.
4. **Given** o resultado, o erro e o contador de caracteres, **When** exibidos, **Then** mantêm a distinção visual da spec 004 (erro em destaque, contador em cor de alerta acima do limite, texto do resultado com quebras de linha preservadas).

---

### User Story 2 - Tema claro e escuro e telas estreitas continuam legíveis (Priority: P2)

O usuário vê a tela legível tanto com o sistema em tema claro quanto em tema escuro, e em telas estreitas (celular) sem rolagem horizontal da página.

**Why this priority**: preserva a qualidade que a tela já tinha; é uma regressão fácil de introduzir ao trocar a estilização. Depende da migração (US1).

**Independent Test**: alternar a preferência de tema do sistema e redimensionar a janela até 320 px de largura, conferindo legibilidade, contraste do texto, visibilidade do foco e ausência de rolagem horizontal.

**Acceptance Scenarios**:

1. **Given** o sistema em tema escuro, **When** a tela é aberta, **Then** fundo, texto, campo, botão, erro e resultado ficam legíveis, com o texto principal em contraste suficiente (pelo menos 4,5:1).
2. **Given** o sistema em tema claro, **When** a tela é aberta, **Then** o mesmo vale.
3. **Given** uma janela de 320 px de largura, **When** a tela é aberta, **Then** não há rolagem horizontal e o campo, o contador e o botão cabem sem sobreposição.
4. **Given** a navegação por teclado, **When** o usuário passa pelo campo e pelo botão, **Then** o foco aparece de forma visível.

---

### User Story 3 - Subir e desenvolver com Tailwind só no Docker (Priority: P3)

O desenvolvedor sobe a stack com `docker compose` e a web compila o Tailwind sem exigir Node, nem qualquer outra ferramenta, na máquina host. Alterar uma classe na tela reflete no navegador sem reiniciar o container.

**Why this priority**: a constituição exige que tudo rode em Docker. Depende da US1 para ter o que compilar.

**Independent Test**: a partir de um ambiente limpo (volumes recriados), `docker compose -f docker-compose.dev.yaml up -d --build` sobe a web; a tela abre estilizada; editar uma classe de cor no componente atualiza a tela em até alguns segundos.

**Acceptance Scenarios**:

1. **Given** volumes limpos, **When** o desenvolvedor sobe a stack, **Then** a web inicia sem erro e a tela abre já estilizada.
2. **Given** a stack no ar, **When** o desenvolvedor edita uma classe de estilo no componente da tela, **Then** a mudança aparece no navegador sem reiniciar o container.
3. **Given** a máquina host sem Node, **When** o desenvolvedor executa o lint e a checagem de tipos pelo Docker, **Then** ambos passam.

---

### Edge Cases

- A preferência de tema do sistema muda com a página aberta: a tela acompanha sem recarregar.
- Classes de estilo geradas dinamicamente a partir de texto montado em tempo de execução (por exemplo, nome de cor concatenado) não funcionam com o Tailwind; as classes usadas devem aparecer completas no código.
- Texto muito longo no resultado, ou uma palavra sem espaços (URL, por exemplo): quebra dentro da área, sem estourar a largura.
- Cache de build antigo (volume `.next`) com os estilos anteriores: após a migração, o desenvolvedor não deve ver estilos velhos misturados; o quickstart indica como limpar quando necessário.
- Navegador sem suporte ao recurso mais recente de CSS que o Tailwind usa: a tela segue legível (degradação aceitável); navegadores-alvo são as versões atuais dos principais navegadores.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A web MUST usar o Tailwind CSS, na versão estável mais recente disponível quando a feature for implementada, como única solução de estilização.
- **FR-002**: A tela de análise MUST ser estilizada por classes utilitárias do Tailwind nos próprios componentes; MUST NOT restar CSS Modules em `apps/web`.
- **FR-003**: O CSS global MUST se limitar ao necessário para ativar o Tailwind e definir o tema (cores de fundo e texto, tema claro e escuro, fonte); os estilos do template que a tela não usa MUST ser removidos.
- **FR-004**: O comportamento, os textos e a estrutura acessível da spec 004 (rótulos, `role="alert"`, `aria-busy`, `aria-describedby`, `aria-label` do resultado) MUST ser preservados sem alteração.
- **FR-005**: O visual MUST ser equivalente ou melhor ao atual: coluna central de leitura, campo de texto com borda e foco visível, botão com estados normal, de passar o mouse, desabilitado e de foco, bloco de erro em destaque, contador que muda de cor acima do limite, e resultado em três blocos com quebras de linha preservadas.
- **FR-006**: A tela MUST seguir a preferência de tema claro ou escuro do sistema e MUST manter o texto principal com contraste de pelo menos 4,5:1 nos dois temas.
- **FR-007**: A tela MUST funcionar, sem rolagem horizontal da página, em larguras a partir de 320 px.
- **FR-008**: O Tailwind MUST compilar dentro do Docker de desenvolvimento, sem exigir Node ou outra ferramenta no host; `package.json` e `package-lock.json` MUST ficar consistentes e versionados.
- **FR-009**: Alterações de classes nos componentes MUST refletir no navegador sem reiniciar o container.
- **FR-010**: `npm run lint` e a checagem de tipos MUST passar no container depois da migração.
- **FR-011**: A feature MUST NOT alterar a API, o contrato HTTP nem a lógica de `app/lib/api.ts`; mudanças em componentes MUST se limitar à estilização.
- **FR-012**: A documentação (README e backlog) MUST registrar que a web usa Tailwind e como o estilo é organizado.

### Key Entities

Não há dados envolvidos: a feature só muda a forma de estilizar. Os elementos visuais afetados são o campo de texto, o contador de caracteres, o botão, o bloco de erro e o bloco de resultado da tela de análise.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% dos cenários de comportamento da spec 004 (carregando, resultado, erro, validação, duplo envio) continuam passando depois da migração, sem mudança de texto.
- **SC-002**: Em `apps/web`, a quantidade de arquivos de CSS Modules é zero e o CSS global ocupa uma única folha curta (poucas dezenas de linhas).
- **SC-003**: O texto principal tem contraste de pelo menos 4,5:1 em tema claro e em tema escuro.
- **SC-004**: Em larguras de 320 px a 1440 px, a página nunca tem rolagem horizontal.
- **SC-005**: Uma alteração de estilo em um componente aparece no navegador em até 5 segundos, sem reiniciar o container.
- **SC-006**: A stack sobe a partir de volumes limpos, sem Node no host, e a tela abre estilizada na primeira tentativa.

## Assumptions

- A versão do Tailwind é a estável mais recente na hora da implementação (hoje 4.3.3, conferida no registro de pacotes); o plano registra a versão fixada.
- Escopo: somente `apps/web`. A API, o Compose e o contrato HTTP não mudam, salvo se o build exigir ajuste mínimo no volume ou no entrypoint, a ser justificado no plano.
- Só a tela de análise e o layout raiz existem; não há outras páginas a migrar. Os arquivos de boilerplate em `public/` não são estilo e ficam fora do escopo.
- Sem biblioteca de componentes, sem plugins do Tailwind e sem tema de design além de cores e fonte; princípio I.
- Navegadores-alvo: versões atuais dos principais navegadores (o Tailwind atual depende de recursos recentes de CSS).
- O tema segue a preferência do sistema; um botão manual de alternar tema fica fora do escopo.
- Os testes automatizados do fluxo da tela continuam no item 6 do backlog; a verificação aqui reaproveita os cenários da spec 004 (inclusive o roteiro de navegador usado naquela feature) mais a conferência visual.
