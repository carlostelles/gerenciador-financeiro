---
name: test-driven-development
description: 'Escrever e executar testes unitários, de integração e e2e usando Jest (backend NestJS, frontend Angular). Use quando: adicionar nova lógica que precisa de cobertura de testes, praticar TDD (teste primeiro), corrigir um bug (teste de regressão), ou verificar comportamento antes/depois de uma refatoração.'
---

# TDD & Estratégia de Testes

## Quando Usar
- Implementar nova lógica de negócio (services, pipes, guards, componentes)
- Corrigir um bug — escreva primeiro um teste que falhe e reproduza o problema
- Refatorar — garanta que os testes existem e passam antes e depois da mudança
- Revisar lacunas de cobertura de testes antes do merge

## Procedimento

1. **Identifique o nível do teste**:
   - Teste unitário: lógica pura, uma única classe/função, dependências mockadas (`*.spec.ts` ao lado do código-fonte em `api/src` ou `web/src`)
   - Integração/e2e: ciclo completo de request/response contra um BD real/de teste (`api/test/*.e2e-spec.ts`)
   - Teste de componente: renderização/comportamento de componente Angular (Jest + utilitários de teste do Angular); ao testar telas que usam componentes Taiga UI (https://taiga-ui.dev/getting-started), interaja com eles pela API pública do componente/harness, não por seletores de DOM internos da biblioteca.
2. **Escreva o teste primeiro quando prático** (red-green-refactor):
   - Vermelho: escreva um teste que falha, expressando o comportamento desejado
   - Verde: escreva o código mínimo para passar
   - Refatorar: limpe o código mantendo os testes passando
3. **Cubra o essencial de cada unidade**:
   - Caminho feliz
   - Casos extremos (vazio/null, valores limite, valores zero/negativos para lógica financeira)
   - Caminhos de erro (entrada inválida, acesso não autorizado, não encontrado)
4. **Faça mock dos limites externos** (BD, HTTP, tempo/`Date.now`) em testes unitários; use dependências reais apenas em testes e2e.
5. **Execute a suíte de testes relevante** após as mudanças:
   - Backend: `npm test` / `npm run test:e2e` dentro de `api/`
   - Frontend: `npm test` dentro de `web/`
6. **Verifique a cobertura** apenas onde for significativo — 100% de cobertura não é o objetivo; asserções significativas sobre o comportamento são.

## Boas Práticas
- Teste comportamento, não detalhes de implementação (evite fazer asserções sobre internos privados).
- Um foco lógico de asserção por teste; use nomes de teste descritivos (`it('deve rejeitar valor negativo de movimentação', ...)`).
- Para cálculos financeiros, sempre teste explicitamente os casos extremos de arredondamento/precisão.
- Mantenha os testes e2e isolados (estado do BD limpo entre testes, evite dependência de ordem).

## Armadilhas Comuns
- Escrever testes que espelham a implementação tão de perto que quebram em qualquer refatoração sem detectar bugs reais.
- Pular testes de caminhos negativos/de erro, testando apenas o caminho feliz.
- Testes e2e instáveis (flaky) devido a estado mutável compartilhado ou dependência de timers/datas reais.
- Adicionar testes depois de ouvir que a cobertura está "boa o suficiente" sem verificar se eles realmente exercitam a nova lógica.
