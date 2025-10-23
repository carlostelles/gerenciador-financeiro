# Busca de Orçamentos por Período

## Descrição

Este documento descreve a implementação da funcionalidade de busca de orçamentos por período, que permite ao usuário autenticado consultar um orçamento específico filtrando por período (formato yyyy-mm).

## Funcionalidade Implementada

### Endpoint

**GET** `/orcamentos/periodo/:periodo`

- **Autenticação**: Requerida (Bearer Token)
- **Parâmetro**: `periodo` - Período no formato yyyy-mm (ex: 2024-01)
- **Resposta**: Objeto contendo o orçamento encontrado com todos os itens e categorias vinculadas

### Estrutura da Resposta

```json
{
  "id": 1,
  "periodo": "2024-01",
  "descricao": "Orçamento de Janeiro 2024",
  "createdAt": "2024-01-15T10:00:00.000Z",
  "updatedAt": "2024-01-15T10:00:00.000Z",
  "items": [
    {
      "id": 1,
      "descricao": "Supermercado mensal",
      "valor": 500.00,
      "categoria": {
        "id": 1,
        "descricao": "Despesas com alimentação"
      }
    },
    {
      "id": 2,
      "descricao": "Combustível",
      "valor": 300.00,
      "categoria": {
        "id": 2,
        "descricao": "Despesas com transporte"
      }
    }
  ]
}
```

### Características

1. **Filtro por Período**: Busca o orçamento específico do período informado
2. **Autenticação**: Retorna apenas orçamentos do usuário autenticado
3. **Itens Completos**: Inclui todos os itens vinculados ao orçamento
4. **Categorias**: Cada item contém a categoria com `id` e `descricao`
5. **Validação**: Valida o formato do período (yyyy-mm)

## Arquivos Criados/Modificados

### 1. DTO - `src/modules/orcamentos/dto/find-by-periodo.dto.ts`

Criado novo arquivo com os seguintes DTOs:

- **FindByPeriodoParamDto**: Validação do parâmetro de período
- **CategoriaResponseDto**: Estrutura da categoria na resposta (id e descricao)
- **OrcamentoItemWithCategoriaDto**: Estrutura do item com categoria
- **OrcamentoByPeriodoResponseDto**: Estrutura completa da resposta

### 2. Service - `src/modules/orcamentos/orcamentos.service.ts`

Adicionado método:

```typescript
async findByPeriodo(
  periodo: string,
  usuarioId: number,
): Promise<OrcamentoByPeriodoResponseDto>
```

**Funcionalidades do método:**
- Busca o orçamento no banco de dados com relações (items e categoria)
- Valida se o orçamento existe para o período e usuário
- Mapeia a resposta para incluir apenas id e descricao da categoria
- Lança `NotFoundException` se não encontrar o orçamento

### 3. Controller - `src/modules/orcamentos/orcamentos.controller.ts`

Adicionado endpoint:

```typescript
@Get('periodo/:periodo')
findByPeriodo(
  @Param('periodo') periodo: string,
  @CurrentUser() user: any,
)
```

**Características:**
- Documentação Swagger completa
- Validação automática do parâmetro
- Autenticação via JWT
- Respostas HTTP apropriadas (200, 404)

### 4. Testes - `src/modules/orcamentos/orcamentos.service.spec.ts`

Adicionados 6 testes unitários:

1. ✅ Deve retornar orçamento com itens e categorias quando encontrado
2. ✅ Deve retornar orçamento com array vazio de itens quando não houver itens
3. ✅ Deve retornar apenas id e descricao da categoria
4. ✅ Deve lançar NotFoundException quando orçamento não for encontrado
5. ✅ Deve buscar orçamento apenas do usuário autenticado
6. ✅ Deve retornar múltiplos itens com suas respectivas categorias

**Cobertura de testes**: 100% do novo método

## Exemplos de Uso

### Requisição Bem-Sucedida

```bash
curl -X GET "http://localhost:3000/orcamentos/periodo/2024-01" \
  -H "Authorization: Bearer {seu-token-jwt}"
```

**Resposta (200 OK):**
```json
{
  "id": 1,
  "periodo": "2024-01",
  "descricao": "Orçamento de Janeiro 2024",
  "createdAt": "2024-01-15T10:00:00.000Z",
  "updatedAt": "2024-01-15T10:00:00.000Z",
  "items": [
    {
      "id": 1,
      "descricao": "Supermercado mensal",
      "valor": 500.00,
      "categoria": {
        "id": 1,
        "descricao": "Despesas com alimentação"
      }
    }
  ]
}
```

### Orçamento Não Encontrado

```bash
curl -X GET "http://localhost:3000/orcamentos/periodo/2025-12" \
  -H "Authorization: Bearer {seu-token-jwt}"
```

**Resposta (404 Not Found):**
```json
{
  "statusCode": 404,
  "message": "Orçamento não encontrado para o período 2025-12",
  "error": "Not Found"
}
```

### Formato de Período Inválido

```bash
curl -X GET "http://localhost:3000/orcamentos/periodo/2024-1" \
  -H "Authorization: Bearer {seu-token-jwt}"
```

**Resposta (400 Bad Request):**
```json
{
  "statusCode": 400,
  "message": ["Período deve estar no formato yyyy-mm"],
  "error": "Bad Request"
}
```

## Validações

### Formato do Período
- Deve seguir o padrão: `yyyy-mm`
- Exemplos válidos: `2024-01`, `2024-12`, `2023-06`
- Exemplos inválidos: `2024-1`, `24-01`, `2024/01`

### Segurança
- Apenas usuários autenticados podem acessar
- Retorna apenas orçamentos do próprio usuário
- Token JWT validado em cada requisição

## Integração com Swagger

A documentação está disponível em: `http://localhost:3000/api/docs`

**Detalhes da documentação:**
- Descrição completa do endpoint
- Exemplo de parâmetro
- Estrutura da resposta
- Códigos de status HTTP
- Possibilidade de testar diretamente na interface

## Testes

### Executar Testes Unitários

```bash
# Todos os testes do módulo de orçamentos
npm test -- orcamentos.service.spec.ts

# Apenas os testes do novo método
npm test -- orcamentos.service.spec.ts -t "findByPeriodo"
```

### Resultado dos Testes

```
Test Suites: 1 passed, 1 total
Tests:       24 passed, 24 total
Snapshots:   0 total
Time:        1.984 s
```

## Considerações Técnicas

### Performance
- Utiliza eager loading para carregar itens e categorias em uma única query
- Índices no banco de dados para `periodo` e `usuarioId` melhoram a performance

### Manutenibilidade
- Código bem documentado
- Testes unitários completos
- DTOs tipados para validação automática
- Separação clara de responsabilidades

### Escalabilidade
- Método pode ser facilmente estendido para incluir mais filtros
- Estrutura permite adicionar paginação se necessário
- Resposta otimizada (apenas campos necessários)

## Próximos Passos Sugeridos

1. **Adicionar cache**: Implementar cache Redis para períodos frequentemente consultados
2. **Filtros adicionais**: Permitir filtrar por categoria ou valor
3. **Agregações**: Adicionar totalizadores (soma de valores, quantidade de itens)
4. **Exportação**: Permitir exportar o orçamento em PDF ou Excel
5. **Comparação**: Endpoint para comparar orçamentos de diferentes períodos

## Suporte

Para dúvidas ou problemas relacionados a esta funcionalidade, consulte:
- Documentação da API: `/api/docs`
- Testes unitários: `src/modules/orcamentos/orcamentos.service.spec.ts`
- Código fonte: `src/modules/orcamentos/`
