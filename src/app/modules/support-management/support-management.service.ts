import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ResultModel } from 'src/app/models/result.model';
import { SupportTicketModel } from './models/support-ticket.model';
import { PagingResult } from 'src/app/models/paging-result.model';

const API_SUPPORT_URL = `${environment.apiUrl}/AdminTickets`;

@Injectable({
  providedIn: 'root',
})
export class SupportManagementService {
  constructor(private http: HttpClient) { }

  paging(pageNumber: number, pageSize: number, filterParams?: HttpParams
  ): Observable<ResultModel<PagingResult<SupportTicketModel[]>>> {

    let params = filterParams ?? new HttpParams();
    params = params
      .set("PageNumber", pageNumber)
      .set("PageSize", pageSize);

    return this.http.get<ResultModel<PagingResult<SupportTicketModel[]>>>(`${API_SUPPORT_URL}/Paginate`,
      { params });
  }

  getTicketById(id: number): Observable<ResultModel<any>> {
    return this.http.get<ResultModel<any>>(`${API_SUPPORT_URL}/${id}`);
  }

  replyTicket(id: number, data: { adminEmail: string; message: string }): Observable<ResultModel<any>> {
    return this.http.post<ResultModel<any>>(`${API_SUPPORT_URL}/${id}/reply`, data);
  }

  updateTicketStatus(id: number, data: { status: string }): Observable<ResultModel<any>> {
    return this.http.put<ResultModel<any>>(`${API_SUPPORT_URL}/${id}/status`, data);
  }

  exportExcel(): Observable<HttpResponse<Blob>> {
    return this.http.post(`${API_SUPPORT_URL}/Export/Excel`, null, {
      responseType: 'blob',
      observe: 'response'
    });
  }
}