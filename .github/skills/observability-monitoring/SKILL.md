---
name: observability-monitoring
description: 'Adicionar e revisar logging, métricas, health checks e rastreamento de erros. Use quando: adicionar logging a uma nova feature, investigar problemas de produção via logs, configurar health checks, ou decidir o que monitorar/alertar.'
---

# Observabilidade & Monitoramento

## Quando Usar
- Adicionar logging a uma nova lógica de negócio ou caminhos de erro
- Investigar um incidente/bug usando logs existentes
- Revisar/adicionar endpoints de health check (`api/src/health.controller.ts`)
- Decidir quais métricas ou alertas importam para uma feature (ex.: taxa de falha no processamento de transações)

## Procedimento

1. **Registre no nível certo**: `error` para falhas que precisam de atenção, `warn` para situações recuperáveis/inesperadas, `info` para eventos de negócio significativos (usuário criado, movimentação registrada), `debug` para detalhes de diagnóstico verbosos (desabilitado em produção).
2. **Inclua contexto, não ruído**: registre identificadores (ID do usuário, ID da requisição, ID da entidade) necessários para correlacionar eventos — nunca registre segredos, senhas, tokens, ou dumps completos de registros financeiros.
3. **Estruture os logs de forma consistente** (use o logger do NestJS ou uma biblioteca de logging estruturado) para que possam ser filtrados/consultados, em vez de `console.log` livre.
4. **Health checks**: garanta que `/health` (ou equivalente) reflita o status real das dependências (conectividade com o BD) para que a orquestração (Docker/nginx) detecte instâncias não saudáveis — verifique o alinhamento com `nginx/healthcheck.sh`.
5. **Defina o que importa monitorar** para uma nova feature: taxa de erro, latência, e qualquer métrica crítica de negócio (ex.: tentativas de login falhadas, violações de limite de orçamento) — adicione apenas o que realmente será acionado.
6. **Ao depurar problemas de produção**, correlacione os logs entre `api/` e `nginx/` (logs do proxy reverso) para rastrear uma requisição de ponta a ponta.

## Boas Práticas
- Trate os logs como uma trilha de auditoria para ações financeiras — registre quem fez o quê e quando, sem registrar excessivamente payloads sensíveis.
- Mantenha o volume de logs proporcional ao valor; logging `debug` excessivo em produção esconde o sinal no ruído.
- Alerte sobre sintomas que exigem ação, não sobre toda anomalia possível (fadiga de alertas).

## Armadilhas Comuns
- Registrar dados sensíveis (senhas, tokens, saldos completos/PII) em texto puro.
- Usar `console.log` espalhado pelo código em vez de um logger consistente, tornando impossível filtrar por nível de log.
- Health checks que sempre retornam 200 independentemente do estado real do BD/dependências, mascarando quedas reais.
