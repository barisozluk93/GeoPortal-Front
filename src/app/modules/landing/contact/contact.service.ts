import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { ResultModel } from 'src/app/models/result.model';
import { PagingResult } from 'src/app/models/paging-result.model';
import { SupportTicketModel } from '../../support-management/models/support-ticket.model';

const API_CONTACT_URL = `${environment.apiUrl}/Contact`;

@Injectable({
  providedIn: 'root',
})
export class ContactService {
  constructor(private http: HttpClient) {}

  create(model: SupportTicketModel): Observable<ResultModel<SupportTicketModel>> {
    return this.http.post<ResultModel<SupportTicketModel>>(`${API_CONTACT_URL}/Create`, model);
  }
}
