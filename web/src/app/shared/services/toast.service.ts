import { inject, Injectable } from '@angular/core';
import { TuiAlertService } from '@taiga-ui/core';

export type ToastAppearance = 'info' | 'positive' | 'negative' | 'warning' | 'neutral';

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private readonly alerts = inject(TuiAlertService);

  show(message: string, appearance: ToastAppearance = 'neutral', autoClose: number = 5000): void {
    this.alerts.open(message, {
      appearance,
      autoClose
    }).subscribe();
  }

  success(message: string, autoClose: number = 5000): void {
    this.alerts.open(message, {
      appearance: 'positive',
      autoClose
    }).subscribe();
  }

  error(message: string, autoClose: number = 5000): void {
    this.alerts.open(message, {
      appearance: 'negative',
      autoClose
    }).subscribe();
  }

  info(message: string, autoClose: number = 5000): void {
    this.alerts.open(message, {
      appearance: 'info',
      autoClose
    }).subscribe();
  }

  warning(message: string, autoClose: number = 5000): void {
    this.alerts.open(message, {
      appearance: 'warning',
      autoClose
    }).subscribe();
  }
}