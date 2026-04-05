import { Injectable } from '@angular/core';
import {Observable } from 'rxjs';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { ResultModel } from 'src/app/models/result.model';
import { PagingResult } from 'src/app/models/paging-result.model';
import { OrderModel } from './models/order.model';
import { OrderProductModel } from './models/orderproduct.model';

const API_ORDER_URL = `${environment.apiUrl}/Order`;

@Injectable({
    providedIn: 'root',
})
export class OrderManagementService {

    constructor(private http: HttpClient) { }

    // public methods

    paging(pageNumber: number, pageSize: number, userId?: number, filterParams?: HttpParams
            ): Observable<ResultModel<PagingResult<OrderModel[]>>> {
        
                let params = filterParams ?? new HttpParams();
                params = params
                    .set("PageNumber", pageNumber)
                    .set("PageSize", pageSize);

        return this.http.get<ResultModel<PagingResult<OrderModel[]>>>(`${API_ORDER_URL}/Paginate/${userId}`, 
            { params });
    }

    save(data: OrderModel): Observable<ResultModel<OrderModel>> {
        return this.http.post<ResultModel<OrderModel>>(`${API_ORDER_URL}/Save`, data);
    }

    getById(id: number): Observable<ResultModel<OrderModel>> {
        return this.http.get<ResultModel<OrderModel>>(`${API_ORDER_URL}/${id}`);
    }
}
