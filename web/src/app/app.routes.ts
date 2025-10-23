import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./shared/template/template').then(m => m.TemplateComponent),
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'home'
      },
      {
        path: 'home',
        loadComponent: () => import('./pages/home/home').then(m => m.HomeComponent)
      },
      {
        path: 'categorias',
        loadComponent: () => import('./pages/categorias/categorias').then(m => m.CategoriasComponent)
      },
      {
        path: 'orcamentos',
        loadComponent: () => import('./pages/orcamentos/orcamentos').then(m => m.OrcamentosComponent)
      },
      {
        path: 'movimentacoes',
        loadComponent: () => import('./pages/movimentos/movimentos').then(m => m.MovimentosComponent)
      }
    ]
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then(m => m.LoginComponent)
  },
  {
    path: 'signup',
    loadComponent: () => import('./pages/signup/signup').then(m => m.SignupComponent)
  },
  {
    path: '**',
    redirectTo: ''
  }
];
