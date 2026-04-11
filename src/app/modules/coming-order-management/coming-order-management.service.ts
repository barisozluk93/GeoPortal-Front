import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { ResultModel } from 'src/app/models/result.model';
import { PagingResult } from 'src/app/models/paging-result.model';
import { OrderProductModel } from './models/orderproduct.model';
import { FileModel } from 'src/app/models/file.model';
import { OrderModel } from './models/order.model';

const API_ORDER_URL = `${environment.apiUrl}/Order`;
const API_FILE_URL = `${environment.apiUrl}/File`;

@Injectable({
    providedIn: 'root',
})
export class ComingOrderManagementService {

    constructor(private http: HttpClient) { }

    // public methods

    paging(pageNumber: number, pageSize: number, filterParams?: HttpParams
                ): Observable<ResultModel<PagingResult<OrderModel[]>>> {
            
                    let params = filterParams ?? new HttpParams();
                    params = params
                        .set("PageNumber", pageNumber)
                        .set("PageSize", pageSize);
    
            return this.http.get<ResultModel<PagingResult<OrderModel[]>>>(`${API_ORDER_URL}/ComingPaginate`, 
                { params });
        }

    getById(id: number): Observable<ResultModel<OrderModel>> {
        return this.http.get<ResultModel<OrderModel>>(`${API_ORDER_URL}/${id}`);
    }

    updateStatus(id: number, status: number): Observable<ResultModel<OrderProductModel>> {
        return this.http.get<ResultModel<OrderProductModel>>(`${API_ORDER_URL}/UpdateStatus/${id}/${status}`);
    }

    upload(data: FormData): Observable<ResultModel<FileModel>> {
        return this.http.post<ResultModel<FileModel>>(`${API_FILE_URL}/Save`, data);
    }

    addInvoice(id: number, fileId: number): Observable<ResultModel<OrderProductModel>> {
        return this.http.get<ResultModel<OrderProductModel>>(`${API_ORDER_URL}/AddInvoice/${id}/${fileId}`);
    }

    deleteInvoice(orderId: number): Observable<ResultModel<OrderModel>> {
        return this.http.delete<ResultModel<OrderModel>>(`${API_ORDER_URL}/DeleteInvoice/${orderId}`);
    }

    exportExcel(): Observable<HttpResponse<Blob>> {
        return this.http.post(`${API_ORDER_URL}/Export/Excel`, null, {
            responseType: 'blob',
            observe: 'response'
        });
    }
}
