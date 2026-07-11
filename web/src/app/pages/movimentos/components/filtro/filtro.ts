import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TuiButton, TuiDataList, TuiDialogContext, TuiTextfield } from '@taiga-ui/core';
import { TuiChevron, TuiComboBox } from '@taiga-ui/kit';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';
import { TuiStringHandler } from '@taiga-ui/cdk';
import { TuiForm } from '@taiga-ui/layout';

import { CategoriaService } from '../../../../core/services/categoria.service';
import { ContaService } from '../../../../core/services/conta.service';
import { Categoria, Conta, MovimentoFiltro } from '../../../../shared';

@Component({
    selector: 'app-movimentos-filtro',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        TuiButton,
        TuiTextfield,
        TuiChevron,
        TuiComboBox,
        TuiDataList,
        TuiForm,
    ],
    templateUrl: './filtro.html',
    styleUrls: ['./filtro.scss']
})
export class MovimentosFiltroComponent implements OnInit {
    private readonly fb = inject(FormBuilder);
    private readonly categoriaService = inject(CategoriaService);
    private readonly contaService = inject(ContaService);
    private readonly context = inject<TuiDialogContext<MovimentoFiltro | null, MovimentoFiltro | undefined>>(POLYMORPHEUS_CONTEXT);

    filtroForm!: FormGroup;
    protected readonly categorias = signal<Categoria[]>([]);
    protected readonly contas = signal<Conta[]>([]);

    protected readonly categoriaStringify: TuiStringHandler<number> = (id) =>
        this.categorias().find((categoria) => categoria.id === id)?.nome ?? '';
    protected readonly contaStringify: TuiStringHandler<number> = (id) =>
        this.contas().find((conta) => conta.id === id)?.nome ?? '';

    ngOnInit() {
        this.filtroForm = this.fb.group({
            categoriaId: [null],
            contaId: [null],
            descricao: [this.context.data?.descricao ?? ''],
        });

        this.categoriaService.getAll().subscribe({
            next: (categorias) => {
                this.categorias.set([...categorias].sort((a, b) => a.nome.localeCompare(b.nome)));
                this.filtroForm.patchValue({ categoriaId: this.context.data?.categoriaId ?? null });
            },
            error: (error) => {
                console.error('Erro ao carregar categorias:', error);
            }
        });

        this.contaService.getAll().subscribe({
            next: (contas) => {
                this.contas.set(contas);
                this.filtroForm.patchValue({ contaId: this.context.data?.contaId ?? null });
            },
            error: (error) => {
                console.error('Erro ao carregar contas:', error);
            }
        });
    }

    onSubmit() {
        const { categoriaId, contaId, descricao } = this.filtroForm.value;
        const filtro: MovimentoFiltro = {
            categoriaId: categoriaId ?? undefined,
            contaId: contaId ?? undefined,
            descricao: (descricao || '').trim() || undefined,
        };
        this.context.completeWith(filtro);
    }

    onClear() {
        this.context.completeWith(null);
    }

    onCancel() {
        this.context.$implicit.complete();
    }
}
