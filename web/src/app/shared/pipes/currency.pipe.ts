import { Pipe, PipeTransform } from '@angular/core';

export interface CurrencyPipeOptions {
  symbol?: boolean; // Se deve mostrar o símbolo da moeda (padrão: true)
  minimumFractionDigits?: number; // Número mínimo de casas decimais (padrão: 2)
  maximumFractionDigits?: number; // Número máximo de casas decimais (padrão: 2)
}

@Pipe({
  name: 'currency',
  standalone: true
})
export class CurrencyPipe implements PipeTransform {
  
  transform(
    value: number | null | undefined, 
    options: CurrencyPipeOptions = {}
  ): string {
    if (value === null || value === undefined || isNaN(value)) {
      return options.symbol !== false ? 'R$ 0,00' : '0,00';
    }

    const {
      symbol = true,
      minimumFractionDigits = 2,
      maximumFractionDigits = 2
    } = options;

    const formatOptions: Intl.NumberFormatOptions = {
      minimumFractionDigits,
      maximumFractionDigits
    };

    if (symbol) {
      formatOptions.style = 'currency';
      formatOptions.currency = 'BRL';
    }

    return new Intl.NumberFormat('pt-BR', formatOptions).format(value);
  }
}