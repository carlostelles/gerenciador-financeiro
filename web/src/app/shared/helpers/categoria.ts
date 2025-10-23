import { CategoriaTipo } from "../interfaces";

export function getCategoriaBadge(tipo: CategoriaTipo): { label: string; appearance: string, icon: string } {
    switch (tipo) {
      case CategoriaTipo.RECEITA:
        return {
          label: 'Receita', appearance: 'info', icon: 'banknote-arrow-up'
        };
      case CategoriaTipo.DESPESA:
        return {
          label: 'Despesa', appearance: 'negative', icon: 'banknote-arrow-down'
        };
      case CategoriaTipo.RESERVA:
        return {
          label: 'Reserva', appearance: 'positive', icon: 'piggy-bank'
        };
    }
  }