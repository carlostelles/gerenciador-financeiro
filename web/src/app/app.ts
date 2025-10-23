import { TuiRoot } from "@taiga-ui/core";
import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { AuthService } from "./core/services/auth.service";

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, TuiRoot],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  protected readonly authService = inject(AuthService);

  ngOnInit(): void {
    this.autoRefreshToken();
  }

  autoRefreshToken() {
    if (this.authService.isAuthenticated && this.authService.isTokenExpiring) {
      this.authService.refresh({ refreshToken: this.authService.refreshToken! }).subscribe();
    }

    setTimeout(() => {
      this.autoRefreshToken();
    }, this.authService.timeToExpiration * 1000 - 30000); // 30 segundos antes de expirar
  }
}
