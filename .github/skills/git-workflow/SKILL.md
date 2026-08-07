---
name: git-workflow
description: 'Seguir as convenções de branches, mensagens de commit e pull requests deste repositório. Use quando: criar uma branch, escrever uma mensagem de commit, abrir um pull request, ou resolver conflitos de merge.'
---

# Fluxo de Trabalho Git

## Quando Usar
- Iniciar trabalho em uma nova feature/correção (nomenclatura de branch)
- Escrever mensagens de commit (este repositório usa commitlint — veja `api/commitlint.config.js` e `api/COMMITS.md`)
- Abrir um pull request
- Resolver conflitos de merge ou fazer rebase

## Procedimento

1. **Nomenclatura de branch**: use um nome curto, descritivo, em kebab-case, prefixado pelo tipo, ex.: `feat/orcamentos-periodo`, `fix/login-token-expiry`, `chore/update-deps`.
2. **Mensagens de commit**: siga o Conventional Commits (aplicado pelo commitlint em `api/`):
   ```
   <tipo>(<escopo>): <resumo curto>

   [corpo opcional]

   [rodapé opcional]
   ```
   Tipos: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`, `ci`. Mantenha o resumo no imperativo e com menos de ~72 caracteres.
3. **Granularidade dos commits**: uma mudança lógica por commit; evite misturar mudanças não relacionadas (formatação + feature + correção) em um único commit.
4. **Antes de abrir um PR**:
   - Rode os testes relevantes (`api/` e/ou `web/`) localmente.
   - Revise seu próprio diff (skill `code-review`) para pegar problemas óbvios primeiro.
   - Garanta que não sobrou código de depuração, segredos, ou blocos comentados.
5. **Descrição do PR**: declare o problema, a solução, e como foi verificado (testes rodados, passos manuais). Vincule issues relacionadas.
6. **Nunca** faça force-push em branches compartilhadas, reescreva histórico já publicado, ou execute comandos git destrutivos (`reset --hard`, `push --force`) sem confirmação explícita do usuário.

## Boas Práticas
- Faça rebase das branches de feature sobre a branch padrão mais recente antes de abrir um PR para minimizar conflitos.
- Mantenha os PRs pequenos e focados — mais fáceis de revisar, mais fáceis de reverter se necessário.
- Faça squash de commits ruidosos de WIP antes do merge se a convenção da equipe favorecer um histórico limpo (verifique PRs já mesclados para confirmar o padrão usado).

## Armadilhas Comuns
- Mensagens de commit vagas ("fix stuff", "wip") que falham no commitlint ou não agregam valor ao histórico.
- Fazer force-push sobre uma branch em que outras pessoas também estão trabalhando.
- Misturar atualizações de dependências com código de feature no mesmo commit/PR, dificultando a revisão.
