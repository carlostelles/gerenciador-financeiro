# Backlog de dependências vulneráveis

## Escopo

Esta atualização deve ser entregue separadamente da correção de idempotência e cardinalidade do fluxo WhatsApp. Nenhuma versão ou lockfile foi alterado nesta fase.

## Estado em 2026-08-29

O comando `npm audit --json` executado em `api/` reportou 36 ocorrências: 1 crítica, 17 altas, 16 moderadas e 2 baixas.

O comando `npm audit --omit=dev --json` ainda reportou 19 ocorrências no grafo de produção: 1 crítica, 7 altas e 11 moderadas. A imagem final foi ajustada para instalar com `npm ci --omit=dev`, removendo `sqlite3`, mas ainda contém `tar@6.2.1` por meio de `bcrypt -> @mapbox/node-pre-gyp`. O runtime também contém versões vulneráveis de `multer`, alcançáveis pelos endpoints autenticados de upload de comprovantes.

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

## Entrega recomendada

1. Separar dependências de runtime das ferramentas de desenvolvimento e confirmar se `sqlite3` ainda é necessário.
2. Aplicar primeiro correções sem mudança major, uma família por vez, executando build e suítes unitária/e2e.
3. Planejar a atualização coordenada do NestJS e pacotes relacionados, validando os respectivos guias de migração.
4. Reexecutar `npm audit` e registrar os riscos residuais antes do merge dessa entrega.

## Decisão de risco recomendada

Não liberar em produção sem uma destas decisões registradas:

1. corrigir as dependências de runtime, com prioridade para `multer`/`@nestjs/platform-express` e para a cadeia de instalação do `bcrypt`; ou
2. obter aceite formal e temporário do risco, restringindo tamanho e taxa de uploads no proxy/API, monitorando consumo de recursos e definindo prazo curto para a atualização.

O backlog separado evita misturar uma atualização coordenada de dependências com a feature, mas não elimina o risco de disponibilidade dos endpoints de upload.
