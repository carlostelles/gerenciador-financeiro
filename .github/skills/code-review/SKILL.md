---
name: code-review
description: 'Revisar alterações de código (próprias ou de PR) quanto à corretude, segurança, legibilidade e consistência antes do merge. Use quando: revisar um pull request, autorrevisar antes de commitar, responder a feedback de PR, ou auditar um diff em busca de problemas.'
---

# Revisão de Código

## Quando Usar
- Antes de abrir ou fazer merge de um pull request
- Ao responder a comentários de revisores (veja também `address-pr-comments` se estiver usando as ferramentas de PR do GitHub)
- Ao auditar um diff/branch existente em busca de problemas de qualidade
- Ao revisar código gerado por IA/automaticamente antes de aceitá-lo

## Procedimento

1. **Entender a intenção** — leia primeiro a descrição do PR/mensagens de commit; saiba qual problema está sendo resolvido antes de julgar a solução.
2. **Verificar a corretude**:
   - O código faz o que promete? Há erros de off-by-one, tratamento de null/undefined, condições de corrida?
   - Os casos extremos são tratados (listas vazias, requisições concorrentes, arredondamento financeiro)?
3. **Verificar segurança** (veja a skill `security-review` para mais profundidade): validação de entrada, verificações de autorização/posse, segredos não fixados no código, ausência de vetores de injeção SQL/XSS.
4. **Verificar testes**: novos testes foram adicionados para o novo comportamento? Os testes existentes ainda passam?
5. **Verificar consistência**: o código segue os padrões existentes (nomenclatura, estrutura de módulos, tratamento de erros) em `api/` ou `web/`? Em código de UI (`web/`), confirme que a implementação usa componentes da biblioteca [Taiga UI](https://taiga-ui.dev/getting-started) (`@taiga-ui/*`) em vez de HTML nativo estilizado manualmente ou outra biblioteca de componentes — sinalize como bloqueante qualquer `<button>`, `<input>`, `<select>` ou `<table>` cru onde exista um componente Taiga UI equivalente.
6. **Verificar escopo**: o diff faz apenas o necessário, ou inclui refatorações/ruído de formatação não relacionados que obscurecem a mudança real?
7. **Dar feedback acionável**: aponte linhas específicas, explique *por que* algo é um problema, sugira uma correção concreta.
8. **Diferenciar a severidade**: problemas bloqueantes (bugs, segurança, testes quebrados) vs. desejáveis (estilo, nomenclatura menor) — não bloqueie merges por detalhes triviais.

## Checklist de Revisão
- [ ] A lógica está correta e trata os casos extremos
- [ ] Não há problemas de segurança (autenticação, validação, segredos)
- [ ] Testes adicionados/atualizados e passando
- [ ] Nenhuma alteração não relacionada misturada
- [ ] Nomenclatura e estrutura consistentes com o restante do código
- [ ] Nenhum código de depuração esquecido (`console.log`, código comentado)
- [ ] O tratamento de erros não engole exceções silenciosamente

## Armadilhas Comuns
- Focar em detalhes de estilo que um linter/formatador deveria tratar automaticamente.
- Aprovar sem entender a mudança (aprovação automática sem análise).
- Ignorar o "porquê" — revisar o código isoladamente sem verificar se ele resolve o problema declarado.
- Bloquear por preferência pessoal em vez de um problema objetivo.
