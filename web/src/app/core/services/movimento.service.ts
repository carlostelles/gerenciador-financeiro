import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CreateMovimentoDto, Movimento, UpdateMovimentoDto, CategoriasForPeriodoResponse, MovimentoFiltro } from '../../shared';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class MovimentoService {
  private readonly baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getAll(periodo: string, filtro?: MovimentoFiltro): Observable<Movimento[]> {
    let params = new HttpParams();
    if (filtro?.categoriaId) {
      params = params.set('categoriaId', filtro.categoriaId);
    }
    if (filtro?.contaId) {
      params = params.set('contaId', filtro.contaId);
    }
    if (filtro?.descricao) {
      params = params.set('descricao', filtro.descricao);
    }
    return this.http.get<Movimento[]>(`${this.baseUrl}/movimentacoes/${periodo}`, { params });
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

  findPeriodos(): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}/movimentacoes/periodos`);
  }

  findCategoriasForPeriodo(periodo: string): Observable<CategoriasForPeriodoResponse> {
    return this.http.get<CategoriasForPeriodoResponse>(`${this.baseUrl}/movimentacoes/${periodo}/categorias`);
  }
}