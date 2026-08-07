---
description: 'Executa o ciclo completo de desenvolvimento de uma feature, do levantamento de requisitos ao release, aplicando as skills do projeto em sequência e delegando cada fase a um subagente com ferramentas restritas.'
name: 'Nova Feature (Ciclo Completo)'
argument-hint: 'Descreva a feature a implementar, ex.: "adicionar filtro de movimentações por categoria"'
agent: 'dev-lifecycle'
---

# Nova Feature: ${input:descricao}

Você é responsável por conduzir esta feature através de **todo o ciclo de vida de desenvolvimento** do projeto, usando as skills documentadas em [.github/skills/README.md](../skills/README.md) e delegando cada fase ao subagente correspondente.

## Instruções

1. Crie uma lista de tarefas (`manage_todo_list`) com uma entrada por fase abaixo. Marque cada fase como `in-progress` antes de iniciá-la e `completed` assim que os critérios de saída forem atendidos — nunca pule uma fase.
2. Para cada fase, delegue ao subagente indicado (via ferramenta `agent`), passando o contexto acumulado (especificações, decisões, arquivos alterados) da fase anterior.
3. Se uma fase identificar ambiguidade ou risco (ex.: requisito não confirmado, decisão arquitetural significativa, vulnerabilidade), **pare e pergunte ao usuário** antes de prosseguir — não presuma.
4. Ao final, apresente um resumo consolidado: o que foi implementado, testes executados, decisões tomadas, e o estado do PR/commit.

## Fases e Skills

| # | Fase | Subagente | Skills aplicadas |
|---|------|-----------|-------------------|
| 1 | Descoberta e Design | `dev-fase-design` | `requirements-analysis`, `systems-analysis`, `ux-design`, `system-architecture-design`, `api-design`, `database-design` |
| 2 | Implementação | `dev-fase-implementacao` | `test-driven-development`, `refactoring` |
| 3 | Qualidade | `dev-fase-qualidade` | `code-review`, `security-review`, `performance-optimization` |
| 4 | Entrega | `dev-fase-entrega` | `git-workflow`, `ci-cd-pipeline`, `deployment-release`, `observability-monitoring`, `technical-documentation`, `dependency-management` |

Se um bug ou comportamento inesperado surgir em qualquer fase, aplique `debugging-systematic` antes de continuar.

## Critérios de Saída por Fase

- **Descoberta e Design**: objetivo, critérios de aceite, regras de negócio, fluxo de UX (se houver tela) e contrato de API/schema de dados definidos e confirmados com o usuário quando ambíguos.
- **Implementação**: código escrito seguindo TDD, testes unitários/e2e cobrindo caminho feliz + casos extremos, suíte de testes local passando.
- **Qualidade**: autorrevisão de código feita, checklist OWASP verificado, nenhum problema bloqueante em aberto.
- **Entrega**: commit(s) seguindo Conventional Commits, PR aberto com descrição clara (ou instruções de deploy, se aplicável), documentação atualizada apenas se necessário.

Comece pela fase 1 agora.
