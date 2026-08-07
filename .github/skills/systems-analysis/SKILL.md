---
name: systems-analysis
description: 'Atuar como Analista de Sistemas: traduzir necessidades de negócio em especificações funcionais, regras de negócio, fluxos de processo e relações de dados/entidades que fazem a ponte entre requisitos e implementação técnica. Use quando: detalhar regras de negócio de uma funcionalidade, mapear processos de negócio de ponta a ponta, definir relacionamentos de entidades e fluxo de dados, reconciliar necessidades conflitantes entre stakeholders, ou produzir especificações funcionais antes do design de arquitetura/API.'
---

# Análise de Sistemas

## Quando Usar
- Detalhar regras de negócio de uma funcionalidade (ex.: como um orçamento mensal é calculado, o que acontece quando uma reserva é resgatada)
- Mapear um processo de negócio ponta a ponta (ex.: ciclo de vida de uma movimentação: criação → categorização → impacto no saldo/orçamento)
- Definir relações entre entidades de negócio antes de desenhar o schema técnico (complementa `database-design`)
- Reconciliar necessidades conflitantes entre stakeholders/áreas (ex.: usuário quer flexibilidade, negócio quer consistência de dados)
- Produzir uma especificação funcional que sirva de ponte entre `requirements-analysis` e `system-architecture-design`/`api-design`

## Procedure

1. **Entender o processo de negócio como um todo** — não apenas a tela/endpoint isolado, mas o ciclo completo (ex.: como uma movimentação afeta saldo, orçamento e reservas simultaneamente).
2. **Levantar as regras de negócio explícitas e implícitas**:
   - Regras explícitas: o que foi pedido diretamente (ex.: "orçamento mensal não pode ser negativo")
   - Regras implícitas: o que é necessário para o sistema fazer sentido (ex.: o que ocorre com o orçamento se uma movimentação for editada/excluída após o fechamento do período)
3. **Mapear o fluxo do processo** usando um diagrama ou lista sequencial de passos, decisões e exceções — identifique todos os "ramos" (o que acontece em cada cenário alternativo).
4. **Definir entidades e relacionamentos de negócio** (não a modelagem técnica de tabelas, mas o significado): quem é o dono de cada dado, cardinalidade (um usuário tem N orçamentos por período), e invariantes que sempre devem ser verdadeiras.
5. **Identificar regras de consistência/integridade de negócio**: o que nunca pode acontecer (ex.: saldo duplicado, movimentação sem categoria, orçamento sem usuário).
6. **Resolver ambiguidades e conflitos** entre o que diferentes partes pediram, propondo a interpretação mais consistente com o domínio financeiro e o restante do sistema já implementado (`api/src/modules/**`).
7. **Produzir a especificação funcional** (ver template) para orientar quem vai desenhar API/banco (`api-design`, `database-design`) ou implementar (`test-driven-development`).

## Template de Saída

```markdown
## Processo de Negócio
<nome do processo, ex.: "Registro e categorização de movimentação">

## Passo a Passo
1. <ator> faz <ação> → sistema faz <reação>
2. ...

## Regras de Negócio
- RN01: <regra explícita ou implícita, com condição e efeito>
- RN02: ...

## Entidades Envolvidas e Relacionamentos
- <Entidade A> (1) — (N) <Entidade B>: <significado da relação>

## Exceções e Casos Especiais
- <cenário> → <comportamento esperado>

## Invariantes (sempre verdadeiro)
- <ex.: "Toda movimentação pertence a exatamente um usuário">
```

## Boas Práticas
- Baseie as regras de negócio em exemplos concretos (números reais de valores, datas, períodos) para evitar ambiguidade.
- Verifique consistência com regras já implementadas em `api/src/modules/**` antes de propor uma nova regra que possa conflitar.
- Separe claramente "regra de negócio" (o que deve acontecer) de "decisão técnica" (como implementar) — isso é papel do `system-architecture-design`/`api-design`.
- Para um sistema financeiro, sempre explicite regras de arredondamento, moeda e fuso horário — são fontes comuns de erro silencioso.

## Armadilhas Comuns
- Especificar apenas o caminho feliz do processo, deixando exceções para serem descobertas durante a implementação.
- Confundir regra de negócio com decisão de UI (isso é papel da skill `ux-design`) ou com decisão técnica de arquitetura.
- Não validar as regras levantadas com quem realmente conhece o domínio, assumindo interpretações próprias sem confirmação.
- Ignorar o impacto de uma regra nova sobre dados/processos já existentes (migração de dados legados, retrocompatibilidade).
