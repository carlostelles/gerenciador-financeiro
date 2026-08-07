---
name: dependency-management
description: 'Adicionar, atualizar e auditar dependências npm com segurança. Use quando: adicionar um novo pacote, atualizar dependências, resolver conflitos de versão, ou auditar vulnerabilidades conhecidas.'
---

# Gestão de Dependências

## Quando Usar
- Adicionar um novo pacote npm a `api/` ou `web/`
- Atualizar dependências existentes (incluindo mudanças de versão major)
- Investigar achados do `npm audit` ou um CVE reportado
- Resolver conflitos de dependências ou problemas de lockfile

## Procedimento

1. **Antes de adicionar uma nova dependência**, verifique se as dependências existentes já resolvem o problema (evite funcionalidade duplicada entre pacotes).
2. **Avaliar o pacote**: status de manutenção, downloads semanais, impacto no tamanho do bundle (especialmente para `web/`), e compatibilidade de licença.
3. **Instalar com o escopo correto**: use `--save` vs `--save-dev` corretamente (dependência de runtime vs. apenas para build/teste).
4. **Executar `npm audit`** após adicionar/atualizar pacotes; trate achados `high`/`critical` antes do merge. Entenda a correção (`npm audit fix`) antes de aplicá-la — verifique se ela não rebaixa silenciosamente uma funcionalidade necessária.
5. **Para atualizações de versão major**: leia o changelog/guia de migração, atualize uma dependência major por vez, e rode a suíte de testes completa após cada uma.
6. **Mantenha os lockfiles de `api/` e `web/` versionados** (`package-lock.json`) para que as instalações sejam reprodutíveis entre ambientes/builds Docker.
7. **Remova dependências não utilizadas** encontradas durante a limpeza em vez de deixar peso morto (verifique os imports reais via `grep_search` antes de remover).

## Boas Práticas
- Fixe ou use ranges com caret de forma consistente com a convenção do `package.json` do restante do projeto.
- Prefira pacotes bem mantidos e amplamente usados em vez de obscuros para funcionalidades sensíveis à segurança (autenticação, criptografia, validação).
- Reexecute os testes e faça uma verificação manual (smoke test) após qualquer atualização de dependência que afete pacotes centrais do framework (NestJS, Angular, TypeORM).

## Armadilhas Comuns
- Adicionar uma dependência pesada para um utilitário trivial que poderia ser algumas linhas de código.
- Ignorar avisos do `npm audit` ou rodar `npm audit fix --force` cegamente sem verificar mudanças destrutivas.
- Atualizar múltiplas versões major simultaneamente, dificultando isolar o que quebrou.
- Versões divergentes entre `api/` e `web/` para ferramentas compartilhadas (ex.: TypeScript) causando comportamento inconsistente.
