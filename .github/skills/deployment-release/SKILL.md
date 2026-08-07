---
name: deployment-release
description: 'Planejar e executar releases e deploys seguros, incluindo configuração de Docker/nginx/SSL para este projeto. Use quando: preparar um release, fazer deploy em produção, alterar configs do docker-compose/nginx, lidar com certificados SSL, ou escrever notas de release/versionamento.'
---

# Deployment & Release

## Quando Usar
- Preparar um novo release/versão de `api/` e/ou `web/`
- Modificar `docker-compose.yml`, `docker-compose.dev.yml`, ou a configuração do `nginx/`
- Configurar/renovar certificados SSL (veja `docs/SSL-*.md` e `scripts/*.sh` existentes)
- Escrever notas de release ou decidir sobre incrementos de versão semântica

## Procedimento

1. **Consulte a documentação existente primeiro** — este repositório tem documentação extensa de deployment (`docs/DOCKER_README.md`, `docs/SSL-*.md`, `docs/NGINX-*.md`, `Makefile`, `scripts/*.sh`). Consulte-a antes de resolver novamente um problema já documentado.
2. **Incremento de versão**: siga o versionamento semântico (MAJOR.MINOR.PATCH) baseado na natureza das mudanças (breaking/feature/fix), consistente com as convenções de `api/COMMITS.md`.
3. **Checklist pré-deploy**:
   - Todos os testes passam (unitários + e2e) tanto em `api/` quanto em `web/`
   - Migrações estão prontas e são reversíveis (veja `database-design`)
   - Variáveis de ambiente/segredos de produção estão configurados (não os padrões de desenvolvimento)
   - As imagens Docker fazem build com sucesso (`docker-compose -f docker-compose.yml build`)
4. **Faça o deploy de forma incremental** quando possível — verifique se os health checks (`api/src/health.controller.ts`, `nginx/healthcheck.sh`) passam após cada etapa.
5. **Plano de rollback**: saiba como reverter (tag de imagem anterior, `down` da migração) antes de fazer o deploy — nunca faça deploy em produção sem um plano de rollback.
6. **Verificação pós-deploy**: faça smoke tests dos fluxos críticos (login, criar movimentação, visualizar saldo) contra o ambiente implantado.

## Boas Práticas
- Nunca faça deploy direto em produção sem antes rodar a suíte de testes completa.
- Mantenha os segredos de `docker-compose.prod.yml` fora do controle de versão (use arquivos `.env` excluídos via `.gitignore` ou um gerenciador de segredos).
- Coordene as migrações de BD com a ordem do deploy (migre antes de implantar o novo código que depende do novo schema, a menos que use o padrão expand/contract para zero-downtime).

## Armadilhas Comuns
- Fazer deploy de migrações que quebram o schema ao mesmo tempo que o código que depende delas, sem uma estratégia segura de rollout (expand/contract).
- Esquecer de renovar/verificar os certificados SSL antes do vencimento (verifique `scripts/renew-cert.sh`, `scripts/check-ssl.sh`).
- Pular os smoke tests após o deploy e só descobrir problemas por relatos de usuários.
