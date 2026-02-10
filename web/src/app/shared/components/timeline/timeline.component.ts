import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output, computed } from '@angular/core';
import { TuiIcon } from '@taiga-ui/core';
import { CurrencyPipe } from '../../pipes/currency.pipe';
import { CategoriaTipo } from '../../interfaces';

export interface TimelineItem {
    id: number;
    data: string;
    categoriaTipo: CategoriaTipo | string;
    categoriaNome: string;
    descricao: string;
    valor: number;
    raw: any;
}

export interface TimelineGroup {
    data: string;
    dataFormatada: string;
    items: TimelineItem[];
}

@Component({
    selector: 'app-timeline',
    standalone: true,
    imports: [CommonModule, TuiIcon, CurrencyPipe],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './timeline.component.html',
    styleUrls: ['./timeline.component.scss']
})
export class TimelineComponent {
    readonly items = input.required<TimelineItem[]>();
    readonly edit = output<any>();
    readonly delete = output<any>();
    readonly duplicate = output<any>();

    readonly groups = computed<TimelineGroup[]>(() => {
        const items = this.items();
        const grouped = new Map<string, TimelineItem[]>();

        for (const item of items) {
            const key = item.data;
            if (!grouped.has(key)) {
                grouped.set(key, []);
            }
            grouped.get(key)!.push(item);
        }

        return Array.from(grouped.entries())
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([data, groupItems]) => ({
                data,
                dataFormatada: this.formatDate(data),
                items: groupItems,
            }));
    });

    getIcon(tipo: CategoriaTipo | string): string {
        switch (tipo) {
            case CategoriaTipo.RECEITA:
            case 'RECEITA':
                return '@tui.arrow-down-left';
            case CategoriaTipo.DESPESA:
            case 'DESPESA':
                return '@tui.arrow-up-right';
            case CategoriaTipo.RESERVA:
            case 'RESERVA':
                return '@tui.piggy-bank';
            default:
                return '@tui.circle-dollar-sign';
        }
    }

    getIconClass(tipo: CategoriaTipo | string): string {
        switch (tipo) {
            case CategoriaTipo.RECEITA:
            case 'RECEITA':
                return 'icon-receita';
            case CategoriaTipo.DESPESA:
            case 'DESPESA':
                return 'icon-despesa';
            case CategoriaTipo.RESERVA:
            case 'RESERVA':
                return 'icon-reserva';
            default:
                return 'icon-default';
        }
    }

    getValorClass(tipo: CategoriaTipo | string): string {
        switch (tipo) {
            case CategoriaTipo.RECEITA:
            case 'RECEITA':
                return 'valor-receita';
            case CategoriaTipo.DESPESA:
            case 'DESPESA':
                return 'valor-despesa';
            default:
                return '';
        }
    }

    getDisplayValor(item: TimelineItem): number {
        if (item.categoriaTipo === 'DESPESA' || item.categoriaTipo === CategoriaTipo.DESPESA) {
            return item.valor;
        }
        return item.valor;
    }

    onEdit(item: TimelineItem) {
        this.edit.emit(item.raw);
    }

    onDelete(item: TimelineItem) {
        this.delete.emit(item.raw);
    }

    onDuplicate(item: TimelineItem) {
        this.duplicate.emit(item.raw);
    }

    private formatDate(dateStr: string): string {
        const [year, month, day] = dateStr.split('-').map(Number);
        return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year.toString().slice(-2)}`;
    }
}
