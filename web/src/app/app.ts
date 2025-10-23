import { TuiRoot } from "@taiga-ui/core";
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';

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

  ngOnInit(): void {
    this.scheduleTokenRefresh();
  }

  private scheduleTokenRefresh(): void {
    // Limpa qualquer timeout anterior
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
    }

    // Só agenda se estiver autenticado
    if (!this.authService.isAuthenticated) {
      return;
    }

    const timeToExpiration = this.authService.timeToExpiration;
    
    // Se o tempo para expiração for menor que 1 minuto, já renova
    if (timeToExpiration <= 1) {
      this.performTokenRefresh();
      return;
    }

    // Agenda para 30 segundos antes do token expirar
    const timeoutMs = Math.max(0, (timeToExpiration - 0.5) * 60 * 1000); // 0.5 min = 30 segundos
    
    this.refreshTimeout = window.setTimeout(() => {
      this.performTokenRefresh();
    }, timeoutMs);
  }

  private performTokenRefresh(): void {
    if (!this.authService.isAuthenticated || !this.authService.refreshToken) {
      return;
    }

    this.authService.refresh({ refreshToken: this.authService.refreshToken }).subscribe({
      next: () => {
        // Token renovado com sucesso, agenda o próximo refresh
        this.scheduleTokenRefresh();
      },
      error: () => {
        // Em caso de erro, limpa o timeout
        if (this.refreshTimeout) {
          clearTimeout(this.refreshTimeout);
        }
      }
    });
  }

  ngOnDestroy(): void {
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
    }
  }
}
