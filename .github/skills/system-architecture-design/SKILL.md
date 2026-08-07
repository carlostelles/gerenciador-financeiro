---
name: system-architecture-design
description: 'Desenhar ou avaliar a arquitetura de sistema/módulo, incluindo camadas, limites de módulo, e registros de decisão arquitetural (ADRs). Use quando: introduzir um novo módulo/serviço, escolher entre padrões arquiteturais, avaliar trade-offs, ou documentar uma decisão técnica significativa.'
---

# Design de Arquitetura de Sistema

## Quando Usar
- Adicionar um novo módulo de backend (NestJS) ou módulo de feature do frontend (Angular) que precisa de limites claros
- Escolher entre abordagens concorrentes (ex.: processamento síncrono vs. assíncrono, monólito vs. serviço separado, REST vs. GraphQL)
- Uma decisão será difícil/cara de reverter depois (formato de schema, estratégia de autenticação, escolha de framework)
- Documentar *por que* uma escolha técnica não óbvia foi feita

## Procedimento

1. **Mapeie a arquitetura atual** — identifique as camadas/módulos existentes relevantes para a mudança (ex.: `api/src/modules/<domínio>/{controller,service,dto,entity}`, `web/src/app/<feature>/`). Use `semantic_search`/`list_dir` para confirmar as convenções em vez de presumir.
2. **Liste as restrições**: stack existente (NestJS, TypeORM/Prisma, Angular, MySQL, Docker/nginx), tamanho da equipe, requisitos de performance/segurança.
3. **Gere de 2 a 3 opções viáveis** com trade-offs explícitos (complexidade, performance, manutenibilidade, custo de migração). Evite apresentar apenas uma opção para decisões não triviais.
4. **Escolha a opção que se encaixa nas convenções existentes**, a menos que haja um forte motivo para desviar — consistência supera otimização local.
5. **Defina os limites do módulo**: entradas/saídas, dependências permitidas (ex.: controllers dependem de services, services dependem de repositories — nunca o contrário), e o que permanece privado vs. exportado.
6. **Registre a decisão** como um ADR se ela for significativa e difícil de reverter (veja o template abaixo). Crie esse arquivo apenas se o usuário pedir documentação ou a decisão for arquiteturalmente significativa.

## Template de ADR

```markdown
# ADR-<NNN>: <Título>

## Status
Proposto | Aceito | Substituído

## Contexto
<o problema e as restrições>

## Decisão
<o que foi escolhido>

## Consequências
- Positivas: ...
- Negativas / trade-offs: ...

## Alternativas Consideradas
- <opção> — rejeitada porque ...
```

## Boas Práticas
- Favoreça a arquitetura mais simples que satisfaça os requisitos atuais; não projete para uma escala futura hipotética (YAGNI).
- Mantenha o acoplamento entre módulos baixo: módulos de domínio devem se comunicar através de interfaces de serviço bem definidas, não acessando os internos uns dos outros.
- Neste monorepo, mantenha as responsabilidades de `api/` e `web/` separadas — sem imports diretos entre eles; a comunicação é apenas via API HTTP.
- Use injeção de dependência de forma consistente (providers do NestJS, services do Angular) em vez de instanciação manual.
- Em qualquer módulo/feature do `web/` (Angular), a camada de apresentação deve ser construída com componentes da biblioteca [Taiga UI](https://taiga-ui.dev/getting-started) (`@taiga-ui/core`, `@taiga-ui/kit`, `@taiga-ui/layout`, `@taiga-ui/addon-*`) — não introduza HTML nativo estilizado manualmente nem outra biblioteca de componentes concorrente.

## Armadilhas Comuns
- Over-engineering: adicionar camadas de abstração/interfaces para uma única implementação sem um segundo caso de uso previsto no curto prazo.
- Desvio arquitetural silencioso: introduzir um novo padrão inconsistente com o restante do código sem discussão.
- Pular ADRs para decisões custosas de reverter (ex.: mecanismo de autenticação, escolha de BD, quebra de contratos de API).
