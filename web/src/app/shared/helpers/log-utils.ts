import { LogAcao } from "../interfaces";

const ACAO_BADGE_MAP = {
    [LogAcao.CREATE]: {
        appearance: 'positive' as const,
        label: 'Criação',
        icon: '@tui.plus'
    },
    [LogAcao.UPDATE]: {
        appearance: 'info' as const,
        label: 'Atualização',
        icon: '@tui.edit'
    },
    [LogAcao.DELETE]: {
        appearance: 'negative' as const,
        label: 'Exclusão',
        icon: '@tui.trash'
    },
    [LogAcao.LOGIN]: {
        appearance: 'accent' as const,
        label: 'Login',
        icon: '@tui.log-in'
    },
    [LogAcao.LOGOUT]: {
        appearance: 'neutral' as const,
        label: 'Logout',
        icon: '@tui.log-out'
    }
};

export function getAcaoBadge(acao: LogAcao) {
    return ACAO_BADGE_MAP[acao];
}

const ENTIDADE_BADGE_MAP = {
    'Usuario': {
        appearance: 'accent' as const,
        label: 'Usuário',
        icon: '@tui.user'
    },
    'Categoria': {
        appearance: 'info' as const,
        label: 'Categoria',
        icon: '@tui.folder'
    },
    'Orcamento': {
        appearance: 'positive' as const,
        label: 'Orçamento',
        icon: '@tui.chart-column-big'
    },
    'Movimento': {
        appearance: 'warning' as const,
        label: 'Movimento',
        icon: '@tui.receipt'
    },
    'Reserva': {
        appearance: 'neutral' as const,
        label: 'Reserva',
        icon: '@tui.piggy-bank'
    }
};

export function getEntidadeBadge(entidade?: string) {
    if (!entidade) return null;

    return ENTIDADE_BADGE_MAP[entidade as unknown as keyof typeof ENTIDADE_BADGE_MAP] || {
        appearance: 'outline' as const,
        label: entidade,
        icon: '@tui.file'
    };
}     