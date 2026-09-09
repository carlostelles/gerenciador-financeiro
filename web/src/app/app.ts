import { TuiRoot } from "@taiga-ui/core";
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Subscription } from 'rxjs';

import { AuthService } from "./core/services/auth.service";

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, TuiRoot],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit, OnDestroy {
  protected readonly authService = inject(AuthService);
  private refreshTimeout?: number;
  private readonly subscriptions = new Subscription();

  ngOnInit(): void {
    // Também reage ao login e às renovações feitas pelos interceptadores/guardas.
    this.subscriptions.add(this.authService.isAuthenticated$.subscribe(() => {
      this.scheduleTokenRefresh();
    }));
  }

  private scheduleTokenRefresh(): void {
    // Limpa qualquer timeout anterior
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
    }

    // Access token expirado não invalida uma sessão que ainda pode ser renovada.
    if (!this.authService.refreshToken) {
      return;
    }

    const remainingMs = this.authService.timeToExpiration * 60 * 1000;
    // Limita a margem para não criar um loop imediato com tokens de curta duração.
    const timeoutMs = Math.max(0, remainingMs - Math.min(30_000, remainingMs * 0.1));

    this.refreshTimeout = window.setTimeout(() => {
      this.performTokenRefresh();
    }, timeoutMs);
  }

  private performTokenRefresh(): void {
    if (!this.authService.refreshToken) {
      return;
    }

    this.subscriptions.add(this.authService.refresh({ refreshToken: this.authService.refreshToken }).subscribe({
      error: () => {
        // Falhas transitórias não encerram a sessão; 401 já a limpa no serviço.
        if (this.authService.refreshToken) {
          this.refreshTimeout = window.setTimeout(() => this.performTokenRefresh(), 30_000);
        }
      }
    }));
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
    }
  }
}
