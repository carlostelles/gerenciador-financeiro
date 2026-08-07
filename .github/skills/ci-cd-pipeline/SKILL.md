---
name: ci-cd-pipeline
description: 'Configurar ou solucionar problemas de pipelines de integração e entrega contínua (builds Docker, testes automatizados, lint). Use quando: adicionar/corrigir workflows de CI, problemas de build Docker, ou automatizar etapas de teste/build/deploy.'
---

# Pipeline de CI/CD

## Quando Usar
- Adicionar ou modificar etapas automatizadas do pipeline (lint, teste, build, deploy)
- Depurar um build de CI que está falhando (erros de build Docker, testes falhando no CI mas não localmente)
- Configurar tarefas de build/teste para `api/` (NestJS) ou `web/` (Angular)

## Procedimento

1. **Identificar a etapa do pipeline afetada**: lint → teste unitário → teste e2e → build (imagem Docker) → deploy.
2. **Reproduzir falhas do CI localmente primeiro**: execute exatamente o mesmo comando que o CI usa (verifique os scripts do `package.json` em `api/` e `web/`, e os `Dockerfile`s) em vez de adivinhar.
3. **Manter as etapas rápidas e com falha antecipada (fail-fast)**: lint/checagem de tipos antes das suítes de teste mais lentas; testes unitários antes dos testes e2e/integração.
4. **Builds Docker**: verifique se os builds multi-stage armazenam corretamente o cache de dependências (`COPY package*.json` antes de `COPY . .`), e que `docker-compose.yml` / `docker-compose.dev.yml` / `docker-compose.prod.yml` permaneçam consistentes com qualquer alteração no Dockerfile.
5. **Paridade de ambiente**: garanta que as variáveis de ambiente exigidas por `api/` (conexão com o BD, segredo JWT) e `web/` (URL base da API) estejam documentadas e fornecidas via arquivos `.env`/compose, e não fixadas no código.
6. **Adicione uma tarefa** para verificação local repetível usando `create_and_run_task` quando um novo comando de build/teste/lint for introduzido, para que fique descobrível no VS Code.

## Boas Práticas
- Nunca faça commit de segredos em arquivos de configuração do pipeline; use cofres de segredos/variáveis de ambiente.
- Mantenha os ambientes de CI e desenvolvimento local o mais próximos possível (mesma versão do Node, mesmas imagens base do Docker) para evitar o "funciona na minha máquina".
- Faça cache de dependências (`node_modules`, cache do npm) entre execuções do CI para manter os pipelines rápidos.

## Armadilhas Comuns
- CI passando localmente mas falhando no pipeline por diferenças de ambiente (fuso horário, locale, versão do Node).
- Cache de camadas do Docker invalidado a cada build por copiar o código-fonte antes de instalar as dependências.
- Testes e2e demorados bloqueando o feedback rápido — não separados das etapas rápidas de teste unitário.
