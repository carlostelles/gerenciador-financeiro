# Currency Pipe

Uma pipe personalizada para formatação de valores monetários no padrão brasileiro.

## Importação

```typescript
import { CurrencyPipe } from './shared/pipes/currency.pipe';
// ou
import { CurrencyPipe } from './shared/pipes';
// ou
import { CurrencyPipe } from './shared';

@Component({
  // ...
  imports: [CurrencyPipe]
})
```

## Uso Básico

```html
<!-- Uso simples -->
{{ 1234.56 | currency }}
<!-- Resultado: R$ 1.234,56 -->

<!-- Com valor null/undefined -->
{{ null | currency }}
<!-- Resultado: R$ 0,00 -->
```

## Uso Avançado

```html
<!-- Sem símbolo da moeda -->
{{ 1234.56 | currency: { symbol: false } }}
<!-- Resultado: 1.234,56 -->

<!-- Com mais casas decimais -->
{{ 1234.5 | currency: { maximumFractionDigits: 3 } }}
<!-- Resultado: R$ 1.234,500 -->

<!-- Sem casas decimais -->
{{ 1234.56 | currency: { minimumFractionDigits: 0, maximumFractionDigits: 0 } }}
<!-- Resultado: R$ 1.235 -->
```

## Exemplos no TypeScript

```typescript
// Se precisar usar no componente
export class MyComponent {
  private currencyPipe = new CurrencyPipe();

  formatValue(value: number): string {
    return this.currencyPipe.transform(value);
  }

  formatValueWithoutSymbol(value: number): string {
    return this.currencyPipe.transform(value, { symbol: false });
  }
}
```

## Opções Disponíveis

| Opção | Tipo | Padrão | Descrição |
|-------|------|--------|-----------|
| `symbol` | `boolean` | `true` | Se deve mostrar o símbolo R$ |
| `minimumFractionDigits` | `number` | `2` | Número mínimo de casas decimais |
| `maximumFractionDigits` | `number` | `2` | Número máximo de casas decimais |

## Comparação com Outras Soluções

### Angular Built-in CurrencyPipe
```html
<!-- Angular built-in -->
{{ 1234.56 | currency: 'BRL':'symbol':'1.2-2':'pt-BR' }}

<!-- Nossa pipe customizada -->
{{ 1234.56 | currency }}
```

### Função Helper
```typescript
// Função helper (antes)
formatCurrency(1234.56)

// Nossa pipe (agora)
{{ 1234.56 | currency }}
```

## Vantagens

1. **Reutilizável**: Pode ser usada em qualquer template
2. **Consistente**: Sempre formata no padrão brasileiro
3. **Flexível**: Permite customização através de opções
4. **Segura**: Trata valores null/undefined automaticamente
5. **Performance**: É otimizada pelo Angular (pure pipe)
6. **Standalone**: Pode ser importada individualmente