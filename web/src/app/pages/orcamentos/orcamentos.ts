import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { TuiButton, TuiDialogService, TuiIcon } from '@taiga-ui/core';
import { TuiBadge, TuiConfirmService, TuiTooltip } from '@taiga-ui/kit';
import {TuiTable, TuiTableControl} from '@taiga-ui/addon-table';

import { OrcamentoService } from '../../core/services/orcamento.service';
import { OrcamentosCadastroComponent } from './components/cadastro/cadastro';
import { OrcamentosItemCadastroComponent } from './components/cadastro-item/cadastro-item';
import { formatPeriod, FormatPeriodPipe, CurrencyPipe, Orcamento, PromptService, ToastService } from '../../shared';
import { OrcamentosCloneComponent } from './components/clone/clone';

@Component({
    selector: 'app-orcamentos',
    standalone: true,
    imports: [
        CommonModule,
        TuiButton,
        TuiBadge,
        TuiIcon,
        TuiTooltip,
        TuiTable,
        TuiTableControl,
        CurrencyPipe,
        FormatPeriodPipe
    ],
    providers: [TuiConfirmService],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './orcamentos.html',
    styleUrls: ['./orcamentos.scss']
})
export class OrcamentosComponent implements OnInit {
    private readonly orcamentoService = inject(OrcamentoService);
    private readonly promptService = inject(PromptService);
    private readonly dialogs = inject(TuiDialogService);
    private readonly toast = inject(ToastService);

    orcamentos: Orcamento[] = [];
    isLoading = signal<boolean>(false);

    ngOnInit() {
        this.loadOrcamentos();
    }

    loadOrcamentos() {
        this.isLoading.set(true);
        this.orcamentoService.getAll().subscribe({
            next: (orcamentos) => {
                console.log(orcamentos);
                this.orcamentos = orcamentos;
                this.isLoading.set(false);
            },
            error: (error) => {
                console.error('Erro ao carregar orçamentos:', error);
                this.isLoading.set(false);
            }
        });
    }

    openFormModal(orcamento?: Orcamento) {
        this.dialogs
            .open<string>(new PolymorpheusComponent(OrcamentosCadastroComponent), {
                label: orcamento ? 'Editar orçamento' : 'Cadastrar orçamento',
                size: 'm',
                data: orcamento,
            })
            .subscribe({
                next: () => {
                    if (!orcamento) {
                        this.toast.success('Orçamento criado com sucesso!');
                        setTimeout(() => {
                            this.openFormItensModal(orcamento);
                        }, 100);
                    }
                    this.loadOrcamentos();
                },
                error: (error) => {
                    console.error('Erro ao salvar orçamento:', error);
                }
            });
    }

    openFormItensModal(orcamento?: Orcamento) {
        this.dialogs
            .open<string>(new PolymorpheusComponent(OrcamentosItemCadastroComponent), {
                label: orcamento ? 'Editar orçamento' : 'Cadastrar orçamento',
                size: 'l',
                data: orcamento,
            })
            .subscribe({
                next: () => {
                    this.loadOrcamentos();
                },
                error: (error) => {
                    console.error('Erro ao salvar orçamento:', error);
                }
            });
    }

    confirmDelete(orcamento: Orcamento) {
        this.promptService
            .open(`O orçamento <strong>${orcamento.descricao}</strong> do período <strong>${formatPeriod(orcamento.periodo)}</strong> será excluído. Esta ação não pode ser desfeita.`, {
                heading: 'Confirmação de Exclusão',
                buttons: [
                    { label: 'Excluir', appearance: 'accent', icon: 'trash' },
                    { label: 'Cancelar', appearance: 'outline' }
                ]
            })
            .subscribe((result) => {
                if (result) {
                    this.orcamentoService.delete(orcamento.id).subscribe({
                        next: () => {
                            this.toast.warning('Orçamento excluído com sucesso!');
                            this.loadOrcamentos();
                        },
                        error: (error) => {
                            console.error('Erro ao excluir orçamento:', error);
                        }
                    });
                }
            });
    }

    confirmClone(orcamento: Orcamento) {
       this.dialogs
            .open<string>(new PolymorpheusComponent(OrcamentosCloneComponent), {
                label: 'Clonar orçamento',
                size: 's',
                data: orcamento,
            })
            .subscribe({
                next: () => {
                    this.loadOrcamentos();
                },
                error: (error) => {
                    console.error('Erro ao clonar orçamento:', error);
                }
            });
    }

    getTotalOrcamento(orcamento: Orcamento): number {
        return orcamento.items?.reduce((total, item) => Number(total) + Number(item.valor), 0) || 0;
    }

    trackByFn(index: number, item: Orcamento): number {
        return item.id;
    }
}