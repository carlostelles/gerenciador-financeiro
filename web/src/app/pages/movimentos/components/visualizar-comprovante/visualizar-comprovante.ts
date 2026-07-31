import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { TuiButton, TuiDialogContext, TuiIcon } from '@taiga-ui/core';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';

import { MovimentoService } from '../../../../core/services/movimento.service';
import { MovimentoComprovante } from '../../../../shared';

@Component({
    selector: 'app-visualizar-comprovante',
    standalone: true,
    imports: [CommonModule, TuiButton, TuiIcon],
    changeDetection: ChangeDetectionStrategy.OnPush,
        template: `
            <section class="viewer">
                @if (isLoading()) {
                    <p class="viewer-message">Carregando arquivo...</p>
                } @else if (error()) {
                    <p class="viewer-message error-message">{{ error() }}</p>
                } @else if (isPdf) {
                    <iframe class="pdf-viewer" [src]="pdfUrl()" [title]="comprovante.nomeArquivo"></iframe>
                } @else {
                    <img class="image-viewer" [src]="url()" [alt]="comprovante.nomeArquivo" />
                }
                <footer class="viewer-actions">
                    @if (url()) {
                        <a tuiButton appearance="secondary" [href]="url()" target="_blank" rel="noopener" download>
                            <tui-icon icon="@tui.download" /> Baixar
                        </a>
                    }
                    <button tuiButton type="button" (click)="fechar()">Fechar</button>
                </footer>
            </section>
        `,
        styles: [`
            .viewer { display: flex; flex-direction: column; min-height: 32rem; max-height: 75vh; }
            .viewer-message { display: grid; flex: 1; place-items: center; margin: 0; }
            .error-message { color: var(--tui-text-negative); }
            .pdf-viewer, .image-viewer { flex: 1; width: 100%; min-height: 32rem; border: 0; object-fit: contain; }
            .viewer-actions { display: flex; justify-content: flex-end; gap: .75rem; padding-top: 1rem; }
        `],
})
export class VisualizarComprovanteComponent implements OnInit {
    private readonly movimentoService = inject(MovimentoService);
    private readonly sanitizer = inject(DomSanitizer);
    private readonly context = inject<TuiDialogContext<void, MovimentoComprovante>>(POLYMORPHEUS_CONTEXT);

    protected readonly isLoading = signal(true);
    protected readonly error = signal<string | null>(null);
    protected readonly url = signal<string | null>(null);
    protected readonly pdfUrl = signal<SafeResourceUrl | null>(null);

    protected get comprovante(): MovimentoComprovante {
        return this.context.data;
    }

    protected get isPdf(): boolean {
        return this.comprovante.tipoArquivo === 'application/pdf';
    }

    ngOnInit(): void {
        this.movimentoService.getUrlVisualizacaoComprovante(this.comprovante.id).subscribe({
            next: ({ url }) => {
                this.url.set(url);
                if (this.isPdf) {
                    this.pdfUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(url));
                }
                this.isLoading.set(false);
            },
            error: () => {
                this.error.set('Não foi possível carregar o arquivo anexado.');
                this.isLoading.set(false);
            },
        });
    }

    protected fechar(): void {
        this.context.$implicit.complete();
    }
}
