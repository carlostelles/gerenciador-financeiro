import { HttpClient } from '@angular/common/http';
import { Injectable, computed, signal } from '@angular/core';
import { tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Espaco, EspacoPapel } from '../../shared/interfaces';

interface EspacoVinculoResponse {
  papel: EspacoPapel;
  espaco: Omit<Espaco, 'papel'>;
}

@Injectable({ providedIn: 'root' })
export class EspacoContextService {
  readonly spaces = signal<Espaco[]>([]);
  readonly selected = signal<Espaco | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly canEdit = computed(() => {
    const papel = this.selected()?.papel;
    return papel === 'OWNER' || papel === 'EDITOR';
  });
  readonly isOwner = computed(() => this.selected()?.papel === 'OWNER');

  constructor(private readonly http: HttpClient) {}

  load() {
    this.loading.set(true);
    this.error.set(null);
    return this.http
      .get<EspacoVinculoResponse[]>(`${environment.apiUrl}/espacos`)
      .pipe(
        tap({
          next: (vinculos) => {
            const spaces = vinculos.map(({ papel, espaco }) => ({
              ...espaco,
              papel,
            }));
            this.spaces.set(spaces);
            const persistedId = Number(sessionStorage.getItem('espacoId'));
            const selected =
              spaces.find((space) => space.id === persistedId) ??
              spaces[0] ??
              null;
            this.selected.set(selected);
            if (selected) {
              sessionStorage.setItem('espacoId', String(selected.id));
            } else {
              sessionStorage.removeItem('espacoId');
            }
            this.loading.set(false);
          },
          error: () => {
            this.spaces.set([]);
            this.selected.set(null);
            sessionStorage.removeItem('espacoId');
            this.error.set('Não foi possível carregar os espaços.');
            this.loading.set(false);
          },
        }),
      );
  }

  select(espacoId: number): void {
    const selected = this.spaces().find((space) => space.id === espacoId);
    if (!selected) return;
    this.selected.set(selected);
    sessionStorage.setItem('espacoId', String(espacoId));
  }
}
