/**
 * Converte uma string de data para UTC
 */
export function toUTCDate(dateString: string): Date {
    const date = new Date(dateString + 'T00:00:00.000Z');
    return date;
}

/**
 * Obtém a data atual em UTC (início do dia)
 */
export function getTodayUTC(): Date {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/**
 * Compara duas datas em UTC (apenas a parte da data, ignorando horário)
 */
export function compareDatesUTC(date1: string | Date, date2: string | Date): number {
    const d1 = typeof date1 === 'string' ? toUTCDate(date1) : new Date(Date.UTC(date1.getUTCFullYear(), date1.getUTCMonth(), date1.getUTCDate()));
    const d2 = typeof date2 === 'string' ? toUTCDate(date2) : new Date(Date.UTC(date2.getUTCFullYear(), date2.getUTCMonth(), date2.getUTCDate()));
    return d1.getTime() - d2.getTime();
}

/**
 * Verifica se uma data é hoje (UTC)
 */
export function isTodayUTC(date: string | Date): boolean {
    return compareDatesUTC(date, getTodayUTC()) === 0;
}

/**
 * Verifica se uma data é futura (UTC)
 */
export function isFutureUTC(date: string | Date): boolean {
    return compareDatesUTC(date, getTodayUTC()) > 0;
}

/**
 * Verifica se uma data é passada (UTC)
 */
export function isPastUTC(date: string | Date): boolean {
    return compareDatesUTC(date, getTodayUTC()) < 0;
}

export function formatPeriod(periodo: string): string {
    const [year, month] = periodo.split('-');
    const monthNames = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return `${monthNames[parseInt(month) - 1]} ${year}`;
}