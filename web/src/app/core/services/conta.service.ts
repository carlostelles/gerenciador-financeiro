import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Conta, CreateContaDto, UpdateContaDto } from '../../shared/interfaces';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ContaService {
  private readonly baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Conta[]> {
    return this.http.get<Conta[]>(`${this.baseUrl}/contas`);
  }

  getById(id: number): Observable<Conta> {
    return this.http.get<Conta>(`${this.baseUrl}/contas/${id}`);
  }

  create(conta: CreateContaDto): Observable<Conta> {
    return this.http.post<Conta>(`${this.baseUrl}/contas`, conta);
  }

  update(id: number, conta: UpdateContaDto): Observable<Conta> {
    return this.http.patch<Conta>(`${this.baseUrl}/contas/${id}`, conta);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/contas/${id}`);
  }
}
