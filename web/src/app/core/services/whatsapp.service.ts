import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  WhatsappInboundMessage,
  WhatsappInboundProcessingStatus,
} from '../../shared/interfaces';

@Injectable({
  providedIn: 'root',
})
export class WhatsappService {
  private readonly baseUrl = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  listarInbound(
    status?: WhatsappInboundProcessingStatus,
    limit = 100,
  ): Observable<WhatsappInboundMessage[]> {
    let params = new HttpParams().set('limit', String(limit));
    if (status) {
      params = params.set('status', status);
    }

    return this.http.get<WhatsappInboundMessage[]>(`${this.baseUrl}/whatsapp/inbound`, { params });
  }
}
