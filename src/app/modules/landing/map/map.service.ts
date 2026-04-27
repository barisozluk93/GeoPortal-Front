import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { ResultModel } from 'src/app/models/result.model';
import { LayerGroupModel } from '../../map-management/models/layergroup.model';
import { ProductSmartFilterRequest, ProductSmartFilterResult } from './smart-filter/models/product-smart-filter.model';


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

    allLayers(): Observable<ResultModel<LayerGroupModel[]>> {
        return this.http.get<ResultModel<LayerGroupModel[]>>(`${API_MAP_URL}/LayerList`);
    }


}
