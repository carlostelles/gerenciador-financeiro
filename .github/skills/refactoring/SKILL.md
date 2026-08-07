---
name: refactoring
description: 'Reestruturar código existente com segurança sem alterar o comportamento externo. Use quando: melhorar legibilidade/manutenibilidade, remover duplicação, extrair lógica reutilizável, ou preparar código para uma nova feature sem introduzir regressões.'
---

# Refatoração

## Quando Usar
- Código está duplicado entre módulos e deveria ser extraído/compartilhado
- Uma função/classe cresceu demais ou mistura múltiplas responsabilidades
- Preparar código legado para uma feature futura (torne a mudança fácil, depois faça a mudança fácil)
- Melhorar nomenclatura/estrutura apontada durante a revisão de código

## Procedimento

1. **Confirme primeiro que existe cobertura de testes** — se o código a ser refatorado não tem testes, adicione testes de caracterização que capturem o comportamento atual *antes* de refatorar (veja `test-driven-development`).
2. **Faça um tipo de mudança por vez** — não misture refatoração com mudanças de comportamento/correções de bugs na mesma edição; isso mantém os diffs revisáveis e reversíveis.
3. **Use passos pequenos e seguros**: extrair método/função, renomear, mover — verifique se os testes passam após cada passo em vez de fazer uma reescrita gigante.
4. **Use ferramentas para renomeações** (`vscode_renameSymbol`) em vez de buscar/substituir manualmente, para evitar referências perdidas.
5. **Reexecute a suíte de testes relevante completa** após cada passo significativo, não apenas no final.
6. **Verifique a equivalência de comportamento** — especialmente em torno de casos extremos (tratamento de null, caminhos de erro) que são fáceis de alterar acidentalmente durante a extração.

## Boas Práticas
- Prefira refatorações incrementais a reescritas; reescritas grandes escondem regressões e são difíceis de revisar.
- Mantenha as interfaces públicas (contratos de API, funções/componentes exportados) estáveis, a menos que o objetivo explícito da refatoração seja alterá-las.
- Remova código morto encontrado pelo caminho apenas se for claramente não relacionado e seguro — caso contrário, sinalize em vez de excluir silenciosamente.
- Não refatore código que não foi pedido "já que você está mexendo ali" — mantenha-se no escopo.

## Armadilhas Comuns
- Refatorar sem testes, introduzindo regressões silenciosamente.
- Misturar mudanças de comportamento com mudanças estruturais, dificultando isolar o que quebrou.
- Abstrair demais durante a refatoração (introduzir interfaces genéricas para um único caso de uso).
- Renomear/mover arquivos sem atualizar todas as referências (imports, tokens de DI, caminhos de rota).
