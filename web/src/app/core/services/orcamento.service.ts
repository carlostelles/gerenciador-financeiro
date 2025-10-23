import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Orcamento,
  CreateOrcamentoDto,
  UpdateOrcamentoDto,
  OrcamentoItem,
  CreateOrcamentoItemDto,
  UpdateOrcamentoItemDto
} from '../../shared/interfaces/orcamento.interface';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class OrcamentoService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;
  private readonly apiUrl = `${this.baseUrl}/orcamentos`;

  // CRUD básico de orçamentos
  getAll(): Observable<Orcamento[]> {
    return this.http.get<Orcamento[]>(this.apiUrl);
  }

  getById(id: number): Observable<Orcamento> {
    return this.http.get<Orcamento>(`${this.apiUrl}/${id}`);
  }

  create(orcamento: CreateOrcamentoDto): Observable<Orcamento> {
    return this.http.post<Orcamento>(this.apiUrl, orcamento);
  }

  update(id: number, orcamento: UpdateOrcamentoDto): Observable<Orcamento> {
    return this.http.patch<Orcamento>(`${this.apiUrl}/${id}`, orcamento);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  findPeriodos(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/periodos`);
  }

  // Operações especiais
  clone(id: number, periodo: string): Observable<Orcamento> {
    return this.http.post<Orcamento>(`${this.apiUrl}/${id}/clonar/${periodo}`, {});
  }

  // CRUD de itens de orçamento
  getItems(orcamentoId: number): Observable<OrcamentoItem[]> {
    return this.http.get<OrcamentoItem[]>(`${this.apiUrl}/${orcamentoId}/itens`);
  }

  getItem(orcamentoId: number, itemId: number): Observable<OrcamentoItem> {
    return this.http.get<OrcamentoItem>(`${this.apiUrl}/${orcamentoId}/itens/${itemId}`);
  }

  createItem(orcamentoId: number, item: CreateOrcamentoItemDto): Observable<OrcamentoItem> {
    return this.http.post<OrcamentoItem>(`${this.apiUrl}/${orcamentoId}/itens`, item);
  }

  updateItem(orcamentoId: number, itemId: number, item: UpdateOrcamentoItemDto): Observable<OrcamentoItem> {
    return this.http.patch<OrcamentoItem>(`${this.apiUrl}/${orcamentoId}/itens/${itemId}`, item);
  }

  deleteItem(orcamentoId: number, itemId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${orcamentoId}/itens/${itemId}`);
  }

  // Buscar orçamento por período
  findByPeriodo(periodo: string): Observable<Orcamento | null> {
    return this.http.get<Orcamento | null>(`${this.apiUrl}/periodo/${periodo}`);
  }
}
