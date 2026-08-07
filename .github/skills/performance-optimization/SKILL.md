---
name: performance-optimization
description: 'Diagnosticar e corrigir problemas de performance em respostas de API, queries de banco de dados, ou renderização Angular. Use quando: um endpoint está lento, uma query é ineficiente (N+1), o frontend parece lento, ou antes de otimizar prematuramente sem profiling.'
---

# Otimização de Performance

## Quando Usar
- Um endpoint, query ou página específica é reportada/medida como lenta
- Revisar uma nova feature em busca de riscos óbvios de performance antes do merge (queries N+1, loops ilimitados, paginação ausente)
- Investigar alto uso de memória/CPU ou timeouts

## Procedimento

1. **Meça antes de otimizar** — nunca adivinhe. Identifique o gargalo real:
   - Backend: verifique a execução das queries (ative o logging de queries do TypeORM), meça o tempo do endpoint, verifique queries N+1 (falta de `relations`/joins em um loop).
   - Frontend: verifique os ciclos de detecção de mudanças do Angular, tamanho do bundle, re-renderizações desnecessárias, listas grandes sem paginação.
2. **Identifique a camada**: query de BD, rede/serialização, lógica de aplicação, ou renderização.
3. **Corrija primeiro o gargalo de maior impacto** — corrigir uma única query N+1 muitas vezes supera micro-otimizações em outros lugares.
4. **Correções comuns no backend**:
   - Adicionar índices ausentes (veja `database-design`)
   - Usar `relations`/joins para evitar queries N+1 em vez de fazer loop e consultar item por item
   - Adicionar paginação aos endpoints de listagem em vez de retornar tabelas inteiras
   - Fazer cache de computações caras/de muita leitura onde dados desatualizados forem aceitáveis
5. **Correções comuns no frontend**:
   - Usar detecção de mudanças `OnPush` para componentes com inputs estáveis
   - Usar `trackBy` em `*ngFor` para listas
   - Fazer lazy-load de módulos/rotas de feature
   - Evitar computação pesada em templates/getters chamados a cada ciclo de detecção de mudanças
6. **Meça novamente após a correção** para confirmar que a melhoria é real, não presumida.

## Boas Práticas
- Otimize apenas o que for medido como lento; otimização prematura adiciona complexidade sem benefício comprovado.
- Prefira correções em nível algorítmico/de query (reduzir N+1, adicionar índices) em vez de micro-otimizações.
- Mantenha paginação/limites em todos os endpoints de listagem por padrão, especialmente para o histórico de transações financeiras que cresce indefinidamente.

## Armadilhas Comuns
- Otimizar código que não é de fato o gargalo (adivinhar em vez de fazer profiling).
- Adicionar cache sem considerar desatualização/invalidação de dados financeiros (risco de mostrar saldos desatualizados).
- Introduzir queries N+1 via `.map()` + loops com `await` em vez de uma única query em lote.
- Carregar conjuntos de resultados inteiros na memória (ex.: todas as movimentações já registradas) em vez de paginar.
