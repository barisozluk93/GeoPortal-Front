import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { ResultModel } from 'src/app/models/result.model';
import { PagingResult } from 'src/app/models/paging-result.model';
import { ProductModel } from './models/product.model';


const API_PRODUCT_URL = `${environment.apiUrl}/Product`;

@Injectable({
    providedIn: 'root',
})
export class MarketplaceService {

    constructor(private http: HttpClient) { }

    paging(pageNumber: number, pageSize: number, filterText?: string, maxPrice?: number, maxCloudRate?: number): Observable<ResultModel<PagingResult<ProductModel[]>>> {
        return this.http.get<ResultModel<PagingResult<ProductModel[]>>>(`${API_PRODUCT_URL}/Paginate`,
            { params: new HttpParams().set("PageNumber", pageNumber).set("PageSize", pageSize).set("FilterText", filterText !== undefined ? filterText : '').set("MaxPrice", maxPrice ? maxPrice : -1).set("MaxCloudRate", maxCloudRate ? maxCloudRate : -1) });
    }


    getById(id: number): Observable<ResultModel<ProductModel>> {
        return this.http.get<ResultModel<ProductModel>>(`${API_PRODUCT_URL}/${id}`);
    }

}
