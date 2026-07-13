import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { ResultModel } from 'src/app/models/result.model';
import { ProductAcquisitionDateRange, ProductSmartFilterRequest, ProductSmartFilterResult } from './smart-filter/models/product-smart-filter.model';
import { LayerModel } from '../../map-management/models/layer.model';


const API_MAP_URL = `${environment.apiUrl}/Map`;
const API_PRODUCT_URL = `${environment.apiUrl}/Product`;

@Injectable({
    providedIn: 'root',
})
export class MapService {

    constructor(private http: HttpClient) { }

    smartProductFilter(request: ProductSmartFilterRequest) {
        return this.http.post<ProductSmartFilterResult[]>(
            `${API_PRODUCT_URL}/SmartFilter`,
            request
        );
    }

    getMarketAcquisitionDateRange() {
        return this.http.get<ResultModel<ProductAcquisitionDateRange>>(
            `${API_PRODUCT_URL}/GetMarketAcquisitionDateRange`
        );
    }

    allLayers(): Observable<ResultModel<LayerModel[]>> {
        return this.http.get<ResultModel<LayerModel[]>>(`${API_MAP_URL}/LayerList`);
    }


}
