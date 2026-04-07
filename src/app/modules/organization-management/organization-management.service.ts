import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { ResultModel } from 'src/app/models/result.model';
import { PagingResult } from 'src/app/models/paging-result.model';
import { OrganizationModel } from './models/organization.model';

const API_ORGANIZATION_URL = `${environment.apiUrl}/Organization`;

@Injectable({
    providedIn: 'root',
})
export class OrganizationManagementService {

    constructor(private http: HttpClient) { }

    // public methods

    paging(pageNumber: number, pageSize: number, filterParams?: HttpParams
    ): Observable<ResultModel<PagingResult<OrganizationModel[]>>> {

        let params = filterParams ?? new HttpParams();
        params = params
            .set("PageNumber", pageNumber)
            .set("PageSize", pageSize);

        return this.http.get<ResultModel<PagingResult<OrganizationModel[]>>>(`${API_ORGANIZATION_URL}/Paginate`,
            { params: params });
    }

    all(): Observable<ResultModel<OrganizationModel[]>> {
        return this.http.get<ResultModel<OrganizationModel[]>>(`${API_ORGANIZATION_URL}/All`);
    }

    getById(id: number): Observable<ResultModel<OrganizationModel>> {
        return this.http.get<ResultModel<OrganizationModel>>(`${API_ORGANIZATION_URL}/${id}`);
    }

    save(data: OrganizationModel): Observable<ResultModel<OrganizationModel>> {
        return this.http.post<ResultModel<OrganizationModel>>(`${API_ORGANIZATION_URL}/Save`, data);
    }

    edit(data: OrganizationModel): Observable<ResultModel<OrganizationModel>> {
        return this.http.post<ResultModel<OrganizationModel>>(`${API_ORGANIZATION_URL}/Update`, data);
    }

    delete(id: number): Observable<ResultModel<OrganizationModel[]>> {
        return this.http.delete<ResultModel<OrganizationModel[]>>(`${API_ORGANIZATION_URL}/Delete/${id}`);
    }

    exportExcel(): Observable<HttpResponse<Blob>> {
        return this.http.post(`${API_ORGANIZATION_URL}/Export/Excel`, null, {
            responseType: 'blob',
            observe: 'response'
        });
    }
}
