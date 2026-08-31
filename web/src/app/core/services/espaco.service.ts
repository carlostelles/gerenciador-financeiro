import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { environment } from '../../../environments/environment';
import { Espaco, EspacoMembro, EspacoPapel } from '../../shared/interfaces';

@Injectable({ providedIn: 'root' })
export class EspacoService {
  private readonly url = `${environment.apiUrl}/espacos`;

  constructor(private readonly http: HttpClient) {}

  create(nome: string) {
    return this.http.post<Omit<Espaco, 'papel'>>(this.url, { nome });
  }

  rename(espacoId: number, nome: string) {
    return this.http.patch<Omit<Espaco, 'papel'>>(`${this.url}/${espacoId}`, {
      nome,
    });
  }

  remove(espacoId: number) {
    return this.http.delete<void>(`${this.url}/${espacoId}`);
  }

  members(espacoId: number) {
    return this.http.get<EspacoMembro[]>(`${this.url}/${espacoId}/membros`);
  }

  addMember(espacoId: number, email: string, papel: EspacoPapel) {
    return this.http.post<EspacoMembro>(`${this.url}/${espacoId}/membros`, {
      email,
      papel,
    });
  }

  updateMember(espacoId: number, usuarioId: number, papel: EspacoPapel) {
    return this.http.patch<EspacoMembro>(
      `${this.url}/${espacoId}/membros/${usuarioId}`,
      { papel },
    );
  }

  removeMember(espacoId: number, usuarioId: number) {
    return this.http.delete<void>(`${this.url}/${espacoId}/membros/${usuarioId}`);
  }

  leave(espacoId: number) {
    return this.http.post<void>(`${this.url}/${espacoId}/sair`, {});
  }

  transfer(espacoId: number, usuarioId: number) {
    return this.http.post<void>(`${this.url}/${espacoId}/transferir-propriedade`, {
      usuarioId,
    });
  }
}
