import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CreateMovimentoDto, Movimento, UpdateMovimentoDto } from '../../shared';

@Injectable({
  providedIn: 'root'
})
export class MovimentoService {
  private readonly baseUrl = '/api';

  constructor(private http: HttpClient) {}

  getAll(periodo: string): Observable<Movimento[]> {
    return this.http.get<Movimento[]>(`${this.baseUrl}/movimentacoes/${periodo}`);
  }

  getById(periodo: string, id: number): Observable<Movimento> {
    return this.http.get<Movimento>(`${this.baseUrl}/movimentacoes/${periodo}/${id}`);
  }

  create(periodo: string, categoria: CreateMovimentoDto): Observable<Movimento> {
    return this.http.post<Movimento>(`${this.baseUrl}/movimentacoes/${periodo}`, categoria);
  }

  update(periodo: string, id: number, categoria: UpdateMovimentoDto): Observable<Movimento> {
    return this.http.patch<Movimento>(`${this.baseUrl}/movimentacoes/${periodo}/${id}`, categoria);
  }

  delete(periodo: string, id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/movimentacoes/${periodo}/${id}`);
  }
}