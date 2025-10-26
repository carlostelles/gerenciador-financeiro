import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TuiButton, TuiDialogContext } from '@taiga-ui/core';
import { injectContext } from '@taiga-ui/polymorpheus';
import { TuiBadge } from '@taiga-ui/kit';

import { Log, getAcaoBadge } from '../../../../shared';

@Component({
  selector: 'app-log-detalhes',
  imports: [
    CommonModule,
    TuiButton,
    TuiBadge
  ],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './detalhes.html',
  styleUrl: './detalhes.scss'
})
export class LogDetalhesComponent {
  protected readonly context = injectContext<TuiDialogContext<string, Log>>();
  protected log: Log = this.context.data;
  protected readonly getAcaoBadge = getAcaoBadge;
  

  onClose() {
    this.context.completeWith('');
  }
}