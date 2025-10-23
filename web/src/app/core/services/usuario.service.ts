import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Usuario, CreateUsuarioDto, UpdateUsuarioDto } from '../../shared/interfaces';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UsuarioService {
  private readonly baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  create(usuario: CreateUsuarioDto): Observable<Usuario> {
    return this.http.post<Usuario>(`${this.baseUrl}/usuarios`, usuario);
  }

  getAll(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(`${this.baseUrl}/usuarios`);
  }

  getById(id: number): Observable<Usuario> {
    return this.http.get<Usuario>(`${this.baseUrl}/usuarios/${id}`);
  }

  update(id: number, usuario: UpdateUsuarioDto): Observable<Usuario> {
    return this.http.put<Usuario>(`${this.baseUrl}/usuarios/${id}`, usuario);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/usuarios/${id}`);
  }
}