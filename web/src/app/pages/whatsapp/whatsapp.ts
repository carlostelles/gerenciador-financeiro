import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { interval, startWith, Subject, switchMap, takeUntil } from 'rxjs';
import { TuiBadge } from '@taiga-ui/kit';
import { TuiTable } from '@taiga-ui/addon-table';
import { WhatsappService } from '../../core/services/whatsapp.service';
import { ToastService } from '../../shared/services/toast.service';
import {
  WhatsappInboundMessage,
  WhatsappInboundProcessingStatus,
} from '../../shared/interfaces';

@Component({
  selector: 'app-whatsapp',
  standalone: true,
  imports: [CommonModule, FormsModule, TuiBadge, TuiTable],
  templateUrl: './whatsapp.html',
  styleUrls: ['./whatsapp.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WhatsappComponent implements OnInit, OnDestroy {
  private readonly whatsappService = inject(WhatsappService);
  private readonly toast = inject(ToastService);
  private readonly destroy$ = new Subject<void>();

  protected readonly inboundMessages = signal<WhatsappInboundMessage[]>([]);
  protected readonly isLoading = signal<boolean>(true);
  protected readonly statusFilter = signal<WhatsappInboundProcessingStatus | ''>('');

  ngOnInit(): void {
    interval(10000)
      .pipe(
        startWith(0),
        switchMap(() =>
          this.whatsappService.listarInbound(this.statusFilter() || undefined, 100),
        ),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (messages) => {
          this.inboundMessages.set(messages);
          this.isLoading.set(false);
        },
        error: (error) => {
          console.error('Erro ao carregar inbox WhatsApp inbound', error);
          this.isLoading.set(false);
          this.toast.error('Nao foi possivel carregar o historico inbound do WhatsApp.');
        },
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected onStatusFilterChange(value: WhatsappInboundProcessingStatus | ''): void {
    this.statusFilter.set(value);
    this.isLoading.set(true);
    this.whatsappService
      .listarInbound(value || undefined, 100)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (messages) => {
          this.inboundMessages.set(messages);
          this.isLoading.set(false);
        },
        error: (error) => {
          console.error('Erro ao filtrar inbox inbound', error);
          this.isLoading.set(false);
          this.toast.error('Nao foi possivel aplicar o filtro de status.');
        },
      });
  }

  protected statusBadgeAppearance(status: WhatsappInboundProcessingStatus): 'positive' | 'neutral' | 'warning' | 'negative' {
    if (status === 'PROCESSADA') {
      return 'positive';
    }
    if (status === 'RECEBIDA') {
      return 'neutral';
    }
    if (status === 'IGNORADA_NAO_SUPORTADA') {
      return 'warning';
    }
    return 'negative';
  }
}
