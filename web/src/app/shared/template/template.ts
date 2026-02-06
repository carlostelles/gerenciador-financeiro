import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';
import {
  TuiAppearance,
  TuiButton,
  TuiDataList,
  TuiDropdown,
  TuiIcon,
  TuiLink,
  TuiTextfield,
} from '@taiga-ui/core';
import {
  TuiBadge,
  TuiBreadcrumbs,
  TuiFade,
  TuiTabs,
} from '@taiga-ui/kit';
import { TuiNavigation } from '@taiga-ui/layout';
import { AuthService } from '../../core/services/auth.service';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-template',
  standalone: true,
  imports: [
    FormsModule,
    CommonModule,
    RouterLink,
    RouterLinkActive,
    TuiAppearance,
    TuiBadge,
    TuiBreadcrumbs,
    TuiButton,
    TuiDataList,
    TuiDropdown,
    TuiFade,
    TuiIcon,
    TuiLink,
    TuiNavigation,
    TuiTabs,
    TuiTextfield,
    RouterModule,
  ],
  templateUrl: './template.html',
  styleUrls: ['./template.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TemplateComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly breadcrumbs = ['Home', 'Dashboard'];

  protected readonly expanded = signal(false);
  protected readonly isAdmin = signal(false); // Será implementado com dados reais do usuário
  protected readonly pageTitle = signal('Dashboard');
  protected readonly userName = signal('Usuário'); // Será implementado com dados reais do usuário

  constructor() {
    // Monitora mudanças de rota para atualizar o título da página
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.updatePageTitle(event.url);
    });
  }

  ngOnInit(): void {
    this.isAdmin.set(this.authService.decodedToken?.role === 'ADMIN');
  }
 
  protected handleToggle(): void {
      this.expanded.update((e) => !e);
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => {
        // O redirecionamento é feito no serviço
      },
      error: () => {
        // Mesmo com erro, limpa os dados locais
        sessionStorage.clear();
        this.router.navigate(['/login']);
      }
    });
  }

  private updatePageTitle(url: string): void {
    const routeTitles: { [key: string]: string } = {
      '/home': 'Dashboard',
      '/categorias': 'Categorias',
      '/orcamentos': 'Orçamentos',
      '/movimentacoes': 'Movimentações',
      '/reservas': 'Reservas',
      '/usuarios': 'Usuários',
      '/logs': 'Logs'
    };

    this.pageTitle.set(routeTitles[url] || 'Dashboard');
  }
}
