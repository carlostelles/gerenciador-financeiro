import { Injectable } from '@nestjs/common';
import { WhatsappIntentResult, WhatsappIntentType } from '../whatsapp.types';

@Injectable()
export class WhatsappIntentParserService {
  private readonly regexPeriodo = /(20\d{2})[-\/](0[1-9]|1[0-2])/;
  private readonly regexData =
    /(20\d{2})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])/;

  parse(texto: string): WhatsappIntentResult {
    const normalizado = (texto || '').trim();
    const lower = normalizado.toLowerCase();

    if (this.isIntentExtrato(lower)) {
      const periodoInicio =
        this.extractPeriodo(lower) || this.getPeriodoAtual();
      return {
        type: WhatsappIntentType.EXTRATO,
        payload: {
          textoOriginal: normalizado,
          periodoInicio,
          periodoFim: periodoInicio,
        },
      };
    }

    if (this.isIntentNovaMovimentacao(lower)) {
      const valor = this.extractValor(lower);
      const data = this.extractData(lower);
      const categoriaNome = this.extractCategoriaNome(normalizado);
      const descricao = this.extractDescricao(normalizado);

      return {
        type: WhatsappIntentType.NOVA_MOVIMENTACAO,
        payload: {
          textoOriginal: normalizado,
          valor,
          data,
          categoriaNome,
          descricao,
          tipoMovimento: this.isReceita(lower) ? 'RECEITA' : 'DESPESA',
        },
      };
    }

    return {
      type: WhatsappIntentType.DESCONHECIDA,
      payload: {
        textoOriginal: normalizado,
      },
    };
  }

  private isIntentNovaMovimentacao(lower: string): boolean {
    return (
      lower.includes('nova movimentacao') ||
      lower.includes('nova movimentação') ||
      lower.startsWith('movimentacao') ||
      lower.startsWith('movimentação')
    );
  }

  private isIntentExtrato(lower: string): boolean {
    return (
      lower.includes('extrato') ||
      lower.includes('resumo do periodo') ||
      lower.includes('resumo do período')
    );
  }

  private extractValor(texto: string): number | undefined {
    const match = texto.match(/(\d+[\.,]\d{2})/);
    if (!match) {
      return undefined;
    }

    const valor = Number(match[1].replace('.', '').replace(',', '.'));
    return Number.isFinite(valor) ? valor : undefined;
  }

  private extractData(texto: string): string | undefined {
    const dataMatch = texto.match(this.regexData);
    if (dataMatch) {
      return dataMatch[0];
    }

    const periodoMatch = texto.match(this.regexPeriodo);
    if (periodoMatch) {
      return `${periodoMatch[1]}-${periodoMatch[2]}-01`;
    }

    return undefined;
  }

  private extractPeriodo(texto: string): string | undefined {
    const periodoMatch = texto.match(this.regexPeriodo);
    return periodoMatch ? `${periodoMatch[1]}-${periodoMatch[2]}` : undefined;
  }

  private extractCategoriaNome(texto: string): string | undefined {
    const match = texto.match(
      /categoria[:\s]+(.+?)(?:\s+descricao[:\s]+|$|,|;)/i,
    );
    return match?.[1]?.trim();
  }

  private extractDescricao(texto: string): string | undefined {
    const match = texto.match(/descricao[:\s]+(.+)/i);
    if (match?.[1]) {
      return match[1].trim();
    }

    const cleaned = texto
      .replace(/nova movimenta(c|ç)ão?/gi, '')
      .replace(/movimenta(c|ç)ão?/gi, '')
      .replace(this.regexData, '')
      .replace(/\d+[\.,]\d{2}/, '')
      .replace(/categoria[:\s]+[^,;]+/i, '')
      .trim();

    return cleaned || undefined;
  }

  private isReceita(lower: string): boolean {
    return lower.includes('receita') || lower.includes('entrada');
  }

  private getPeriodoAtual(): string {
    const hoje = new Date();
    return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
  }
}
