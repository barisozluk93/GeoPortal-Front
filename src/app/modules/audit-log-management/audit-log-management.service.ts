import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { AuditLogModel } from './models/audit-log.model';
import { PagingResult } from 'src/app/models/paging-result.model';
import { ResultModel } from 'src/app/models/result.model';

const API_AUDIT_LOG_URL = `${environment.apiUrl}/AuditLog`;

@Injectable({
  providedIn: 'root',
})
export class AuditLogManagementService {
  constructor(private http: HttpClient) {}

  paging(
    pageNumber: number,
    pageSize: number,
    filterParams?: HttpParams,
  ): Observable<ResultModel<PagingResult<AuditLogModel[]>>> {
    let params = filterParams ?? new HttpParams();

    params = params
      .set('PageNumber', pageNumber.toString())
      .set('PageSize', pageSize.toString());

    return this.http.get<ResultModel<PagingResult<AuditLogModel[]>>>(
      `${API_AUDIT_LOG_URL}/Paginate`,
      { params },
    );
  }
}
