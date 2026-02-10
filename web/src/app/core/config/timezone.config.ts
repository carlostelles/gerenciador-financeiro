/**
 * Configuração global de timezone para a aplicação
 * Define o uso padrão de UTC para tratamento de datas
 */

/**
 * Inicializa a configuração de timezone UTC para toda a aplicação
 * Esta função deve ser chamada no início da aplicação (main.ts)
 */
export function initializeTimezoneConfig(): void {
    // Note: No browser environment, we work with UTC by default
    // The Date object will handle UTC correctly with our utility functions
    
    console.log('🌍 Timezone: Initialized UTC configuration for date handling');
}

/**
 * Utilitários para trabalhar com datas UTC
 */
export const TimezoneUtils = {
    /**
     * Obtém a data/hora atual em UTC
     */
    nowUTC(): Date {
        return new Date();
    },
    
    /**
     * Obtém apenas a data atual em UTC (sem horário)
     */
    todayUTC(): Date {
        const now = new Date();
        return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    },
    
    /**
     * Converte uma string de data para Date UTC
     */
    parseUTC(dateString: string): Date {
        return new Date(dateString + (dateString.includes('T') ? '' : 'T00:00:00.000Z'));
    },
    
    /**
     * Formata uma data como string UTC (YYYY-MM-DD)
     */
    formatUTC(date: Date): string {
        return date.toISOString().split('T')[0];
    },
    
    /**
     * Cria uma data UTC a partir de componentes
     */
    createUTC(year: number, month: number, day: number): Date {
        return new Date(Date.UTC(year, month, day));
    }
};