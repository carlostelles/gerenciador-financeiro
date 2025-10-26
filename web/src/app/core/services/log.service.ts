import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Log } from '../../shared/interfaces';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class LogService {
  private readonly baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Log[]> {
    return this.http.get<Log[]>(`${this.baseUrl}/logs`);
  }

  getById(id: string): Observable<Log> {
    return this.http.get<Log>(`${this.baseUrl}/logs/${id}`);
  }
}