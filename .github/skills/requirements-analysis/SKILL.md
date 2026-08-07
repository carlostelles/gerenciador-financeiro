---
name: requirements-analysis
description: 'Levantar, esclarecer e documentar requisitos de software antes da implementação. Use quando: iniciar uma nova feature, receber um pedido vago ou ambíguo, escrever histórias de usuário/critérios de aceite, dividir um épico em tarefas, ou quando o escopo não está claro e precisa de confirmação antes de codificar.'
---

# Análise de Requisitos

## Quando Usar
- Um pedido de feature é vago, incompleto, ou tem múltiplas interpretações possíveis
- Antes de iniciar qualquer implementação não trivial (novo módulo, endpoint, tela)
- Dividir um pedido grande (épico) em tarefas menores e entregáveis de forma independente
- Traduzir uma necessidade de negócio/usuário em critérios de aceite técnicos

## Procedimento

1. **Reafirme o objetivo** com suas próprias palavras e identifique o ator (quem se beneficia) e o resultado (o que muda).
2. **Identifique as incógnitas** — liste as suposições que você teria que adivinhar. Use a ferramenta `vscode_askQuestions` para qualquer coisa que altere materialmente a implementação (modelo de dados, fluxo de UX, regras de negócio, segurança/permissões).
3. **Defina os critérios de aceite** usando Dado/Quando/Então ou um checklist de comportamentos observáveis. Inclua:
   - Caminho feliz
   - Casos extremos (estado vazio, limites, acesso concorrente)
   - Comportamento de erro/validação
   - Restrições não funcionais (performance, segurança, acessibilidade), se relevante
4. **Verifique padrões existentes** no código (módulos/controllers/componentes similares) via `semantic_search` ou `grep_search` antes de inventar uma nova abordagem.
5. **Divida em tarefas** se o trabalho abrange múltiplas camadas (BD → API → UI). Use `manage_todo_list` para trabalhos em múltiplas etapas.
6. **Confirme os limites do escopo** — anote explicitamente o que está *fora* do escopo para evitar over-engineering.

## Template de Saída

```markdown
## Objetivo
<uma frase>

## Atores
- <quem aciona isso>

## Critérios de Aceite
- [ ] Dado <contexto>, quando <ação>, então <resultado>
- [ ] ...

## Fora do Escopo
- <itens explicitamente excluídos>

## Questões em Aberto
- <qualquer coisa que ainda precisa de confirmação>
```

## Boas Práticas
- Prefira fazer de 1 a 3 perguntas direcionadas em vez de um questionário longo; agrupe-as via `vscode_askQuestions`.
- Baseie os requisitos no vocabulário de domínio já existente no repositório (nomes de entidades, DTOs, nomes de módulos) em vez de inventar novos termos.
- Neste repositório (NestJS `api/` + Angular `web/`), verifique tanto `api/src/modules/**` quanto `web/src/app/**` em busca de convenções existentes antes de definir o formato de uma nova feature.

## Armadilhas Comuns
- Partir direto para o código antes de confirmar regras de negócio ambíguas (ex.: arredondamento, tratamento de moeda, regras de data/fuso horário em um app financeiro).
- Escrever critérios de aceite que não são testáveis (sem sinal claro de aprovação/reprovação).
- Aumento descontrolado de escopo: adicionar features não solicitadas "já que estamos nisso".
