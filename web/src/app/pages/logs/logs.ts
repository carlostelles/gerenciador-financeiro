import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { TuiButton, TuiIcon, TuiDialogService } from '@taiga-ui/core';
import { TuiBadge } from '@taiga-ui/kit';
import { TuiTable, TuiTableControl } from '@taiga-ui/addon-table';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';

import { LogService } from '../../core/services/log.service';
import { Log } from '../../shared/interfaces';
import { ToastService } from '../../shared/services/toast.service';
import { LogDetalhesComponent } from './components/detalhes/detalhes';
import { getAcaoBadge, getEntidadeBadge } from '../../shared';

@Component({
  selector: 'app-logs',
  standalone: true,
  imports: [
    CommonModule,
    TuiButton,
    TuiIcon,
    TuiTable,
    TuiTableControl,
    TuiBadge
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './logs.html',
  styleUrls: ['./logs.scss']
})
export class LogsComponent implements OnInit {
  private readonly logService = inject(LogService);
  private readonly toast = inject(ToastService);
  private readonly dialogs = inject(TuiDialogService);

  protected readonly getAcaoBadge = getAcaoBadge;
  protected readonly getEntidadeBadge = getEntidadeBadge;

  logs = signal<Log[]>([]);
  isLoading = signal<boolean>(false);

  ngOnInit() {
    this.loadLogs();
  }

  loadLogs() {
    this.isLoading.set(true);
    this.logService.getAll().subscribe({
      next: (logs) => {
        this.logs.set(logs);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Erro ao carregar logs:', error);
        this.isLoading.set(false);
        this.toast.error('Erro ao carregar logs');
      }
    });
  }

  formatUser(usuarioId: number): string {
    return `Usuário #${usuarioId}`;
  }

  viewDetails(log: Log) {
    this.dialogs
      .open<void>(
        new PolymorpheusComponent(LogDetalhesComponent),
        {
          data: log,
          dismissible: true,
          label: 'Detalhes do Log',
          size: 'l'
        }
      )
      .subscribe();
  }

  trackByFn(index: number, item: Log): string {
    return item._id;
  }
}