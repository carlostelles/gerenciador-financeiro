---
name: ux-design
description: 'Atuar como UX Designer: projetar fluxos de usuário, wireframes/especificações de tela, estados de interação, e usabilidade para o app web Angular usando a biblioteca de componentes Taiga UI. Use quando: desenhar uma nova tela ou fluxo de usuário, avaliar a usabilidade de uma funcionalidade existente, definir navegação/arquitetura de informação, especificar estados de validação/erro/vazio/carregamento de formulário, escolher componentes Taiga UI para uma tela, ou melhorar acessibilidade e experiência mobile.'
---

# UX Design

## Quando Usar
- Antes de implementar uma nova tela/fluxo no `web/` (Angular) — definir a experiência antes do código
- Avaliar usabilidade de uma funcionalidade existente (fricção, cliques desnecessários, feedback confuso)
- Definir arquitetura de informação/navegação de um novo módulo
- Especificar estados de formulário: validação, erro, vazio, carregando, sucesso
- Melhorar acessibilidade e experiência mobile de uma tela existente
- Escolher/especificar componentes de UI para qualquer tela nova ou alterada em `web/` (SEMPRE via Taiga UI, nunca HTML nativo ou biblioteca concorrente)

## Procedimento

1. **Entender o usuário e o objetivo da tela** — identifique o perfil do usuário (pessoa física controlando receitas/despesas) e a tarefa que ele precisa completar. Use as regras de negócio já levantadas pela skill `systems-analysis` como insumo, sem redefini-las.
2. **Mapear o fluxo atual (se existir)** — use `semantic_search`/`list_dir` em `web/src/app/**` para entender componentes, rotas e padrões de UI já estabelecidos, e liste quais componentes Taiga UI (`@taiga-ui/core`, `@taiga-ui/kit`, `@taiga-ui/layout`, `@taiga-ui/addon-*`) já são usados em telas semelhantes antes de propor algo novo.
3. **Desenhar o fluxo de usuário** (user flow) como uma sequência de telas e decisões, cobrindo:
   - Estado inicial (tela vazia, sem dados)
   - Caminho feliz (criar/editar/visualizar um registro financeiro)
   - Estados de erro e validação (valores inválidos, campos obrigatórios, limites excedidos)
   - Estados de carregamento e feedback de sucesso/erro (toasts, mensagens inline)
4. **Especificar a tela/componente** em termos de estrutura, não apenas visual:
   - Hierarquia de informação (o que é mais importante ver primeiro — ex.: saldo atual antes da lista de transações)
   - Ações primárias vs. secundárias (botão principal claro, ações destrutivas com confirmação)
   - Responsividade (mobile-first, já que é um app financeiro pessoal usado no celular)
5. **Definir mensagens de erro e microcopy** de forma amigável e específica (evitar "erro genérico"; ex.: "O valor da movimentação deve ser maior que zero").
6. **Considerar acessibilidade**: contraste, tamanho de toque em mobile, labels associados a inputs, navegação por teclado, uso de `aria-*` quando necessário.
7. **Validar consistência com o design system existente** do projeto (cores, espaçamento, componentes reutilizáveis em `web/src/app/**`) em vez de introduzir um novo padrão visual isolado.
8. **Especificar cada elemento de UI como um componente Taiga UI concreto** (ver seção "Biblioteca de Componentes" abaixo) — nunca deixe a especificação genérica a ponto de a implementação recorrer a `<button>`, `<input>`, `<select>` nativos ou outra lib de UI.
9. **Entregar a especificação** (ver template abaixo) antes de implementar, especialmente para fluxos novos ou complexos — permite alinhamento rápido sem retrabalho de código.

## Biblioteca de Componentes (Taiga UI) — Obrigatório

