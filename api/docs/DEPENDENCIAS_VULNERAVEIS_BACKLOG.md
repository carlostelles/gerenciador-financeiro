# Atualização de dependências vulneráveis

## Escopo

O manifesto e o lockfile da API foram atualizados de forma coordenada e validada.

## Estado anterior em 2026-08-29

O comando `npm audit --json` executado em `api/` reportou 36 ocorrências: 1 crítica, 17 altas, 16 moderadas e 2 baixas.

O comando `npm audit --omit=dev --json` reportava 19 ocorrências no grafo de produção: 1 crítica, 7 altas e 11 moderadas. O runtime continha versões vulneráveis de `multer` e a cadeia `bcrypt -> @mapbox/node-pre-gyp -> tar`.

Dependências diretas envolvidas:

- `@nestjs/common`: moderada, com correção disponível.
- `@nestjs/config`: moderada, correção indicada pelo audit exige major.
- `@nestjs/core`: moderada, correção indicada pelo audit exige major.
- `@nestjs/mongoose`: moderada, correção indicada pelo audit exige major.
- `@nestjs/platform-express`: alta, correção indicada pelo audit exige major.
- `@nestjs/schematics`: moderada, correção indicada pelo audit exige major.
- `@nestjs/swagger`: moderada, correção indicada pelo audit exige major.
- `@nestjs/testing`: moderada, correção indicada pelo audit exige major.
- `@nestjs/typeorm`: moderada, correção indicada pelo audit exige major.
- `@typescript-eslint/eslint-plugin` e `@typescript-eslint/parser`: altas, com correção disponível a avaliar.
- `sqlite3`: alta e origem transitiva do achado crítico em `tar`; a correção indicada exige `sqlite3` 6.

## Atualização executada

1. `sqlite3` foi removido das dependências de desenvolvimento por não possuir uso no código ou na configuração atual baseada em MySQL.
2. `bcrypt` foi atualizado para 6.0.0, eliminando a cadeia vulnerável de instalação nativa. Um teste específico confirma compatibilidade com hashes legados e novos.
3. A família NestJS foi atualizada de forma coordenada para a versão 11, incluindo `common`, `core`, `config`, `jwt`, `mongoose`, `passport`, `platform-express`, `swagger`, `typeorm`, `testing` e `schematics`.
4. `@nestjs/platform-express` passou a usar `multer` 2.2.0.
5. `@typescript-eslint/parser` e `@typescript-eslint/eslint-plugin` foram atualizados para a família 8.
6. As versões transitivas vulneráveis de `js-yaml` foram atualizadas para 4.3.2 e 3.15.2.
7. Os estágios de build e produção do Docker passaram a instalar dependências com `npm ci`; a imagem final instala somente dependências de produção.

## Validação final

- `npm audit`: 0 vulnerabilidades.
- `npm audit --omit=dev`: 0 vulnerabilidades.
- Build da API: aprovado.
- Testes unitários: 16 suítes e 176 testes aprovados.
- Testes E2E: 8 suítes e 239 testes aprovados.
- Compatibilidade do bcrypt: hashes legados e novos validados.
- `npm ci --dry-run`: aprovado, confirmando sincronismo entre `package.json` e `package-lock.json`.
- `sqlite3` não está presente no grafo instalado.

## Risco residual

Não há achados conhecidos no audit atual. Atualizações major opcionais posteriores, como NestJS 12, ESLint 10, Jest 30 e Mongoose 9, ficaram fora do escopo porque não são necessárias para eliminar vulnerabilidades e exigem ciclos de migração próprios.
