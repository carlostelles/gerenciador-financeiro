---
name: api-design
description: 'Desenhar endpoints REST, DTOs e contratos de API. Use quando: criar ou modificar controllers/rotas do NestJS, definir formatos de request/response, versionar APIs, projetar paginação/filtros, ou revisar a consistência de uma API.'
---

# API Design

## Quando Usar
- Adicionar um novo endpoint ou recurso ao backend NestJS em `api/`
- Alterar o formato de request/response de um endpoint existente (risco de quebra de contrato)
- Projetar convenções de paginação, filtros, ordenação ou respostas de erro
- Revisar uma API quanto à consistência antes do merge

## Procedimento

1. **Levantar as convenções existentes** em `api/src/modules/**` (controllers, DTOs, decorators) — siga a nomenclatura, verbos HTTP e códigos de status já utilizados em vez de introduzir novos padrões.
2. **Modelar o recurso**: defina o formato da entidade/DTO. Use decorators do class-validator nos DTOs de entrada; nunca confie na entrada do cliente.
3. **Escolher verbos/rotas** seguindo convenções REST:
   - `GET /recurso` (listagem, paginada), `GET /recurso/:id`
   - `POST /recurso` (criação), `PATCH /recurso/:id` (atualização parcial), `PUT` apenas para substituição completa
   - `DELETE /recurso/:id`
4. **Definir contratos de resposta** explicitamente (DTOs de resposta) — evite expor entidades do ORM diretamente (exclua campos internos/sensíveis como hash de senha).
5. **Tratar erros de forma consistente** — use exception filters/HttpException do NestJS com códigos de status significativos (400 validação, 401/403 autenticação/autorização, 404 não encontrado, 409 conflito).
6. **Adicionar verificações de autorização** no nível de controller/guard — verifique se o requisitante é dono do recurso/tem acesso a ele (crítico em um app financeiro: `movimentacoes`, `orcamentos`, `reservas` devem sempre ser filtrados pelo usuário autenticado).
7. **Versionar com cuidado** — evite quebrar clientes existentes (app web); prefira mudanças aditivas (novos campos opcionais) a mudanças destrutivas.
8. **Escrever/atualizar testes e2e** em `api/test/*.e2e-spec.ts` cobrindo o contrato novo/alterado.

## Boas Práticas
- Valide todas as entradas com DTOs + `class-validator`; rejeite campos desconhecidos (`whitelist: true`).
- Mantenha a paginação consistente entre os endpoints de listagem (ex.: `page`, `limit`, total no retorno).
- Use códigos de status HTTP significativos; nunca retorne 200 para erros.
- Documente parâmetros de query não óbvios no controller/DTO com comentários ou decorators do Swagger, se o projeto os utilizar.

## Armadilhas Comuns
- Retornar entidades TypeORM cruas (risco de expor campos internos/sensíveis).
- Ausência de verificação de posse do recurso — permitir que o usuário A leia/modifique registros financeiros do usuário B adivinhando o ID (IDOR).
- Formatos de erro inconsistentes entre endpoints, dificultando o tratamento de erros no frontend.
- Fazer alterações destrutivas silenciosas em um formato de resposta consumido pelo `web/`.