Este projeto usa [Taiga UI](https://taiga-ui.dev/getting-started) como biblioteca de componentes padrão do `web/` (já presente em `web/package.json`: `@taiga-ui/core`, `@taiga-ui/kit`, `@taiga-ui/layout`, `@taiga-ui/cdk`, `@taiga-ui/icons`, `@taiga-ui/addon-charts`, `@taiga-ui/addon-table`, `@taiga-ui/addon-mobile`, `@taiga-ui/addon-commerce`, entre outros). **Toda especificação de UI e toda implementação de tela devem usar componentes Taiga UI**, nunca elementos HTML nativos estilizados manualmente ou outra biblioteca de componentes.

- **Botões/ações** → `tuiButton` (nunca `<button>` estilizado manualmente).
- **Inputs de texto/número/moeda** → `tuiTextfield`/`tuiInputNumber` (`@taiga-ui/kit`) — use os inputs de moeda/número do kit para valores financeiros em vez de `<input>` cru.
- **Datas** → `tuiInputDate`/`tuiInputDateTime` (`@taiga-ui/kit`) em vez de `<input type="date">`.
- **Seleção/dropdown** → `tuiSelect`/`tuiDataList` (`@taiga-ui/kit`) em vez de `<select>`.
- **Tabelas/listas de movimentações** → `@taiga-ui/addon-table` em vez de `<table>` customizada.
- **Gráficos** (dashboards, relatórios) → `@taiga-ui/addon-charts`.
- **Cartões/containers** → `tuiCard`/`tuiSurface` (`@taiga-ui/core`/`@taiga-ui/layout`).
- **Notificações/feedback** → `tuiNotification`/`TuiAlertService` (`@taiga-ui/core`) para toasts de sucesso/erro em vez de mensagens inline customizadas.
- **Diálogos de confirmação** (ações destrutivas) → `TuiDialogService`/`tuiDialog` (`@taiga-ui/core`).
- **Ícones** → `@taiga-ui/icons` em vez de SVGs soltos ou outra lib de ícones.
- **Loading/skeleton** → `tuiLoader`/`tuiSkeleton` (`@taiga-ui/kit`) para estados de carregamento.
- **Layout responsivo/mobile** → `@taiga-ui/addon-mobile` e os utilitários de `@taiga-ui/layout`, já que o app é mobile-first.

Ao especificar a tela (template abaixo) ou revisar uma implementação, **nomeie o componente Taiga UI esperado para cada elemento** (ex.: "campo de valor → `tuiInputNumber` com formatação de moeda") em vez de descrever apenas visualmente ("um campo numérico"). Se um componente necessário não existir em Taiga UI, documente explicitamente essa exceção e a justificativa antes de usar HTML nativo ou outra lib.

## Template de Saída

```markdown
## Objetivo do Usuário
<o que o usuário quer alcançar nesta tela/fluxo>

## Fluxo de Telas
1. <tela/estado> → ação → <próxima tela/estado>
2. ...

## Estados da Tela
- Vazio: <o que mostrar quando não há dados>
- Carregando: <indicador>
- Erro: <mensagem e ação de recuperação>
- Sucesso: <feedback ao usuário>

## Componentes e Hierarquia
- Ação primária: <ex.: "Adicionar movimentação" → `tuiButton`>
- Ações secundárias: <ex.: filtros, exportar → `tuiButton` variante secundária>
- Informação em destaque: <ex.: saldo, alertas de orçamento>

## Componentes Taiga UI por Elemento
- <elemento da tela>: <componente Taiga UI, ex.: "valor da movimentação → `tuiInputNumber`">

## Microcopy / Mensagens
- <campo/ação>: "<texto amigável>"
```

## Boas Práticas
- Priorize clareza sobre densidade de informação — em um app financeiro, valores e saldos devem ser inequívocos (moeda, sinal, cor para positivo/negativo).
- Reutilize componentes/padrões já existentes em `web/src/app/**` em vez de recriar variações visuais para o mesmo propósito.
- **Sempre use componentes Taiga UI** (https://taiga-ui.dev/getting-started) para qualquer elemento de interface — botões, inputs, tabelas, diálogos, notificações, ícones, loaders — nunca HTML nativo estilizado manualmente ou outra biblioteca de componentes.
- Projete o estado vazio e o estado de erro com a mesma atenção que o caminho feliz — são os mais frequentemente esquecidos.
- Para ações destrutivas ou irreversíveis (excluir movimentação, zerar reserva), sempre exigir confirmação explícita via `TuiDialogService`.
- Pense mobile-first: a maioria dos usuários de apps financeiros pessoais acessa via celular; use `@taiga-ui/addon-mobile` quando aplicável.

## Armadilhas Comuns
- Pular direto para a implementação sem mapear o fluxo completo, gerando retrabalho quando um estado de erro/edge case é descoberto tarde.
- Ignorar estados vazios/carregamento/erro no design, deixando a implementação improvisar.
- Introduzir um padrão visual novo inconsistente com o restante do `web/` sem justificativa.
- **Usar elementos HTML nativos (`<button>`, `<input>`, `<select>`, `<table>`) ou outra biblioteca de UI em vez dos componentes Taiga UI equivalentes.**
- Mensagens de erro técnicas ou genéricas ("Erro 400") em vez de orientar o usuário sobre como corrigir.
- Esquecer acessibilidade básica (labels, contraste, foco de teclado) por considerá-la "opcional".
- Redefinir regras de negócio na camada de UX em vez de reutilizar o que já foi especificado pela skill `systems-analysis`.
