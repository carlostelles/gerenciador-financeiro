---
name: database-design
description: 'Desenhar esquemas de banco de dados, entidades, relacionamentos e migrações. Use quando: criar/modificar entidades TypeORM, planejar migrações, projetar índices, normalizar dados, ou lidar com tipos de dados financeiros (dinheiro, datas, moeda).'
---

# Database Design

## Quando Usar
- Criar uma nova entidade TypeORM ou modificar uma existente
- Escrever/revisar uma migração de banco de dados
- Projetar relacionamentos (1:1, 1:N, N:N) entre entidades de domínio
- Decidir sobre indexação, constraints ou tipos de dados (especialmente valores monetários)

## Procedimento

1. **Levantar as entidades existentes** em `api/src/modules/**/entities` (ou equivalente) para seguir as convenções de nomenclatura, padrões de entidade base (timestamps, soft delete) e estratégia de ID (UUID vs. auto-incremento).
2. **Modelar os relacionamentos explicitamente**: defina a posse (ex.: `Movimentacao` pertence a `Usuario`), comportamento de cascade, e chaves estrangeiras obrigatórias com política de `onDelete`.
3. **Escolher os tipos de dados corretos**:
   - Valores monetários: use `decimal`/`numeric` (nunca `float`/`double`) para evitar erros de arredondamento.
   - Datas/timestamps: use tipos com suporte a fuso horário de forma consistente; seja explícito sobre UTC vs. horário local.
   - Enums: use enums do BD ou check constraints para conjuntos fixos de valores (ex.: tipo de transação: receita/despesa).
4. **Adicionar constraints e índices**: constraints de unicidade onde necessário (ex.: e-mail do usuário), índices em colunas frequentemente filtradas (ex.: `usuario_id`, `data`).
5. **Escrever uma migração** (nunca dependa de `synchronize: true` em produção) — gere-a, revise o SQL produzido e garanta que seja reversível (método `down`).
6. **Considerar os limites de integridade dos dados**: NOT NULL onde necessário, valores padrão, e validação duplicada na camada de DTO (as constraints do BD são a última linha de defesa, não a única).

## Boas Práticas
- Prefira migrações explícitas em vez de auto-sync para qualquer coisa além de prototipagem local.
- Normalize para evitar dados financeiros duplicados, mas não normalize excessivamente a ponto de exigir joins excessivos para leituras simples.
- Indexe colunas usadas em `WHERE`/`ORDER BY` nos endpoints de listagem (ex.: filtrar movimentações por período/usuário).
- Use transações para escritas em múltiplas etapas que precisam ser atômicas (ex.: criar uma movimentação que também atualiza um saldo/reserva).

## Armadilhas Comuns
- Usar `float`/`double` para valores monetários — causa erros de arredondamento em cálculos financeiros.
- Ausência de filtro por `usuario_id` nas queries, permitindo vazamento de dados entre usuários.
- Migrações irreversíveis ou não testadas que quebram os ambientes do `docker-compose`.
- Problemas de query N+1 por falta de eager-loading/joins em endpoints de listagem com relacionamentos.
